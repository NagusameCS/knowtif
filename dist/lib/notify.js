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
exports.sendNotification = exports.NotificationType = void 0;
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("./config");
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "info";
    NotificationType["SUCCESS"] = "success";
    NotificationType["FAILURE"] = "failure";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
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
    return (0, config_1.getConfig)();
};
const sendNotification = async (title, message, type = NotificationType.INFO) => {
    const config = getNotifyConfig();
    const timestamp = new Date().toLocaleTimeString();
    // 1. Terminal Notification (always)
    let color = chalk_1.default.blue;
    let icon = '[INFO]';
    if (type === NotificationType.SUCCESS) {
        color = chalk_1.default.green;
        icon = '[OK]';
    }
    if (type === NotificationType.FAILURE) {
        color = chalk_1.default.red;
        icon = '[FAIL]';
    }
    console.log(`[${chalk_1.default.gray(timestamp)}] ${icon} ${color.bold(title)}`);
    console.log(chalk_1.default.white(message.replace(/\*\*/g, '').replace(/`/g, '')));
    console.log('');
    // 2. Discord Notification
    if (config.discordWebhook) {
        try {
            let discordColor = 3447003; // Blue
            if (type === NotificationType.SUCCESS)
                discordColor = 5763719; // Green
            if (type === NotificationType.FAILURE)
                discordColor = 15548997; // Red
            await axios_1.default.post(config.discordWebhook, {
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
            console.log(chalk_1.default.gray('  → Discord notification sent'));
        }
        catch (error) {
            console.error(chalk_1.default.yellow(`  → Failed to send Discord notification: ${error.message}`));
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
            }
            else if (type === NotificationType.SUCCESS) {
                sound = 'magic';
            }
            await axios_1.default.post('https://api.pushover.net/1/messages.json', {
                token: config.pushoverToken,
                user: config.pushoverUser,
                title: title.replace(/[^\w\s]/g, '').trim(), // Remove emojis for cleaner notification
                message: message.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[.*?\]\(.*?\)/g, ''),
                priority: priority,
                sound: sound,
            });
            console.log(chalk_1.default.gray('  → Pushover notification sent'));
        }
        catch (error) {
            console.error(chalk_1.default.yellow(`  → Failed to send Pushover notification: ${error.message}`));
        }
    }
    // 4. SMTP Email Notification
    if (config.smtpHost && config.smtpUser && config.smtpPass && config.emailTo) {
        try {
            const transporter = nodemailer_1.default.createTransport({
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
            if (type === NotificationType.SUCCESS)
                bgColor = '#27ae60';
            if (type === NotificationType.FAILURE)
                bgColor = '#e74c3c';
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
            console.log(chalk_1.default.gray('  → Email notification sent'));
        }
        catch (error) {
            console.error(chalk_1.default.yellow(`  → Failed to send Email notification: ${error.message}`));
        }
    }
    // 5. ntfy.sh - Free push notifications (great for web extensions!)
    // Your extension can subscribe to: https://ntfy.sh/YOUR_TOPIC
    const ntfyTopic = config.ntfyTopic;
    const ntfyServer = config.ntfyServer || 'https://ntfy.sh';
    if (ntfyTopic) {
        try {
            let priority = 3; // default
            let tags = 'information_source';
            if (type === NotificationType.SUCCESS) {
                priority = 3;
                tags = 'white_check_mark';
            }
            if (type === NotificationType.FAILURE) {
                priority = 5;
                tags = 'x,warning';
            }
            await axios_1.default.post(`${ntfyServer}/${ntfyTopic}`, message.replace(/\*\*/g, '').replace(/`/g, ''), {
                headers: {
                    'Title': title.replace(/[^\w\s]/g, '').trim(),
                    'Priority': priority.toString(),
                    'Tags': tags,
                },
            });
            console.log(chalk_1.default.gray('  → ntfy notification sent'));
        }
        catch (error) {
            console.error(chalk_1.default.yellow(`  → Failed to send ntfy notification: ${error.message}`));
        }
    }
    // 6. Custom Webhook - For your own web extension backend or any service
    const webhookUrl = config.webhookUrl;
    const webhookSecret = config.webhookSecret;
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
            const headers = {
                'Content-Type': 'application/json',
            };
            if (webhookSecret) {
                // Simple HMAC signature for verification
                const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
                const signature = crypto
                    .createHmac('sha256', webhookSecret)
                    .update(JSON.stringify(payload))
                    .digest('hex');
                headers['X-Knowtif-Signature'] = `sha256=${signature}`;
            }
            await axios_1.default.post(webhookUrl, payload, { headers });
            console.log(chalk_1.default.gray('  → Webhook notification sent'));
        }
        catch (error) {
            console.error(chalk_1.default.yellow(`  → Failed to send Webhook notification: ${error.message}`));
        }
    }
};
exports.sendNotification = sendNotification;
