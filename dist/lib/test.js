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
exports.testNotifications = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const notify_1 = require("./notify");
const testNotifications = async () => {
    console.log(chalk_1.default.blue.bold('\n  Knowtif Test\n'));
    // Read workflow file to get config
    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'knowtif.yml');
    if (!fs.existsSync(workflowPath)) {
        console.log(chalk_1.default.red('  No knowtif.yml found. Run "npx knowtif install" first.\n'));
        return;
    }
    const content = fs.readFileSync(workflowPath, 'utf-8');
    // Extract config from workflow
    const discordMatch = content.match(/DISCORD_WEBHOOK:\s*"([^"]+)"/);
    const ntfyTopicMatch = content.match(/NTFY_TOPIC:\s*"([^"]+)"/);
    const ntfyServerMatch = content.match(/NTFY_SERVER:\s*"([^"]+)"/);
    const pushoverUserMatch = content.match(/PUSHOVER_USER:\s*"([^"]+)"/);
    const pushoverTokenMatch = content.match(/PUSHOVER_TOKEN:\s*"([^"]+)"/);
    // Set env vars for notify module
    if (discordMatch)
        process.env.DISCORD_WEBHOOK = discordMatch[1];
    if (ntfyTopicMatch)
        process.env.NTFY_TOPIC = ntfyTopicMatch[1];
    if (ntfyServerMatch)
        process.env.NTFY_SERVER = ntfyServerMatch[1];
    if (pushoverUserMatch)
        process.env.PUSHOVER_USER = pushoverUserMatch[1];
    if (pushoverTokenMatch)
        process.env.PUSHOVER_TOKEN = pushoverTokenMatch[1];
    // Pretend we're in GitHub Actions so notify uses env vars
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_REPOSITORY = 'test/repo';
    process.env.GITHUB_SHA = 'abc123';
    process.env.GITHUB_EVENT_NAME = 'test';
    const channels = [];
    if (discordMatch)
        channels.push('Discord');
    if (ntfyTopicMatch)
        channels.push('ntfy.sh');
    if (pushoverUserMatch && pushoverTokenMatch)
        channels.push('Pushover');
    if (channels.length === 0) {
        console.log(chalk_1.default.yellow('  No notification channels configured.\n'));
        return;
    }
    console.log(chalk_1.default.gray(`  Sending test to: ${channels.join(', ')}\n`));
    await (0, notify_1.sendNotification)('Test Notification', 'If you see this, Knowtif is working! Your GitHub notifications are configured.', notify_1.NotificationType.SUCCESS);
    console.log(chalk_1.default.green('\n  Test complete! Check your notification channels.\n'));
};
exports.testNotifications = testNotifications;
