import axios from 'axios';
import chalk from 'chalk';
import nodemailer from 'nodemailer';
import { getConfig } from './config';

export enum NotificationType {
    INFO = 'info',
    SUCCESS = 'success',
    FAILURE = 'failure',
}

// Get config from either environment variables (GitHub Actions) or local config
const getNotifyConfig = () => {
    // In GitHub Actions, use environment variables
    if (process.env.GITHUB_ACTIONS) {
        return {
            discordWebhook: process.env.DISCORD_WEBHOOK,
            pushoverUser: process.env.PUSHOVER_USER,
            pushoverToken: process.env.PUSHOVER_TOKEN,
            smtpHost: process.env.SMTP_HOST,
            smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
            smtpUser: process.env.SMTP_USER,
            smtpPass: process.env.SMTP_PASS,
            emailTo: process.env.EMAIL_TO,
            // New channels for web extension support
            ntfyTopic: process.env.NTFY_TOPIC,
            ntfyServer: process.env.NTFY_SERVER,
            webhookUrl: process.env.WEBHOOK_URL,
            webhookSecret: process.env.WEBHOOK_SECRET,
        };
    }
    // Otherwise, use local config
    return getConfig();
};

export const sendNotification = async (title: string, message: string, type: NotificationType = NotificationType.INFO) => {
    const config = getNotifyConfig();
    const timestamp = new Date().toLocaleTimeString();

    // 1. Terminal Notification (always)
    let color = chalk.blue;
    let icon = '[INFO]';
    if (type === NotificationType.SUCCESS) { color = chalk.green; icon = '[OK]'; }
    if (type === NotificationType.FAILURE) { color = chalk.red; icon = '[FAIL]'; }

    console.log(`[${chalk.gray(timestamp)}] ${icon} ${color.bold(title)}`);
    console.log(chalk.white(message.replace(/\*\*/g, '').replace(/`/g, '')));
    console.log('');

    // 2. Discord Notification
    if (config.discordWebhook) {
        try {
            let discordColor = 3447003; // Blue
            if (type === NotificationType.SUCCESS) discordColor = 5763719; // Green
            if (type === NotificationType.FAILURE) discordColor = 15548997; // Red

            await axios.post(config.discordWebhook, {
                embeds: [{
                    title: title,
                    description: message.replace(/\n/g, '\n'),
                    color: discordColor,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: 'Knowtif',
                    },
                }]
            });
            console.log(chalk.gray('  → Discord notification sent'));
        } catch (error: any) {
            console.error(chalk.yellow(`  → Failed to send Discord notification: ${error.message}`));
        }
    }

    // 3. Pushover Notification (Phone)
    if (config.pushoverUser && config.pushoverToken) {
        try {
            let priority = 0;
            let sound = 'pushover';
            if (type === NotificationType.FAILURE) {
                priority = 1; // High priority
                sound = 'siren';
            } else if (type === NotificationType.SUCCESS) {
                sound = 'magic';
            }

            await axios.post('https://api.pushover.net/1/messages.json', {
                token: config.pushoverToken,
                user: config.pushoverUser,
                title: title.replace(/[^\w\s]/g, '').trim(), // Remove emojis for cleaner notification
                message: message.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[.*?\]\(.*?\)/g, ''),
                priority: priority,
                sound: sound,
            });
            console.log(chalk.gray('  → Pushover notification sent'));
        } catch (error: any) {
            console.error(chalk.yellow(`  → Failed to send Pushover notification: ${error.message}`));
        }
    }

    // 4. SMTP Email Notification
    if (config.smtpHost && config.smtpUser && config.smtpPass && config.emailTo) {
        try {
            const transporter = nodemailer.createTransport({
                host: config.smtpHost,
                port: config.smtpPort || 587,
                secure: config.smtpPort === 465,
                auth: {
                    user: config.smtpUser,
                    pass: config.smtpPass,
                },
            });

            // Convert markdown-ish message to HTML
            const htmlMessage = message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
                .replace(/\n/g, '<br>');

            let bgColor = '#3498db';
            if (type === NotificationType.SUCCESS) bgColor = '#27ae60';
            if (type === NotificationType.FAILURE) bgColor = '#e74c3c';

            await transporter.sendMail({
                from: `"Knowtif" <${config.smtpUser}>`,
                to: config.emailTo,
                subject: `[Knowtif] ${title.replace(/[^\w\s]/g, '').trim()}`,
                text: `${title}\n\n${message.replace(/\*\*/g, '').replace(/`/g, '')}`,
                html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${bgColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">${title}</h2>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #eee;">
              <p style="margin: 0; line-height: 1.6;">${htmlMessage}</p>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 10px;">Sent by Knowtif</p>
          </div>
        `,
            });
            console.log(chalk.gray('  → Email notification sent'));
        } catch (error: any) {
            console.error(chalk.yellow(`  → Failed to send Email notification: ${error.message}`));
        }
    }

    // 5. ntfy.sh - Free push notifications (great for web extensions!)
    // Your extension can subscribe to: https://ntfy.sh/YOUR_TOPIC
    const ntfyTopic = (config as any).ntfyTopic;
    const ntfyServer = (config as any).ntfyServer || 'https://ntfy.sh';
    if (ntfyTopic) {
        try {
            let priority = 3; // default
            let tags = 'information_source';
            if (type === NotificationType.SUCCESS) { priority = 3; tags = 'white_check_mark'; }
            if (type === NotificationType.FAILURE) { priority = 5; tags = 'x,warning'; }

            await axios.post(`${ntfyServer}/${ntfyTopic}`, message.replace(/\*\*/g, '').replace(/`/g, ''), {
                headers: {
                    'Title': title.replace(/[^\w\s]/g, '').trim(),
                    'Priority': priority.toString(),
                    'Tags': tags,
                },
            });
            console.log(chalk.gray('  → ntfy notification sent'));
        } catch (error: any) {
            console.error(chalk.yellow(`  → Failed to send ntfy notification: ${error.message}`));
        }
    }

    // 6. Custom Webhook - For your own web extension backend or any service
    const webhookUrl = (config as any).webhookUrl;
    const webhookSecret = (config as any).webhookSecret;
    if (webhookUrl) {
        try {
            const payload = {
                title,
                message,
                type,
                timestamp: new Date().toISOString(),
                repo: process.env.GITHUB_REPOSITORY,
                sha: process.env.GITHUB_SHA,
                event: process.env.GITHUB_EVENT_NAME,
            };

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (webhookSecret) {
                // Simple HMAC signature for verification
                const crypto = await import('crypto');
                const signature = crypto
                    .createHmac('sha256', webhookSecret)
                    .update(JSON.stringify(payload))
                    .digest('hex');
                headers['X-Knowtif-Signature'] = `sha256=${signature}`;
            }

            await axios.post(webhookUrl, payload, { headers });
            console.log(chalk.gray('  → Webhook notification sent'));
        } catch (error: any) {
            console.error(chalk.yellow(`  → Failed to send Webhook notification: ${error.message}`));
        }
    }
};
