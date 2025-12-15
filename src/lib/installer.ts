import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import crypto from 'crypto';
import axios from 'axios';

const getRepoInfo = () => {
    try {
        const repoUrl = execSync('git config --get remote.origin.url').toString().trim();
        const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
        if (match) {
            return { owner: match[1], repo: match[2] };
        }
    } catch { }
    return null;
};

const generateTopicName = (owner: string, repo: string) => {
    const hash = crypto.createHash('sha256').update(`${owner}/${repo}`).digest('hex').substring(0, 8);
    return `knowtif-${repo}-${hash}`;
};

const testDiscordWebhook = async (url: string): Promise<boolean> => {
    try {
        await axios.post(url, {
            embeds: [{
                title: 'Knowtif Connected!',
                description: 'Your Discord notifications are set up. You will receive notifications here when GitHub events occur.',
                color: 5763719,
                timestamp: new Date().toISOString(),
                footer: { text: 'Knowtif' },
            }]
        });
        return true;
    } catch {
        return false;
    }
};

const testPushover = async (user: string, token: string): Promise<boolean> => {
    try {
        await axios.post('https://api.pushover.net/1/messages.json', {
            token,
            user,
            title: 'Knowtif Connected!',
            message: 'Your phone notifications are set up.',
            sound: 'magic',
        });
        return true;
    } catch {
        return false;
    }
};

const testNtfy = async (topic: string, server: string): Promise<boolean> => {
    try {
        await axios.post(`${server}/${topic}`, 'Knowtif Connected! Your notifications are set up.', {
            headers: { 'Title': 'Knowtif Test', 'Priority': '3', 'Tags': 'white_check_mark' },
        });
        return true;
    } catch {
        return false;
    }
};

export const installWorkflow = async () => {
    console.log(chalk.blue.bold('\n  Knowtif Setup\n'));

    // Check if we're in a git repo
    const repoInfo = getRepoInfo();
    if (!repoInfo) {
        console.error(chalk.red('  Not a GitHub repository. Run this in a git repo with a GitHub remote.'));
        process.exit(1);
    }

    console.log(chalk.gray(`  Repository: ${repoInfo.owner}/${repoInfo.repo}\n`));

    // Step 1: Choose notification channel
    const { channel } = await inquirer.prompt([
        {
            type: 'list',
            name: 'channel',
            message: 'Where do you want notifications?',
            choices: [
                { name: 'Discord (paste webhook URL)', value: 'discord' },
                { name: 'Phone (Pushover app)', value: 'pushover' },
                { name: 'Browser/ntfy.sh (free, instant)', value: 'ntfy' },
                { name: 'All of the above', value: 'all' },
            ],
        },
    ]);

    const channels: string[] = channel === 'all' ? ['discord', 'pushover', 'ntfy'] : [channel];
    const config: Record<string, string> = {};

    // Step 2: Collect credentials with validation
    if (channels.includes('discord')) {
        console.log(chalk.cyan('\n  Discord Setup'));
        console.log(chalk.gray('  Get webhook: Server Settings > Integrations > Webhooks > New Webhook > Copy URL\n'));

        const { webhook } = await inquirer.prompt([
            {
                type: 'input',
                name: 'webhook',
                message: 'Paste Discord Webhook URL:',
                validate: (input: string) => {
                    if (!input.startsWith('https://discord.com/api/webhooks/') && 
                        !input.startsWith('https://discordapp.com/api/webhooks/')) {
                        return 'Invalid webhook URL. Should start with https://discord.com/api/webhooks/';
                    }
                    return true;
                },
            },
        ]);

        console.log(chalk.gray('  Testing webhook...'));
        if (await testDiscordWebhook(webhook)) {
            console.log(chalk.green('  Discord connected! Check your channel for a test message.\n'));
            config.DISCORD_WEBHOOK = webhook;
        } else {
            console.log(chalk.red('  Failed to send test. Check your webhook URL.\n'));
            const { cont } = await inquirer.prompt([{ type: 'confirm', name: 'cont', message: 'Continue anyway?', default: false }]);
            if (cont) config.DISCORD_WEBHOOK = webhook;
        }
    }

    if (channels.includes('pushover')) {
        console.log(chalk.cyan('\n  Pushover Setup'));
        console.log(chalk.gray('  1. Install Pushover app on your phone'));
        console.log(chalk.gray('  2. Get your User Key from https://pushover.net'));
        console.log(chalk.gray('  3. Create an app and get the API Token\n'));

        const pushoverAnswers = await inquirer.prompt([
            { type: 'input', name: 'user', message: 'Pushover User Key:' },
            { type: 'input', name: 'token', message: 'Pushover API Token:' },
        ]);

        if (pushoverAnswers.user && pushoverAnswers.token) {
            console.log(chalk.gray('  Testing Pushover...'));
            if (await testPushover(pushoverAnswers.user, pushoverAnswers.token)) {
                console.log(chalk.green('  Pushover connected! Check your phone.\n'));
                config.PUSHOVER_USER = pushoverAnswers.user;
                config.PUSHOVER_TOKEN = pushoverAnswers.token;
            } else {
                console.log(chalk.red('  Failed to send test. Check your credentials.\n'));
            }
        }
    }

    if (channels.includes('ntfy')) {
        const defaultTopic = generateTopicName(repoInfo.owner, repoInfo.repo);
        console.log(chalk.cyan('\n  ntfy.sh Setup (free push notifications)'));
        console.log(chalk.gray('  Subscribe at: https://ntfy.sh/' + defaultTopic + '\n'));

        const { topic } = await inquirer.prompt([
            {
                type: 'input',
                name: 'topic',
                message: 'Topic name (or press Enter for auto):',
                default: defaultTopic,
            },
        ]);

        const server = 'https://ntfy.sh';
        console.log(chalk.gray('  Testing ntfy...'));
        if (await testNtfy(topic, server)) {
            console.log(chalk.green('  ntfy connected!\n'));
            config.NTFY_TOPIC = topic;
            config.NTFY_SERVER = server;
        } else {
            console.log(chalk.yellow('  Could not verify, but continuing...\n'));
            config.NTFY_TOPIC = topic;
            config.NTFY_SERVER = server;
        }
    }

    // Step 3: Choose events (simplified)
    const { eventSet } = await inquirer.prompt([
        {
            type: 'list',
            name: 'eventSet',
            message: 'What should trigger notifications?',
            choices: [
                { name: 'Everything (push, CI, deploy, releases, PRs)', value: 'all' },
                { name: 'Just pushes and CI results', value: 'basic' },
                { name: 'Only failures', value: 'failures' },
            ],
        },
    ]);

    let events: string[];
    switch (eventSet) {
        case 'all':
            events = ['push', 'workflow_run', 'deployment_status', 'release', 'pull_request'];
            break;
        case 'failures':
            events = ['workflow_run', 'check_run'];
            break;
        default:
            events = ['push', 'workflow_run'];
    }

    // Step 4: Generate workflow
    const eventTriggers = buildEventTriggers(events);
    const envLines = Object.entries(config)
        .map(([key, val]) => `          ${key}: "${val}"`)
        .join('\n');

    const workflowContent = `# Knowtif - GitHub Notifications
# Generated by: npx knowtif install

name: Knowtif

on:
${eventTriggers}

jobs:
  notify:
    runs-on: ubuntu-latest
    if: \${{ github.event.workflow_run.name != 'Knowtif' || github.event_name != 'workflow_run' }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx knowtif@latest action
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
${envLines}
`;

    const workflowDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(workflowDir)) {
        fs.mkdirSync(workflowDir, { recursive: true });
    }

    const workflowPath = path.join(workflowDir, 'knowtif.yml');
    fs.writeFileSync(workflowPath, workflowContent);

    // Step 5: Done!
    console.log(chalk.green.bold('\n  Setup complete!\n'));
    console.log(chalk.white('  Next: commit and push to activate\n'));
    console.log(chalk.cyan('    git add .github/workflows/knowtif.yml'));
    console.log(chalk.cyan('    git commit -m "Add notifications"'));
    console.log(chalk.cyan('    git push\n'));

    if (config.NTFY_TOPIC) {
        console.log(chalk.gray(`  Subscribe to ntfy: https://ntfy.sh/${config.NTFY_TOPIC}\n`));
    }
};

const buildEventTriggers = (events: string[]): string => {
    let triggers = '';

    if (events.includes('push')) {
        triggers += `  push:
    branches: [ "main", "master" ]
`;
    }

    if (events.includes('workflow_run')) {
        triggers += `  workflow_run:
    workflows: ["*"]
    types: [completed]
`;
    }

    if (events.includes('deployment_status')) {
        triggers += `  deployment_status:
`;
    }

    if (events.includes('pull_request')) {
        triggers += `  pull_request:
    types: [opened, closed, merged]
`;
    }

    if (events.includes('release')) {
        triggers += `  release:
    types: [published]
`;
    }

    if (events.includes('check_run')) {
        triggers += `  check_run:
    types: [completed]
`;
    }

    return triggers;
};
