import * as fs from 'fs';
import * as path from 'path';
import Conf from 'conf';

export interface KnowtifConfig {
    // Events
    events: string[];
    branches: string[];

    // Destinations
    discord?: {
        webhook: string;
        enabled: boolean;
    };
    pushover?: {
        user: string;
        token: string;
        enabled: boolean;
    };
    ntfy?: {
        topic: string;
        server: string;
        enabled: boolean;
    };
    email?: {
        host: string;
        port: number;
        user: string;
        pass: string;
        to: string;
        enabled: boolean;
    };
    webhook?: {
        url: string;
        secret?: string;
        enabled: boolean;
    };

    // Health check
    healthCheckUrl?: string;

    // Meta
    installed: boolean;
    repoOwner?: string;
    repoName?: string;
}

const defaultConfig: KnowtifConfig = {
    events: ['push', 'workflow_run'],
    branches: ['main', 'master'],
    installed: false,
};

// Local config store
const store = new Conf<KnowtifConfig>({
    projectName: 'knowtif',
    defaults: defaultConfig,
});

// Project-level config file
const getProjectConfigPath = () => path.join(process.cwd(), '.knowtif.json');

export const getConfig = (): KnowtifConfig => {
    // First check for project-level config
    const projectPath = getProjectConfigPath();
    if (fs.existsSync(projectPath)) {
        try {
            const content = fs.readFileSync(projectPath, 'utf-8');
            return { ...defaultConfig, ...JSON.parse(content) };
        } catch {
            // Fall through to global config
        }
    }
    return store.store;
};

export const saveConfig = (config: Partial<KnowtifConfig>, projectLevel = true) => {
    const current = getConfig();
    const updated = { ...current, ...config };

    if (projectLevel) {
        const projectPath = getProjectConfigPath();
        fs.writeFileSync(projectPath, JSON.stringify(updated, null, 2));
    } else {
        store.store = updated;
    }

    return updated;
};

export const hasDestinations = (config: KnowtifConfig): boolean => {
    return !!(
        (config.discord?.enabled && config.discord.webhook) ||
        (config.pushover?.enabled && config.pushover.user && config.pushover.token) ||
        (config.ntfy?.enabled && config.ntfy.topic) ||
        (config.email?.enabled && config.email.host) ||
        (config.webhook?.enabled && config.webhook.url)
    );
};

export const getEnabledDestinations = (config: KnowtifConfig): string[] => {
    const destinations: string[] = [];
    if (config.discord?.enabled) destinations.push('Discord');
    if (config.pushover?.enabled) destinations.push('Pushover');
    if (config.ntfy?.enabled) destinations.push('ntfy.sh');
    if (config.email?.enabled) destinations.push('Email');
    if (config.webhook?.enabled) destinations.push('Webhook');
    return destinations;
};
