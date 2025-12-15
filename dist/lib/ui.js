"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clear = exports.table = exports.spinner = exports.warn = exports.info = exports.error = exports.success = exports.menuItem = exports.statusBadge = exports.divider = exports.header = exports.box = exports.icons = exports.colors = void 0;
const chalk_1 = __importDefault(require("chalk"));
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
exports.colors = {
    primary: chalk_1.default.hex('#7C3AED'), // Purple
    secondary: chalk_1.default.hex('#06B6D4'), // Cyan
    success: chalk_1.default.hex('#10B981'), // Green
    warning: chalk_1.default.hex('#F59E0B'), // Orange
    error: chalk_1.default.hex('#EF4444'), // Red
    muted: chalk_1.default.hex('#6B7280'), // Gray
    text: chalk_1.default.hex('#F3F4F6'), // Light gray
};
// Icons
exports.icons = {
    check: exports.colors.success('✓'),
    cross: exports.colors.error('✗'),
    arrow: exports.colors.primary('→'),
    bullet: exports.colors.muted('•'),
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
const box = (content, options = {}) => {
    const { title, width = 60, padding = 1, borderColor = exports.colors.primary } = options;
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
        result += borderColor(BOX.horizontal.repeat(left)) + exports.colors.text.bold(titlePadded) + borderColor(BOX.horizontal.repeat(right));
    }
    else {
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
exports.box = box;
const header = () => {
    const logo = `
  ${exports.colors.primary('╦╔═')}${exports.colors.secondary('╔╗╔╔═╗╦ ╦╔╦╗╦╔═╗')}
  ${exports.colors.primary('╠╩╗')}${exports.colors.secondary('║║║║ ║║║║ ║ ║╠╣ ')}
  ${exports.colors.primary('╩ ╩')}${exports.colors.secondary('╝╚╝╚═╝╚╩╝ ╩ ╩╚  ')}
`;
    console.log(logo);
    console.log(exports.colors.muted('  GitHub Notifications Made Simple\n'));
};
exports.header = header;
const divider = (width = 50) => {
    console.log(exports.colors.muted('─'.repeat(width)));
};
exports.divider = divider;
const statusBadge = (enabled, label) => {
    if (enabled) {
        return `${exports.colors.success('●')} ${exports.colors.text(label)}`;
    }
    return `${exports.colors.muted('○')} ${exports.colors.muted(label)}`;
};
exports.statusBadge = statusBadge;
const menuItem = (key, label, description) => {
    const keyPart = exports.colors.primary(`[${key}]`);
    const labelPart = exports.colors.text(label);
    if (description) {
        return `  ${keyPart} ${labelPart} ${exports.colors.muted(`- ${description}`)}`;
    }
    return `  ${keyPart} ${labelPart}`;
};
exports.menuItem = menuItem;
const success = (message) => {
    console.log(`\n  ${exports.icons.check} ${exports.colors.success(message)}\n`);
};
exports.success = success;
const error = (message) => {
    console.log(`\n  ${exports.icons.cross} ${exports.colors.error(message)}\n`);
};
exports.error = error;
const info = (message) => {
    console.log(`  ${exports.icons.arrow} ${exports.colors.text(message)}`);
};
exports.info = info;
const warn = (message) => {
    console.log(`  ${exports.colors.warning('!')} ${exports.colors.warning(message)}`);
};
exports.warn = warn;
const spinner = async (message, fn) => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    const interval = setInterval(() => {
        process.stdout.write(`\r  ${exports.colors.primary(frames[i])} ${exports.colors.muted(message)}`);
        i = (i + 1) % frames.length;
    }, 80);
    try {
        const result = await fn();
        clearInterval(interval);
        process.stdout.write(`\r  ${exports.icons.check} ${exports.colors.success(message)}\n`);
        return result;
    }
    catch (err) {
        clearInterval(interval);
        process.stdout.write(`\r  ${exports.icons.cross} ${exports.colors.error(message)}\n`);
        throw err;
    }
};
exports.spinner = spinner;
const table = (data) => {
    const maxLabel = Math.max(...data.map(d => d.label.length));
    for (const row of data) {
        const label = exports.colors.muted(row.label.padEnd(maxLabel));
        const status = row.status !== undefined
            ? (row.status ? exports.colors.success(' ✓') : exports.colors.error(' ✗'))
            : '';
        console.log(`  ${label}  ${exports.colors.text(row.value)}${status}`);
    }
};
exports.table = table;
const clear = () => {
    console.clear();
};
exports.clear = clear;
