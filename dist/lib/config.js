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
exports.setupConfig = exports.getConfig = exports.getLocalConfig = void 0;
const conf_1 = __importDefault(require("conf"));
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config = new conf_1.default({ projectName: 'knowtif' });
const LOCAL_CONFIG_FILE = '.knowtif.json';
const getLocalConfig = () => {
    const configPath = path.join(process.cwd(), LOCAL_CONFIG_FILE);
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        catch (e) {
            console.warn(chalk_1.default.yellow('Warning: Could not parse .knowtif.json'));
        }
    }
    return {};
};
exports.getLocalConfig = getLocalConfig;
const getConfig = () => {
    const globalConfig = {
        githubToken: config.get('githubToken'),
        discordWebhook: config.get('discordWebhook'),
        pushoverUser: config.get('pushoverUser'),
        pushoverToken: config.get('pushoverToken'),
        smtpHost: config.get('smtpHost'),
        smtpPort: config.get('smtpPort'),
        smtpUser: config.get('smtpUser'),
        smtpPass: config.get('smtpPass'),
        emailTo: config.get('emailTo'),
    };
    const localConfig = (0, exports.getLocalConfig)();
    return { ...globalConfig, ...localConfig };
};
exports.getConfig = getConfig;
const setupConfig = async () => {
    console.log(chalk_1.default.blue('Welcome to Knowtif Configuration'));
    const answers = await inquirer_1.default.prompt([
        {
            type: 'password',
            name: 'githubToken',
            message: 'Enter your GitHub Personal Access Token (repo scope required):',
            default: config.get('githubToken'),
            mask: '*',
            when: () => !config.get('githubToken') || process.argv.includes('--force'),
        },
        {
            type: 'confirm',
            name: 'setupDiscord',
            message: 'Do you want to set up Discord notifications?',
            default: !!config.get('discordWebhook'),
            when: () => !config.get('discordWebhook') || process.argv.includes('--force'),
        },
        {
            type: 'input',
            name: 'discordWebhook',
            message: 'Enter your Discord Webhook URL:',
            when: (answers) => answers.setupDiscord,
            default: config.get('discordWebhook'),
        },
        {
            type: 'confirm',
            name: 'setupPushover',
            message: 'Do you want to set up Pushover (Phone) notifications?',
            default: !!config.get('pushoverUser'),
            when: () => !config.get('pushoverUser') || process.argv.includes('--force'),
        },
        {
            type: 'input',
            name: 'pushoverUser',
            message: 'Enter your Pushover User Key:',
            when: (answers) => answers.setupPushover,
            default: config.get('pushoverUser'),
        },
        {
            type: 'password',
            name: 'pushoverToken',
            message: 'Enter your Pushover API Token:',
            when: (answers) => answers.setupPushover,
            default: config.get('pushoverToken'),
            mask: '*',
        },
        {
            type: 'confirm',
            name: 'setupSmtp',
            message: 'Do you want to set up Email (SMTP) notifications?',
            default: !!config.get('smtpHost'),
            when: () => !config.get('smtpHost') || process.argv.includes('--force'),
        },
        {
            type: 'input',
            name: 'smtpHost',
            message: 'SMTP Host:',
            when: (answers) => answers.setupSmtp,
            default: config.get('smtpHost'),
        },
        {
            type: 'number',
            name: 'smtpPort',
            message: 'SMTP Port:',
            when: (answers) => answers.setupSmtp,
            default: config.get('smtpPort') || 587,
        },
        {
            type: 'input',
            name: 'smtpUser',
            message: 'SMTP User:',
            when: (answers) => answers.setupSmtp,
            default: config.get('smtpUser'),
        },
        {
            type: 'password',
            name: 'smtpPass',
            message: 'SMTP Password:',
            when: (answers) => answers.setupSmtp,
            default: config.get('smtpPass'),
            mask: '*',
        },
        {
            type: 'input',
            name: 'emailTo',
            message: 'Email to send notifications to:',
            when: (answers) => answers.setupSmtp,
            default: config.get('emailTo'),
        },
    ]);
    if (answers.githubToken)
        config.set('githubToken', answers.githubToken);
    if (answers.discordWebhook)
        config.set('discordWebhook', answers.discordWebhook);
    if (answers.pushoverUser)
        config.set('pushoverUser', answers.pushoverUser);
    if (answers.pushoverToken)
        config.set('pushoverToken', answers.pushoverToken);
    if (answers.smtpHost) {
        config.set('smtpHost', answers.smtpHost);
        config.set('smtpPort', answers.smtpPort);
        config.set('smtpUser', answers.smtpUser);
        config.set('smtpPass', answers.smtpPass);
        config.set('emailTo', answers.emailTo);
    }
    // Local Repo Configuration
    const localConfig = (0, exports.getLocalConfig)();
    const repoAnswers = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'configureRepo',
            message: 'Do you want to configure this repository for monitoring?',
            default: true,
        },
        {
            type: 'input',
            name: 'healthCheckUrl',
            message: 'Enter a Health Check URL (optional):',
            when: (answers) => answers.configureRepo,
            default: localConfig.healthCheckUrl,
        },
    ]);
    if (repoAnswers.configureRepo) {
        const newLocalConfig = {
            ...localConfig,
            healthCheckUrl: repoAnswers.healthCheckUrl,
        };
        fs.writeFileSync(path.join(process.cwd(), LOCAL_CONFIG_FILE), JSON.stringify(newLocalConfig, null, 2));
        console.log(chalk_1.default.green(`Repository configuration saved to ${LOCAL_CONFIG_FILE}`));
        // Add to .gitignore if not present
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
            if (!gitignoreContent.includes(LOCAL_CONFIG_FILE)) {
                fs.appendFileSync(gitignorePath, `\n${LOCAL_CONFIG_FILE}\n`);
                console.log(chalk_1.default.gray(`Added ${LOCAL_CONFIG_FILE} to .gitignore`));
            }
        }
    }
    console.log(chalk_1.default.green('Configuration complete!'));
};
exports.setupConfig = setupConfig;
