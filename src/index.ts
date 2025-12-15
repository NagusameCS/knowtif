#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { setupConfig, getConfig } from './lib/config';
import { watchRepository } from './lib/monitor';
import { installWorkflow } from './lib/installer';
import { runAction } from './lib/action';

const program = new Command();

program
    .name('knowtif')
    .description('CLI to monitor GitHub events and notify you')
    .version('1.0.0');

program
    .command('setup')
    .description('Configure GitHub token, notification channels, and local repo settings')
    .action(async () => {
        await setupConfig();
    });

program
    .command('install')
    .description('Install Knowtif as a GitHub Action in this repository')
    .action(async () => {
        await installWorkflow();
    });

program
    .command('action')
    .description('Run in GitHub Action mode (internal use)')
    .action(async () => {
        await runAction();
    });

// Default action (watch)
program
    .action(async (options) => {
        // If running in GitHub Actions, default to 'action' command logic if not specified?
        // But usually actions call specific commands.
        // If user runs `knowtif` locally, we assume they want to watch.

        if (process.env.GITHUB_ACTIONS) {
            console.log('Detected GitHub Actions environment. Running action logic...');
            await runAction();
            return;
        }

        // Check if configured
        const config = getConfig();
        if (!config.githubToken) {
            console.log(chalk.yellow('Knowtif is not configured. Running setup...'));
            await setupConfig();
        }

        try {
            // Pass empty options, watchRepository will pick up defaults and local config
            await watchRepository({});
        } catch (error: any) {
            console.error(chalk.red('Error:'), error.message);
            process.exit(1);
        }
    });

// Keep the explicit watch command for advanced usage (overriding defaults)
program
    .command('watch')
    .description('Watch the current repository (explicit command)')
    .option('-r, --repo <repo>', 'Repository in format owner/name (defaults to current git repo)')
    .option('-b, --branch <branch>', 'Branch to watch (defaults to current git branch)')
    .option('-u, --url <url>', 'Health check URL to monitor after deployment')
    .action(async (options) => {
        try {
            await watchRepository(options);
        } catch (error: any) {
            console.error(chalk.red('Error:'), error.message);
            process.exit(1);
        }
    });

program.parse();
