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
exports.runTest = exports.runControlPanel = exports.runSetup = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const config_1 = require("./config");
const workflow_1 = require("./workflow");
const notify_1 = require("./notify");
// ============ HELPERS ============
const getRepoInfo = () => {
    try {
        const repoUrl = (0, child_process_1.execSync)('git config --get remote.origin.url').toString().trim();
        const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
        if (match)
            return { owner: match[1], repo: match[2] };
    }
    catch { }
    return null;
};
const generateTopic = (owner, repo) => {
    const hash = crypto_1.default.createHash('sha256').update(`${owner}/${repo}`).digest('hex').substring(0, 8);
    return `knowtif-${repo}-${hash}`;
};
// ============ TESTERS ============
const testDiscord = async (webhook) => {
    try {
        await axios_1.default.post(webhook, {
            embeds: [{ title: 'Knowtif Connected!', description: 'Discord notifications are ready.', color: 5763719 }]
        });
        return true;
    }
    catch {
        return false;
    }
};
const testPushover = async (user, token) => {
    try {
        await axios_1.default.post('https://api.pushover.net/1/messages.json', {
            token, user, title: 'Knowtif Connected!', message: 'Phone notifications are ready.', sound: 'magic'
        });
        return true;
    }
    catch {
        return false;
    }
};
const testNtfy = async (topic, server) => {
    try {
        await axios_1.default.post(`${server}/${topic}`, 'Knowtif Connected!', {
            headers: { 'Title': 'Test', 'Tags': 'white_check_mark' }
        });
        return true;
    }
    catch {
        return false;
    }
};
// ============ SETUP FLOWS ============
const setupDiscord = async () => {
    console.log(chalk_1.default.cyan('\n  Discord Setup'));
    console.log(chalk_1.default.gray('  Server Settings > Integrations > Webhooks > New Webhook > Copy URL\n'));
    const { webhook } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'webhook',
            message: 'Webhook URL:',
            validate: (v) => v.includes('discord.com/api/webhooks/') || 'Invalid Discord webhook URL',
        }]);
    console.log(chalk_1.default.gray('  Testing...'));
    if (await testDiscord(webhook)) {
        console.log(chalk_1.default.green('  Connected! Check your Discord.\n'));
        return { webhook, enabled: true };
    }
    else {
        console.log(chalk_1.default.red('  Failed. Check your URL.\n'));
        return undefined;
    }
};
const setupPushover = async () => {
    console.log(chalk_1.default.cyan('\n  Pushover Setup'));
    console.log(chalk_1.default.gray('  Get credentials from https://pushover.net\n'));
    const { user, token } = await inquirer_1.default.prompt([
        { type: 'input', name: 'user', message: 'User Key:' },
        { type: 'input', name: 'token', message: 'API Token:' },
    ]);
    if (!user || !token)
        return undefined;
    console.log(chalk_1.default.gray('  Testing...'));
    if (await testPushover(user, token)) {
        console.log(chalk_1.default.green('  Connected! Check your phone.\n'));
        return { user, token, enabled: true };
    }
    else {
        console.log(chalk_1.default.red('  Failed. Check your credentials.\n'));
        return undefined;
    }
};
const setupNtfy = async (defaultTopic) => {
    console.log(chalk_1.default.cyan('\n  ntfy.sh Setup (free push notifications)'));
    console.log(chalk_1.default.gray(`  Subscribe at: https://ntfy.sh/${defaultTopic}\n`));
    const { topic } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'topic',
            message: 'Topic:',
            default: defaultTopic,
        }]);
    const server = 'https://ntfy.sh';
    console.log(chalk_1.default.gray('  Testing...'));
    if (await testNtfy(topic, server)) {
        console.log(chalk_1.default.green('  Connected!\n'));
    }
    return { topic, server, enabled: true };
};
const setupEmail = async () => {
    console.log(chalk_1.default.cyan('\n  Email Setup'));
    console.log(chalk_1.default.gray('  Use Gmail: smtp.gmail.com, port 587, App Password\n'));
    const answers = await inquirer_1.default.prompt([
        { type: 'input', name: 'host', message: 'SMTP Host:', default: 'smtp.gmail.com' },
        { type: 'number', name: 'port', message: 'SMTP Port:', default: 587 },
        { type: 'input', name: 'user', message: 'Username/Email:' },
        { type: 'password', name: 'pass', message: 'Password:', mask: '*' },
        { type: 'input', name: 'to', message: 'Send to email:' },
    ]);
    if (!answers.host || !answers.user || !answers.pass || !answers.to)
        return undefined;
    return { ...answers, enabled: true };
};
const setupWebhook = async () => {
    console.log(chalk_1.default.cyan('\n  Custom Webhook Setup'));
    console.log(chalk_1.default.gray('  JSON payload sent on each event\n'));
    const { url, secret } = await inquirer_1.default.prompt([
        { type: 'input', name: 'url', message: 'Webhook URL:' },
        { type: 'input', name: 'secret', message: 'HMAC Secret (optional):' },
    ]);
    if (!url)
        return undefined;
    return { url, secret: secret || undefined, enabled: true };
};
// ============ MAIN FLOWS ============
const runSetup = async () => {
    console.log(chalk_1.default.blue.bold('\n  Knowtif Setup\n'));
    const repoInfo = getRepoInfo();
    if (!repoInfo) {
        console.log(chalk_1.default.red('  Not a GitHub repo. Run in a git repository.\n'));
        return;
    }
    console.log(chalk_1.default.gray(`  Repository: ${repoInfo.owner}/${repoInfo.repo}\n`));
    const defaultTopic = generateTopic(repoInfo.owner, repoInfo.repo);
    // Step 1: Events
    const { events } = await inquirer_1.default.prompt([{
            type: 'checkbox',
            name: 'events',
            message: 'What triggers notifications?',
            choices: [
                { name: 'Push (code pushed)', value: 'push', checked: true },
                { name: 'CI (workflow completed)', value: 'workflow_run', checked: true },
                { name: 'Deploy (deployment status)', value: 'deployment_status', checked: true },
                { name: 'Release (new version)', value: 'release', checked: true },
                { name: 'PR (opened/merged)', value: 'pull_request', checked: false },
                { name: 'Issues (opened/closed)', value: 'issues', checked: false },
                { name: 'Stars', value: 'star', checked: false },
            ],
            validate: (v) => v.length > 0 || 'Select at least one',
        }]);
    // Step 2: Destinations
    const { destinations } = await inquirer_1.default.prompt([{
            type: 'checkbox',
            name: 'destinations',
            message: 'Where to send notifications?',
            choices: [
                { name: 'Discord', value: 'discord' },
                { name: 'Phone (Pushover)', value: 'pushover' },
                { name: 'Browser/ntfy.sh', value: 'ntfy' },
                { name: 'Email', value: 'email' },
                { name: 'Custom Webhook', value: 'webhook' },
            ],
            validate: (v) => v.length > 0 || 'Select at least one',
        }]);
    // Step 3: Configure each destination
    const config = {
        events,
        branches: ['main', 'master'],
        repoOwner: repoInfo.owner,
        repoName: repoInfo.repo,
    };
    for (const dest of destinations) {
        switch (dest) {
            case 'discord':
                config.discord = await setupDiscord();
                break;
            case 'pushover':
                config.pushover = await setupPushover();
                break;
            case 'ntfy':
                config.ntfy = await setupNtfy(defaultTopic);
                break;
            case 'email':
                config.email = await setupEmail();
                break;
            case 'webhook':
                config.webhook = await setupWebhook();
                break;
        }
    }
    // Save and generate workflow
    config.installed = true;
    (0, config_1.saveConfig)(config);
    (0, workflow_1.generateWorkflow)(config);
    console.log(chalk_1.default.green.bold('\n  Setup complete!\n'));
    console.log(chalk_1.default.white('  Run: ') + chalk_1.default.cyan('knowtif') + chalk_1.default.white(' to open the control panel'));
    console.log(chalk_1.default.white('  Run: ') + chalk_1.default.cyan('knowtif test') + chalk_1.default.white(' to send a test notification\n'));
    console.log(chalk_1.default.gray('  Then commit and push to activate:\n'));
    console.log(chalk_1.default.cyan('    git add . && git commit -m "Add Knowtif" && git push\n'));
};
exports.runSetup = runSetup;
const runControlPanel = async () => {
    const config = (0, config_1.getConfig)();
    console.log(chalk_1.default.blue.bold('\n  Knowtif Control Panel\n'));
    if (!config.installed) {
        console.log(chalk_1.default.yellow('  Not configured yet.\n'));
        const { setup } = await inquirer_1.default.prompt([{
                type: 'confirm', name: 'setup', message: 'Run setup now?', default: true
            }]);
        if (setup)
            await (0, exports.runSetup)();
        return;
    }
    const destinations = (0, config_1.getEnabledDestinations)(config);
    console.log(chalk_1.default.gray(`  Events: ${config.events.join(', ')}`));
    console.log(chalk_1.default.gray(`  Destinations: ${destinations.join(', ') || 'None'}\n`));
    const { action } = await inquirer_1.default.prompt([{
            type: 'list',
            name: 'action',
            message: 'What do you want to do?',
            choices: [
                { name: 'Send test notification', value: 'test' },
                { name: 'Add destination', value: 'add' },
                { name: 'Remove destination', value: 'remove' },
                { name: 'Change events', value: 'events' },
                { name: 'Regenerate workflow', value: 'regenerate' },
                { name: 'Reset everything', value: 'reset' },
                { name: 'Exit', value: 'exit' },
            ],
        }]);
    switch (action) {
        case 'test':
            await (0, exports.runTest)();
            break;
        case 'add':
            await addDestination();
            break;
        case 'remove':
            await removeDestination();
            break;
        case 'events':
            await changeEvents();
            break;
        case 'regenerate':
            (0, workflow_1.generateWorkflow)(config);
            console.log(chalk_1.default.green('\n  Workflow regenerated!\n'));
            break;
        case 'reset':
            await resetConfig();
            break;
        case 'exit':
            return;
    }
    // Loop back
    await (0, exports.runControlPanel)();
};
exports.runControlPanel = runControlPanel;
const runTest = async () => {
    const config = (0, config_1.getConfig)();
    if (!(0, config_1.hasDestinations)(config)) {
        console.log(chalk_1.default.yellow('\n  No destinations configured. Run setup first.\n'));
        return;
    }
    console.log(chalk_1.default.blue('\n  Sending test notification...\n'));
    // Set env vars for notify
    process.env.GITHUB_ACTIONS = 'true';
    if (config.discord?.enabled)
        process.env.DISCORD_WEBHOOK = config.discord.webhook;
    if (config.pushover?.enabled) {
        process.env.PUSHOVER_USER = config.pushover.user;
        process.env.PUSHOVER_TOKEN = config.pushover.token;
    }
    if (config.ntfy?.enabled) {
        process.env.NTFY_TOPIC = config.ntfy.topic;
        process.env.NTFY_SERVER = config.ntfy.server;
    }
    await (0, notify_1.sendNotification)('Test Notification', 'Knowtif is working! You will receive GitHub notifications here.', notify_1.NotificationType.SUCCESS);
    console.log(chalk_1.default.green('\n  Test sent! Check your destinations.\n'));
};
exports.runTest = runTest;
const addDestination = async () => {
    const config = (0, config_1.getConfig)();
    const repoInfo = getRepoInfo();
    const defaultTopic = repoInfo ? generateTopic(repoInfo.owner, repoInfo.repo) : 'knowtif';
    const available = [];
    if (!config.discord?.enabled)
        available.push({ name: 'Discord', value: 'discord' });
    if (!config.pushover?.enabled)
        available.push({ name: 'Pushover', value: 'pushover' });
    if (!config.ntfy?.enabled)
        available.push({ name: 'ntfy.sh', value: 'ntfy' });
    if (!config.email?.enabled)
        available.push({ name: 'Email', value: 'email' });
    if (!config.webhook?.enabled)
        available.push({ name: 'Webhook', value: 'webhook' });
    if (available.length === 0) {
        console.log(chalk_1.default.yellow('\n  All destinations already configured!\n'));
        return;
    }
    const { dest } = await inquirer_1.default.prompt([{
            type: 'list', name: 'dest', message: 'Add which destination?', choices: available
        }]);
    let update = {};
    switch (dest) {
        case 'discord':
            update.discord = await setupDiscord();
            break;
        case 'pushover':
            update.pushover = await setupPushover();
            break;
        case 'ntfy':
            update.ntfy = await setupNtfy(defaultTopic);
            break;
        case 'email':
            update.email = await setupEmail();
            break;
        case 'webhook':
            update.webhook = await setupWebhook();
            break;
    }
    (0, config_1.saveConfig)(update);
    (0, workflow_1.generateWorkflow)((0, config_1.getConfig)());
    console.log(chalk_1.default.green('\n  Destination added and workflow updated!\n'));
};
const removeDestination = async () => {
    const config = (0, config_1.getConfig)();
    const enabled = [];
    if (config.discord?.enabled)
        enabled.push({ name: 'Discord', value: 'discord' });
    if (config.pushover?.enabled)
        enabled.push({ name: 'Pushover', value: 'pushover' });
    if (config.ntfy?.enabled)
        enabled.push({ name: 'ntfy.sh', value: 'ntfy' });
    if (config.email?.enabled)
        enabled.push({ name: 'Email', value: 'email' });
    if (config.webhook?.enabled)
        enabled.push({ name: 'Webhook', value: 'webhook' });
    if (enabled.length === 0) {
        console.log(chalk_1.default.yellow('\n  No destinations to remove!\n'));
        return;
    }
    const { dest } = await inquirer_1.default.prompt([{
            type: 'list', name: 'dest', message: 'Remove which destination?', choices: enabled
        }]);
    const update = {};
    switch (dest) {
        case 'discord':
            update.discord = { ...config.discord, enabled: false };
            break;
        case 'pushover':
            update.pushover = { ...config.pushover, enabled: false };
            break;
        case 'ntfy':
            update.ntfy = { ...config.ntfy, enabled: false };
            break;
        case 'email':
            update.email = { ...config.email, enabled: false };
            break;
        case 'webhook':
            update.webhook = { ...config.webhook, enabled: false };
            break;
    }
    (0, config_1.saveConfig)(update);
    (0, workflow_1.generateWorkflow)((0, config_1.getConfig)());
    console.log(chalk_1.default.green('\n  Destination removed and workflow updated!\n'));
};
const changeEvents = async () => {
    const config = (0, config_1.getConfig)();
    const { events } = await inquirer_1.default.prompt([{
            type: 'checkbox',
            name: 'events',
            message: 'Select events:',
            choices: [
                { name: 'Push', value: 'push', checked: config.events.includes('push') },
                { name: 'CI/Workflow', value: 'workflow_run', checked: config.events.includes('workflow_run') },
                { name: 'Deployment', value: 'deployment_status', checked: config.events.includes('deployment_status') },
                { name: 'Release', value: 'release', checked: config.events.includes('release') },
                { name: 'Pull Request', value: 'pull_request', checked: config.events.includes('pull_request') },
                { name: 'Issues', value: 'issues', checked: config.events.includes('issues') },
                { name: 'Stars', value: 'star', checked: config.events.includes('star') },
            ],
        }]);
    (0, config_1.saveConfig)({ events });
    (0, workflow_1.generateWorkflow)((0, config_1.getConfig)());
    console.log(chalk_1.default.green('\n  Events updated!\n'));
};
const resetConfig = async () => {
    const { confirm } = await inquirer_1.default.prompt([{
            type: 'confirm', name: 'confirm', message: 'Delete all Knowtif config?', default: false
        }]);
    if (confirm) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        try {
            fs.unlinkSync(path.join(process.cwd(), '.knowtif.json'));
        }
        catch { }
        try {
            fs.unlinkSync(path.join(process.cwd(), '.github', 'workflows', 'knowtif.yml'));
        }
        catch { }
        console.log(chalk_1.default.green('\n  Config reset!\n'));
    }
};
