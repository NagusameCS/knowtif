import chalk from 'chalk';

// Box drawing characters
const BOX = {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    teeRight: '├',
    teeLeft: '┤',
};

// Colors
export const colors = {
    primary: chalk.hex('#7C3AED'),      // Purple
    secondary: chalk.hex('#06B6D4'),    // Cyan
    success: chalk.hex('#10B981'),      // Green
    warning: chalk.hex('#F59E0B'),      // Orange
    error: chalk.hex('#EF4444'),        // Red
    muted: chalk.hex('#6B7280'),        // Gray
    text: chalk.hex('#F3F4F6'),         // Light gray
};

// Icons
export const icons = {
    check: colors.success('✓'),
    cross: colors.error('✗'),
    arrow: colors.primary('→'),
    bullet: colors.muted('•'),
    discord: '🎮',
    phone: '📱',
    browser: '🌐',
    email: '📧',
    webhook: '🔗',
    settings: '⚙️',
    lock: '🔒',
    unlock: '🔓',
    trash: '🗑️',
    add: '➕',
    edit: '✏️',
    test: '🧪',
    rocket: '🚀',
    bell: '🔔',
};

export const box = (content: string, options: { title?: string; width?: number; padding?: number; borderColor?: chalk.Chalk } = {}) => {
    const { title, width = 60, padding = 1, borderColor = colors.primary } = options;
    const lines = content.split('\n');
    const innerWidth = width - 2;
    
    const pad = ' '.repeat(padding);
    const emptyLine = borderColor(BOX.vertical) + ' '.repeat(innerWidth) + borderColor(BOX.vertical);
    
    // Top border
    let result = borderColor(BOX.topLeft);
    if (title) {
        const titlePadded = ` ${title} `;
        const remaining = innerWidth - titlePadded.length;
        const left = Math.floor(remaining / 2);
        const right = remaining - left;
        result += borderColor(BOX.horizontal.repeat(left)) + colors.text.bold(titlePadded) + borderColor(BOX.horizontal.repeat(right));
    } else {
        result += borderColor(BOX.horizontal.repeat(innerWidth));
    }
    result += borderColor(BOX.topRight) + '\n';
    
    // Padding top
    for (let i = 0; i < padding; i++) {
        result += emptyLine + '\n';
    }
    
    // Content
    for (const line of lines) {
        const stripped = line.replace(/\x1B\[[0-9;]*m/g, '');
        const paddingNeeded = innerWidth - stripped.length - (padding * 2);
        result += borderColor(BOX.vertical) + pad + line + ' '.repeat(Math.max(0, paddingNeeded)) + pad + borderColor(BOX.vertical) + '\n';
    }
    
    // Padding bottom
    for (let i = 0; i < padding; i++) {
        result += emptyLine + '\n';
    }
    
    // Bottom border
    result += borderColor(BOX.bottomLeft) + borderColor(BOX.horizontal.repeat(innerWidth)) + borderColor(BOX.bottomRight);
    
    return result;
};

export const header = () => {
    const logo = `
  ${colors.primary('╦╔═')}${colors.secondary('╔╗╔╔═╗╦ ╦╔╦╗╦╔═╗')}
  ${colors.primary('╠╩╗')}${colors.secondary('║║║║ ║║║║ ║ ║╠╣ ')}
  ${colors.primary('╩ ╩')}${colors.secondary('╝╚╝╚═╝╚╩╝ ╩ ╩╚  ')}
`;
    console.log(logo);
    console.log(colors.muted('  GitHub Notifications Made Simple\n'));
};

export const divider = (width = 50) => {
    console.log(colors.muted('─'.repeat(width)));
};

export const statusBadge = (enabled: boolean, label: string) => {
    if (enabled) {
        return `${colors.success('●')} ${colors.text(label)}`;
    }
    return `${colors.muted('○')} ${colors.muted(label)}`;
};

export const menuItem = (key: string, label: string, description?: string) => {
    const keyPart = colors.primary(`[${key}]`);
    const labelPart = colors.text(label);
    if (description) {
        return `  ${keyPart} ${labelPart} ${colors.muted(`- ${description}`)}`;
    }
    return `  ${keyPart} ${labelPart}`;
};

export const success = (message: string) => {
    console.log(`\n  ${icons.check} ${colors.success(message)}\n`);
};

export const error = (message: string) => {
    console.log(`\n  ${icons.cross} ${colors.error(message)}\n`);
};

export const info = (message: string) => {
    console.log(`  ${icons.arrow} ${colors.text(message)}`);
};

export const warn = (message: string) => {
    console.log(`  ${colors.warning('!')} ${colors.warning(message)}`);
};

export const spinner = async <T>(message: string, fn: () => Promise<T>): Promise<T> => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    const interval = setInterval(() => {
        process.stdout.write(`\r  ${colors.primary(frames[i])} ${colors.muted(message)}`);
        i = (i + 1) % frames.length;
    }, 80);
    
    try {
        const result = await fn();
        clearInterval(interval);
        process.stdout.write(`\r  ${icons.check} ${colors.success(message)}\n`);
        return result;
    } catch (err) {
        clearInterval(interval);
        process.stdout.write(`\r  ${icons.cross} ${colors.error(message)}\n`);
        throw err;
    }
};

export const table = (data: { label: string; value: string; status?: boolean }[]) => {
    const maxLabel = Math.max(...data.map(d => d.label.length));
    
    for (const row of data) {
        const label = colors.muted(row.label.padEnd(maxLabel));
        const status = row.status !== undefined 
            ? (row.status ? colors.success(' ✓') : colors.error(' ✗'))
            : '';
        console.log(`  ${label}  ${colors.text(row.value)}${status}`);
    }
};

export const clear = () => {
    console.clear();
};
