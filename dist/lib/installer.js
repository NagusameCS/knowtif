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
exports.installWorkflow = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const crypto_1 = __importDefault(require("crypto"));
const getRepoInfo = () => {
    try {
        const repoUrl = (0, child_process_1.execSync)('git config --get remote.origin.url').toString().trim();
        const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
        if (match) {
            return { owner: match[1], repo: match[2] };
        }
    }
    catch { }
    return { owner: 'unknown', repo: 'unknown' };
};
const generateTopicName = (owner, repo) => {
    const hash = crypto_1.default.createHash('sha256').update(`${owner}/${repo}`).digest('hex').substring(0, 8);
    return `knowtif-${repo}-${hash}`;
};
const installWorkflow = async () => {
    console.log(chalk_1.default.blue.bold('\nKnowtif - GitHub Notification System\n'));
    console.log(chalk_1.default.gray('This will set up automatic notifications for your repository events.'));
    console.log(chalk_1.default.gray('No server required - runs entirely on GitHub Actions!\n'));
    // Check if we're in a git repo
    try {
        (0, child_process_1.execSync)('git rev-parse --git-dir', { stdio: 'ignore' });
    }
    catch {
        console.error(chalk_1.default.red('Error: Not a git repository. Please run this in a git repository.'));
        process.exit(1);
    }
    const repoInfo = getRepoInfo();
    const defaultTopic = generateTopicName(repoInfo.owner, repoInfo.repo);
    const { mode } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'Setup mode:',
            choices: [
                { name: 'Quick (ntfy.sh - free, no config needed, works immediately)', value: 'quick' },
                { name: 'Custom (choose events and channels)', value: 'custom' },
            ],
        },
    ]);
    let events = ['push', 'workflow_run', 'deployment_status', 'release'];
    let channels = ['ntfy'];
    let ntfyTopic = defaultTopic;
    let ntfyServer = 'https://ntfy.sh';
    let healthCheckUrl = '';
    let branches = 'main, master';
    let discordWebhook = '';
    let pushoverUser = '';
    let pushoverToken = '';
    if (mode === 'custom') {
        const answers = await inquirer_1.default.prompt([
            {
                type: 'checkbox',
                name: 'events',
                message: 'Which events do you want to be notified about?',
                choices: [
                    { name: 'Push received', value: 'push', checked: true },
                    { name: 'CI/Workflow completed', value: 'workflow_run', checked: true },
                    { name: 'Deployment status', value: 'deployment_status', checked: true },
                    { name: 'Pull requests (opened, merged)', value: 'pull_request', checked: true },
                    { name: 'PR reviews (approved, changes requested)', value: 'pull_request_review', checked: false },
                    { name: 'Issues (opened, closed)', value: 'issues', checked: false },
                    { name: 'Releases published', value: 'release', checked: true },
                    { name: 'New stars', value: 'star', checked: false },
                    { name: 'Forks', value: 'fork', checked: false },
                    { name: 'Check runs (failures only)', value: 'check_run', checked: false },
                ],
            },
            {
                type: 'checkbox',
                name: 'channels',
                message: 'How do you want to be notified?',
                choices: [
                    { name: 'ntfy.sh (free push - works immediately, great for browsers!)', value: 'ntfy', checked: true },
                    { name: 'Discord (webhook URL embedded in workflow)', value: 'discord', checked: false },
                    { name: 'Phone (Pushover app - credentials in workflow)', value: 'pushover', checked: false },
                ],
                validate: (input) => input.length > 0 || 'Select at least one notification channel',
            },
            {
                type: 'input',
                name: 'healthCheckUrl',
                message: 'Health check URL after deployment (leave empty to skip):',
            },
            {
                type: 'input',
                name: 'branches',
                message: 'Which branches to monitor (comma-separated)?',
                default: 'main, master',
            },
        ]);
        events = answers.events;
        channels = answers.channels;
        healthCheckUrl = answers.healthCheckUrl;
        branches = answers.branches;
        if (channels.includes('ntfy')) {
            const ntfyAnswers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'topic',
                    message: 'ntfy topic name (unique identifier for your notifications):',
                    default: defaultTopic,
                },
                {
                    type: 'input',
                    name: 'server',
                    message: 'ntfy server (leave empty for default ntfy.sh):',
                    default: 'https://ntfy.sh',
                },
            ]);
            ntfyTopic = ntfyAnswers.topic;
            ntfyServer = ntfyAnswers.server;
        }
        if (channels.includes('discord')) {
            const discordAnswers = await inquirer_1.default.prompt([
                {
                    type: 'password',
                    name: 'webhook',
                    message: 'Discord Webhook URL:',
                    mask: '*',
                },
            ]);
            discordWebhook = discordAnswers.webhook;
        }
        if (channels.includes('pushover')) {
            const pushoverAnswers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'user',
                    message: 'Pushover User Key:',
                },
                {
                    type: 'password',
                    name: 'token',
                    message: 'Pushover API Token:',
                    mask: '*',
                },
            ]);
            pushoverUser = pushoverAnswers.user;
            pushoverToken = pushoverAnswers.token;
        }
    }
    // Build event triggers
    const eventTriggers = buildEventTriggers(events, branches);
    // Build env block with embedded values (no secrets needed!)
    const envLines = [
        `          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`,
    ];
    if (channels.includes('ntfy')) {
        envLines.push(`          NTFY_TOPIC: "${ntfyTopic}"`);
        envLines.push(`          NTFY_SERVER: "${ntfyServer}"`);
    }
    if (channels.includes('discord') && discordWebhook) {
        envLines.push(`          DISCORD_WEBHOOK: "${discordWebhook}"`);
    }
    if (channels.includes('pushover') && pushoverUser && pushoverToken) {
        envLines.push(`          PUSHOVER_USER: "${pushoverUser}"`);
        envLines.push(`          PUSHOVER_TOKEN: "${pushoverToken}"`);
    }
    if (healthCheckUrl) {
        envLines.push(`          HEALTH_CHECK_URL: "${healthCheckUrl}"`);
    }
    const workflowContent = `# Knowtif - Automatic GitHub Notifications
# Generated by: npx knowtif install
# Docs: https://github.com/NagusameCS/knowtif

name: Knowtif Monitor

on:
${eventTriggers}

jobs:
  notify:
    runs-on: ubuntu-latest
    # Prevent infinite loops from our own workflow
    if: \${{ github.event.workflow_run.name != 'Knowtif Monitor' || github.event_name != 'workflow_run' }}
    steps:
      - name: Run Knowtif Notification
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Send Notifications
        run: npx knowtif@latest action
        env:
${envLines.join('\n')}
`;
    const workflowDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(workflowDir)) {
        fs.mkdirSync(workflowDir, { recursive: true });
    }
    const workflowPath = path.join(workflowDir, 'knowtif.yml');
    fs.writeFileSync(workflowPath, workflowContent);
    console.log(chalk_1.default.green(`\n[OK] Generated ${workflowPath}\n`));
    // Print subscription instructions
    if (channels.includes('ntfy')) {
        console.log(chalk_1.default.cyan.bold('Subscribe to notifications:'));
        console.log(chalk_1.default.white(`  Browser: ${ntfyServer}/${ntfyTopic}`));
        console.log(chalk_1.default.white(`  Phone:   Install ntfy app, subscribe to "${ntfyTopic}"`));
        console.log(chalk_1.default.white(`  CLI:     curl -s ${ntfyServer}/${ntfyTopic}/json\n`));
    }
    console.log(chalk_1.default.green.bold('[Done] Setup Complete!\n'));
    console.log(chalk_1.default.white('Next steps:'));
    console.log(chalk_1.default.gray('  1. Commit and push the workflow file:'));
    console.log(chalk_1.default.cyan('     git add .github/workflows/knowtif.yml'));
    console.log(chalk_1.default.cyan('     git commit -m "Add Knowtif notifications"'));
    console.log(chalk_1.default.cyan('     git push'));
    console.log(chalk_1.default.gray('  2. That\'s it! You\'ll receive notifications on your next push.\n'));
};
exports.installWorkflow = installWorkflow;
const buildEventTriggers = (events, branches) => {
    const branchList = branches.split(',').map(b => b.trim()).filter(b => b);
    const branchArray = branchList.map(b => `"${b}"`).join(', ');
    let triggers = '';
    if (events.includes('push')) {
        triggers += `  push:
    branches: [ ${branchArray} ]
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
    types: [opened, closed]
`;
    }
    if (events.includes('pull_request_review')) {
        triggers += `  pull_request_review:
    types: [submitted]
`;
    }
    if (events.includes('issues')) {
        triggers += `  issues:
    types: [opened, closed]
`;
    }
    if (events.includes('release')) {
        triggers += `  release:
    types: [published]
`;
    }
    if (events.includes('star')) {
        triggers += `  star:
    types: [created]
`;
    }
    if (events.includes('fork')) {
        triggers += `  fork:
`;
    }
    if (events.includes('check_run')) {
        triggers += `  check_run:
    types: [completed]
`;
    }
    return triggers;
};
