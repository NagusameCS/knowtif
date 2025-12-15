#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const panel_1 = require("./lib/panel");
const action_1 = require("./lib/action");
const config_1 = require("./lib/config");
const program = new commander_1.Command();
program
    .name('knowtif')
    .description('GitHub notifications to Discord, Phone, Browser, and more')
    .version('1.0.0');
// Default command - Control Panel
program
    .action(async () => {
    if (process.env.GITHUB_ACTIONS) {
        await (0, action_1.runAction)();
        return;
    }
    await (0, panel_1.runControlPanel)();
});
// Setup - First time configuration
program
    .command('setup')
    .alias('install')
    .description('Configure Knowtif from scratch')
    .action(async () => {
    await (0, panel_1.runSetup)();
});
// Test - Send a test notification
program
    .command('test')
    .description('Send a test notification')
    .action(async () => {
    await (0, panel_1.runTest)();
});
// Action - GitHub Actions internal command
program
    .command('action')
    .description('(internal) Run in GitHub Actions')
    .action(async () => {
    await (0, action_1.runAction)();
});
// Status - Quick view of config
program
    .command('status')
    .description('Show current configuration')
    .action(async () => {
    const config = (0, config_1.getConfig)();
    console.log(chalk_1.default.blue.bold('\n  Knowtif Status\n'));
    if (!config.installed) {
        console.log(chalk_1.default.yellow('  Not configured. Run: knowtif setup\n'));
        return;
    }
    console.log(chalk_1.default.white('  Events:'));
    config.events.forEach(e => console.log(chalk_1.default.gray(`    - ${e}`)));
    console.log(chalk_1.default.white('\n  Destinations:'));
    if (config.discord?.enabled)
        console.log(chalk_1.default.green('    - Discord'));
    if (config.pushover?.enabled)
        console.log(chalk_1.default.green('    - Pushover'));
    if (config.ntfy?.enabled)
        console.log(chalk_1.default.green(`    - ntfy.sh (${config.ntfy.topic})`));
    if (config.email?.enabled)
        console.log(chalk_1.default.green(`    - Email (${config.email.to})`));
    if (config.webhook?.enabled)
        console.log(chalk_1.default.green('    - Webhook'));
    console.log('');
});
program.parse();
