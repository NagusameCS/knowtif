import * as fs from 'fs';
import * as path from 'path';
import { KnowtifConfig } from './config';

export const generateWorkflow = (config: KnowtifConfig) => {
    const events = buildEventTriggers(config.events, config.branches);
    const env = buildEnvBlock(config);

    const workflow = `# Knowtif - GitHub Notifications
# Manage: npx knowtif

name: Knowtif

on:
${events}

jobs:
  notify:
    runs-on: ubuntu-latest
    if: \${{ github.event.workflow_run.name != 'Knowtif' || github.event_name != 'workflow_run' }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx knowtif@latest action
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
${env}
`;

    const workflowDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(workflowDir)) {
        fs.mkdirSync(workflowDir, { recursive: true });
    }

    fs.writeFileSync(path.join(workflowDir, 'knowtif.yml'), workflow);
};

const buildEventTriggers = (events: string[], branches: string[]): string => {
    const branchArray = branches.map(b => `"${b}"`).join(', ');
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

    return triggers;
};

const buildEnvBlock = (config: KnowtifConfig): string => {
    const lines: string[] = [];

    if (config.discord?.enabled && config.discord.webhook) {
        lines.push(`          DISCORD_WEBHOOK: "${config.discord.webhook}"`);
    }

    if (config.pushover?.enabled && config.pushover.user && config.pushover.token) {
        lines.push(`          PUSHOVER_USER: "${config.pushover.user}"`);
        lines.push(`          PUSHOVER_TOKEN: "${config.pushover.token}"`);
    }

    if (config.ntfy?.enabled && config.ntfy.topic) {
        lines.push(`          NTFY_TOPIC: "${config.ntfy.topic}"`);
        lines.push(`          NTFY_SERVER: "${config.ntfy.server || 'https://ntfy.sh'}"`);
    }

    if (config.email?.enabled) {
        lines.push(`          SMTP_HOST: "${config.email.host}"`);
        lines.push(`          SMTP_PORT: "${config.email.port}"`);
        lines.push(`          SMTP_USER: "${config.email.user}"`);
        lines.push(`          SMTP_PASS: "${config.email.pass}"`);
        lines.push(`          EMAIL_TO: "${config.email.to}"`);
    }

    if (config.webhook?.enabled && config.webhook.url) {
        lines.push(`          WEBHOOK_URL: "${config.webhook.url}"`);
        if (config.webhook.secret) {
            lines.push(`          WEBHOOK_SECRET: "${config.webhook.secret}"`);
        }
    }

    if (config.healthCheckUrl) {
        lines.push(`          HEALTH_CHECK_URL: "${config.healthCheckUrl}"`);
    }

    return lines.join('\n');
};
