import { Octokit } from 'octokit';
import { getConfig } from './config';
import { sendNotification, NotificationType } from './notify';
import { execSync } from 'child_process';
import chalk from 'chalk';
import axios from 'axios';

interface WatchOptions {
    repo?: string;
    branch?: string;
    url?: string;
}

const getGitInfo = () => {
    try {
        const repoUrl = execSync('git config --get remote.origin.url').toString().trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

        // Extract owner/repo from URL (supports https and ssh)
        // git@github.com:owner/repo.git or https://github.com/owner/repo.git
        const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
        if (!match) throw new Error('Could not parse GitHub repo from git config');

        return {
            owner: match[1],
            repo: match[2],
            branch
        };
    } catch (e) {
        throw new Error('Not a git repository or no remote origin found. Please specify --repo and --branch.');
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const watchRepository = async (options: WatchOptions) => {
    const config = getConfig();
    if (!config.githubToken) {
        throw new Error('GitHub token not configured. Run "knowtif setup" first.');
    }

    const octokit = new Octokit({ auth: config.githubToken });

    let owner, repo, branch;

    if (options.repo) {
        [owner, repo] = options.repo.split('/');
        branch = options.branch || 'main';
    } else {
        const gitInfo = getGitInfo();
        owner = gitInfo.owner;
        repo = gitInfo.repo;
        branch = options.branch || gitInfo.branch;
    }

    // Use URL from options or local config
    const healthCheckUrl = options.url || config.healthCheckUrl;

    console.log(chalk.cyan(`Watching ${owner}/${repo} on branch ${branch}...`));

    // 1. Get the latest local commit (if running in a git repo) or just watch the latest remote commit?
    // The user said "when your changes have fully propagated". This implies we pushed something.
    // So we should look for the HEAD commit of the local branch and wait for it to appear on remote.

    let targetSha: string;
    try {
        targetSha = execSync('git rev-parse HEAD').toString().trim();
        console.log(chalk.gray(`Local HEAD is ${targetSha}`));
    } catch (e) {
        // If not in a git repo, we might just want to watch the latest remote commit?
        // But the use case is "my changes".
        // Let's assume we are in the repo or the user provides the SHA (feature for later).
        // For now, if we can't get local SHA, we fetch the latest from remote and watch that.
        const { data: ref } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
        });
        targetSha = ref.object.sha;
        console.log(chalk.gray(`Watching latest remote commit ${targetSha}`));
    }

    // 2. Wait for Push Received (Commit available on API)
    let commitAvailable = false;
    while (!commitAvailable) {
        try {
            await octokit.rest.repos.getCommit({ owner, repo, ref: targetSha });
            commitAvailable = true;
            await sendNotification('Push Received', `Commit ${targetSha.substring(0, 7)} is now available on GitHub.`, NotificationType.SUCCESS);
        } catch (e) {
            await sendNotification('Waiting for Push', `Waiting for commit ${targetSha.substring(0, 7)} to appear on GitHub...`);
            await sleep(5000);
        }
    }

    // 3. Monitor CI (Check Suites)
    let ciFinished = false;
    while (!ciFinished) {
        const { data: checkSuites } = await octokit.rest.checks.listSuitesForRef({
            owner,
            repo,
            ref: targetSha,
        });

        if (checkSuites.total_count === 0) {
            // Maybe checks haven't started yet?
            await sendNotification('CI Status', 'No check suites found yet. Waiting...', NotificationType.INFO);
            await sleep(10000);
            continue;
        }

        const inProgress = checkSuites.check_suites.some(suite => suite.status !== 'completed');

        if (!inProgress) {
            const failed = checkSuites.check_suites.some(suite => suite.conclusion === 'failure' || suite.conclusion === 'timed_out');
            if (failed) {
                await sendNotification('CI Failed', `CI checks failed for ${targetSha.substring(0, 7)}.`, NotificationType.FAILURE);
            } else {
                await sendNotification('CI Passed', `All CI checks passed for ${targetSha.substring(0, 7)}.`, NotificationType.SUCCESS);
            }
            ciFinished = true;
        } else {
            await sendNotification('CI Running', 'CI checks are still in progress...', NotificationType.INFO);
            await sleep(15000);
        }
    }

    // 4. Monitor Deployments (Optional)
    // We check if there are any deployments created for this SHA.
    // This is tricky because deployments might be created LATER.
    // We'll check for a short period if a deployment is created, or if the user asked for it.
    // For now, let's just check if one exists.

    console.log(chalk.cyan('Checking for deployments...'));
    // Give it a moment for deployment to be created after CI
    await sleep(5000);

    const { data: deployments } = await octokit.rest.repos.listDeployments({
        owner,
        repo,
        sha: targetSha,
    });

    if (deployments.length > 0) {
        const deployment = deployments[0]; // Most recent
        let deploymentFinished = false;

        while (!deploymentFinished) {
            const { data: statuses } = await octokit.rest.repos.listDeploymentStatuses({
                owner,
                repo,
                deployment_id: deployment.id,
            });

            if (statuses.length > 0) {
                const latestStatus = statuses[0];
                if (latestStatus.state === 'success') {
                    await sendNotification('Deployment Successful', `Deployed to ${latestStatus.environment_url || 'environment'}.`, NotificationType.SUCCESS);
                    deploymentFinished = true;
                } else if (latestStatus.state === 'failure' || latestStatus.state === 'error') {
                    await sendNotification('Deployment Failed', `Deployment failed.`, NotificationType.FAILURE);
                    deploymentFinished = true;
                } else {
                    await sendNotification('Deployment In Progress', `Deployment state: ${latestStatus.state}`, NotificationType.INFO);
                    await sleep(10000);
                }
            } else {
                await sleep(5000);
            }
        }
    } else {
        console.log(chalk.gray('No deployments found for this commit.'));
    }

    // 5. Health Check (Optional)
    if (healthCheckUrl) {
        console.log(chalk.cyan(`Checking health of ${healthCheckUrl}...`));
        let healthy = false;
        let attempts = 0;
        const maxAttempts = 12; // Try for 1 minute (5s interval)

        while (!healthy && attempts < maxAttempts) {
            try {
                const response = await axios.get(healthCheckUrl);
                if (response.status >= 200 && response.status < 300) {
                    await sendNotification('Health Check Passed', `App is reachable at ${healthCheckUrl}`, NotificationType.SUCCESS);
                    healthy = true;
                } else {
                    throw new Error(`Status ${response.status}`);
                }
            } catch (e: any) {
                attempts++;
                if (attempts === maxAttempts) {
                    await sendNotification('Health Check Failed', `App is not reachable at ${healthCheckUrl}. Error: ${e.message}`, NotificationType.FAILURE);
                } else {
                    await sleep(5000);
                }
            }
        }
    }

    console.log(chalk.green('Monitoring complete.'));
};
