import Conf from 'conf';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

const config = new Conf({ projectName: 'knowtif' });

export interface AppConfig {
    githubToken: string;
    discordWebhook?: string;
    pushoverUser?: string;
    pushoverToken?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    emailTo?: string;
    healthCheckUrl?: string;
}

const LOCAL_CONFIG_FILE = '.knowtif.json';

export const getLocalConfig = (): Partial<AppConfig> => {
    const configPath = path.join(process.cwd(), LOCAL_CONFIG_FILE);
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (e) {
            console.warn(chalk.yellow('Warning: Could not parse .knowtif.json'));
        }
    }
    return {};
};

export const getConfig = (): AppConfig => {
    const globalConfig = {
        githubToken: config.get('githubToken') as string,
        discordWebhook: config.get('discordWebhook') as string,
        pushoverUser: config.get('pushoverUser') as string,
        pushoverToken: config.get('pushoverToken') as string,
        smtpHost: config.get('smtpHost') as string,
        smtpPort: config.get('smtpPort') as number,
        smtpUser: config.get('smtpUser') as string,
        smtpPass: config.get('smtpPass') as string,
        emailTo: config.get('emailTo') as string,
    };

    const localConfig = getLocalConfig();
    return { ...globalConfig, ...localConfig };
};

export const setupConfig = async () => {
    console.log(chalk.blue('Welcome to Knowtif Configuration'));

    const answers = await inquirer.prompt([
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

    if (answers.githubToken) config.set('githubToken', answers.githubToken);
    if (answers.discordWebhook) config.set('discordWebhook', answers.discordWebhook);
    if (answers.pushoverUser) config.set('pushoverUser', answers.pushoverUser);
    if (answers.pushoverToken) config.set('pushoverToken', answers.pushoverToken);
    if (answers.smtpHost) {
        config.set('smtpHost', answers.smtpHost);
        config.set('smtpPort', answers.smtpPort);
        config.set('smtpUser', answers.smtpUser);
        config.set('smtpPass', answers.smtpPass);
        config.set('emailTo', answers.emailTo);
    }

    // Local Repo Configuration
    const localConfig = getLocalConfig();
    const repoAnswers = await inquirer.prompt([
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
        console.log(chalk.green(`Repository configuration saved to ${LOCAL_CONFIG_FILE}`));

        // Add to .gitignore if not present
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
            if (!gitignoreContent.includes(LOCAL_CONFIG_FILE)) {
                fs.appendFileSync(gitignorePath, `\n${LOCAL_CONFIG_FILE}\n`);
                console.log(chalk.gray(`Added ${LOCAL_CONFIG_FILE} to .gitignore`));
            }
        }
    }

    console.log(chalk.green('Configuration complete!'));
};
