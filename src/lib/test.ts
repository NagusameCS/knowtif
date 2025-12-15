import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { sendNotification, NotificationType } from './notify';

export const testNotifications = async () => {
    console.log(chalk.blue.bold('\n  Knowtif Test\n'));

    // Read workflow file to get config
    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'knowtif.yml');
    
    if (!fs.existsSync(workflowPath)) {
        console.log(chalk.red('  No knowtif.yml found. Run "npx knowtif install" first.\n'));
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
    if (discordMatch) process.env.DISCORD_WEBHOOK = discordMatch[1];
    if (ntfyTopicMatch) process.env.NTFY_TOPIC = ntfyTopicMatch[1];
    if (ntfyServerMatch) process.env.NTFY_SERVER = ntfyServerMatch[1];
    if (pushoverUserMatch) process.env.PUSHOVER_USER = pushoverUserMatch[1];
    if (pushoverTokenMatch) process.env.PUSHOVER_TOKEN = pushoverTokenMatch[1];

    // Pretend we're in GitHub Actions so notify uses env vars
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_REPOSITORY = 'test/repo';
    process.env.GITHUB_SHA = 'abc123';
    process.env.GITHUB_EVENT_NAME = 'test';

    const channels = [];
    if (discordMatch) channels.push('Discord');
    if (ntfyTopicMatch) channels.push('ntfy.sh');
    if (pushoverUserMatch && pushoverTokenMatch) channels.push('Pushover');

    if (channels.length === 0) {
        console.log(chalk.yellow('  No notification channels configured.\n'));
        return;
    }

    console.log(chalk.gray(`  Sending test to: ${channels.join(', ')}\n`));

    await sendNotification(
        'Test Notification',
        'If you see this, Knowtif is working! Your GitHub notifications are configured.',
        NotificationType.SUCCESS
    );

    console.log(chalk.green('\n  Test complete! Check your notification channels.\n'));
};
