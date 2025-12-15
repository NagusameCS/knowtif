import chalk from 'chalk';

// Box drawing characters
const BOX = {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    teeRight: '├',
    teeLeft: '┤',
    cross: '┼',
    doubleLine: '═',
};

// Refined monochrome palette with accent
export const colors = {
    primary: chalk.hex('#A855F7'),      // Vibrant purple
    secondary: chalk.hex('#38BDF8'),    // Sky blue
    success: chalk.hex('#22C55E'),      // Green
    warning: chalk.hex('#EAB308'),      // Yellow
    error: chalk.hex('#EF4444'),        // Red
    muted: chalk.hex('#64748B'),        // Slate gray
    text: chalk.hex('#E2E8F0'),         // Light slate
    dim: chalk.hex('#475569'),          // Dim slate
    bright: chalk.hex('#F8FAFC'),       // Almost white
};

// Render width helper (strips ANSI codes)
const stripAnsi = (str: string): string => str.replace(/\x1B\[[0-9;]*m/g, '');

// ASCII icons - no emojis
export const icons = {
    check: colors.success('[OK]'),
    cross: colors.error('[X]'),
    arrow: colors.primary('->'),
    bullet: colors.dim('*'),
    // Service icons as text
    discord: colors.secondary('[DIS]'),
    phone: colors.secondary('[PHN]'),
    browser: colors.secondary('[WEB]'),
    email: colors.secondary('[EML]'),
    webhook: colors.secondary('[API]'),
    // Action icons
    settings: '[CFG]',
    lock: colors.dim('[ENC]'),
    unlock: '[DEC]',
    trash: colors.error('[DEL]'),
    add: colors.success('[ADD]'),
    edit: '[EDT]',
    test: colors.primary('[TST]'),
    rocket: colors.success('[GO]'),
    bell: '[NFY]',
    on: colors.success('[ON]'),
    off: colors.muted('[OFF]'),
    dot: colors.primary('::'),
};

export const box = (content: string, options: { title?: string; width?: number; padding?: number; borderColor?: chalk.Chalk; style?: 'single' | 'double' } = {}) => {
    const { title, width = 60, padding = 1, borderColor = colors.dim, style = 'single' } = options;
    const lines = content.split('\n');
    const innerWidth = width - 2;
    const hChar = style === 'double' ? '═' : BOX.horizontal;

    const pad = ' '.repeat(padding);
    const emptyLine = borderColor(BOX.vertical) + ' '.repeat(innerWidth) + borderColor(BOX.vertical);

    // Top border
    let result = borderColor(style === 'double' ? '╔' : BOX.topLeft);
    if (title) {
        const titleText = ` ${title} `;
        const remaining = innerWidth - titleText.length;
        const left = Math.floor(remaining / 2);
        const right = remaining - left;
        result += borderColor(hChar.repeat(left)) + colors.bright.bold(titleText) + borderColor(hChar.repeat(right));
    } else {
        result += borderColor(hChar.repeat(innerWidth));
    }
    result += borderColor(style === 'double' ? '╗' : BOX.topRight) + '\n';

    // Padding top
    for (let i = 0; i < padding; i++) {
        result += emptyLine + '\n';
    }

    // Content
    for (const line of lines) {
        const stripped = stripAnsi(line);
        const paddingNeeded = innerWidth - stripped.length - (padding * 2);
        result += borderColor(BOX.vertical) + pad + line + ' '.repeat(Math.max(0, paddingNeeded)) + pad + borderColor(BOX.vertical) + '\n';
    }

    // Padding bottom
    for (let i = 0; i < padding; i++) {
        result += emptyLine + '\n';
    }

    // Bottom border
    result += borderColor(style === 'double' ? '╚' : BOX.bottomLeft) + borderColor(hChar.repeat(innerWidth)) + borderColor(style === 'double' ? '╝' : BOX.bottomRight);

    return result;
};

export const header = () => {
    console.log();
    console.log(colors.dim('  ┌─────────────────────────────────────┐'));
    console.log(colors.dim('  │') + colors.primary('  K N O W T I F                       ') + colors.dim('│'));
    console.log(colors.dim('  │') + colors.muted('  GitHub Notifications Made Simple    ') + colors.dim('│'));
    console.log(colors.dim('  └─────────────────────────────────────┘'));
    console.log();
};

export const divider = (width = 50, style: 'light' | 'heavy' = 'light') => {
    const char = style === 'heavy' ? '═' : '─';
    console.log(colors.dim('  ' + char.repeat(width)));
};

export const statusBadge = (enabled: boolean, label: string) => {
    if (enabled) {
        return `${colors.success('+')} ${colors.text(label)}`;
    }
    return `${colors.dim('-')} ${colors.muted(label)}`;
};

export const menuItem = (key: string, label: string, description?: string) => {
    const keyPart = colors.primary(`[${key}]`);
    const labelPart = colors.text(label);
    if (description) {
        return `  ${keyPart} ${labelPart} ${colors.muted('- ' + description)}`;
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
    const frames = ['|', '/', '-', '\\'];
    let i = 0;

    const interval = setInterval(() => {
        process.stdout.write(`\r  ${colors.primary(frames[i])} ${colors.muted(message)}`);
        i = (i + 1) % frames.length;
    }, 100);

    try {
        const result = await fn();
        clearInterval(interval);
        process.stdout.write(`\r  ${icons.check} ${colors.success(message)}          \n`);
        return result;
    } catch (err) {
        clearInterval(interval);
        process.stdout.write(`\r  ${icons.cross} ${colors.error(message)}          \n`);
        throw err;
    }
};

export const table = (data: { label: string; value: string; status?: boolean }[]) => {
    const maxLabel = Math.max(...data.map(d => d.label.length));

    for (const row of data) {
        const label = colors.muted(row.label.padEnd(maxLabel));
        const status = row.status !== undefined
            ? (row.status ? colors.success(' +') : colors.error(' -'))
            : '';
        console.log(`  ${label}  ${colors.text(row.value)}${status}`);
    }
};

export const progress = (current: number, total: number, width = 30): string => {
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar = colors.primary('#'.repeat(filled)) + colors.dim('.'.repeat(empty));
    const pct = Math.round((current / total) * 100);
    return `[${bar}] ${colors.muted(pct + '%')}`;
};

export const keyValue = (key: string, value: string, keyWidth = 15): string => {
    return `  ${colors.muted(key.padEnd(keyWidth))} ${colors.text(value)}`;
};

export const section = (title: string) => {
    console.log();
    console.log(colors.bright.bold(`  ${title}`));
    console.log(colors.dim('  ' + '─'.repeat(title.length + 2)));
};

export const list = (items: string[], prefix?: string) => {
    for (const item of items) {
        console.log(`  ${prefix || colors.dim('*')} ${colors.text(item)}`);
    }
};

export const clear = () => {
    console.clear();
};
