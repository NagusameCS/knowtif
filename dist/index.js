#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./lib/config");
const monitor_1 = require("./lib/monitor");
const installer_1 = require("./lib/installer");
const action_1 = require("./lib/action");
const program = new commander_1.Command();
program
    .name('knowtif')
    .description('CLI to monitor GitHub events and notify you')
    .version('1.0.0');
program
    .command('setup')
    .description('Configure GitHub token, notification channels, and local repo settings')
    .action(async () => {
    await (0, config_1.setupConfig)();
});
program
    .command('install')
    .description('Install Knowtif as a GitHub Action in this repository')
    .action(async () => {
    await (0, installer_1.installWorkflow)();
});
program
    .command('action')
    .description('Run in GitHub Action mode (internal use)')
    .action(async () => {
    await (0, action_1.runAction)();
});
program
    .command('test')
    .description('Send a test notification to verify your setup')
    .action(async () => {
    const { testNotifications } = await Promise.resolve().then(() => __importStar(require('./lib/test')));
    await testNotifications();
});
// Default action (watch)
program
    .action(async (options) => {
    // If running in GitHub Actions, default to 'action' command logic if not specified?
    // But usually actions call specific commands.
    // If user runs `knowtif` locally, we assume they want to watch.
    if (process.env.GITHUB_ACTIONS) {
        console.log('Detected GitHub Actions environment. Running action logic...');
        await (0, action_1.runAction)();
        return;
    }
    // Check if configured
    const config = (0, config_1.getConfig)();
    if (!config.githubToken) {
        console.log(chalk_1.default.yellow('Knowtif is not configured. Running setup...'));
        await (0, config_1.setupConfig)();
    }
    try {
        // Pass empty options, watchRepository will pick up defaults and local config
        await (0, monitor_1.watchRepository)({});
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
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
        await (0, monitor_1.watchRepository)(options);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
program.parse();
