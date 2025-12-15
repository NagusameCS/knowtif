#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { runSetup, runControlPanel, runTest } from './lib/panel';
import { runAction } from './lib/action';
import { getConfig } from './lib/config';

const program = new Command();

program
    .name('knowtif')
    .description('GitHub notifications to Discord, Phone, Browser, and more')
    .version('1.0.0');

// Default command - Control Panel
program
    .action(async () => {
        if (process.env.GITHUB_ACTIONS) {
            await runAction();
            return;
        }
        await runControlPanel();
    });

// Setup - First time configuration
program
    .command('setup')
    .alias('install')
    .description('Configure Knowtif from scratch')
    .action(async () => {
        await runSetup();
    });

// Test - Send a test notification
program
    .command('test')
    .description('Send a test notification')
    .action(async () => {
        await runTest();
    });

// Action - GitHub Actions internal command
program
    .command('action')
    .description('(internal) Run in GitHub Actions')
    .action(async () => {
        await runAction();
    });

// Status - Quick view of config
program
    .command('status')
    .description('Show current configuration')
    .action(async () => {
        const config = getConfig();
        console.log(chalk.blue.bold('\n  Knowtif Status\n'));

        if (!config.installed) {
            console.log(chalk.yellow('  Not configured. Run: knowtif setup\n'));
            return;
        }

        console.log(chalk.white('  Events:'));
        config.events.forEach(e => console.log(chalk.gray(`    - ${e}`)));

        console.log(chalk.white('\n  Destinations:'));
        if (config.discord?.enabled) console.log(chalk.green('    - Discord'));
        if (config.pushover?.enabled) console.log(chalk.green('    - Pushover'));
        if (config.ntfy?.enabled) console.log(chalk.green(`    - ntfy.sh (${config.ntfy.topic})`));
        if (config.email?.enabled) console.log(chalk.green(`    - Email (${config.email.to})`));
        if (config.webhook?.enabled) console.log(chalk.green('    - Webhook'));

        console.log('');
    });

program.parse();
