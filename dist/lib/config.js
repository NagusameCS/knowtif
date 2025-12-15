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
exports.getEnabledDestinations = exports.hasDestinations = exports.saveConfig = exports.getConfig = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const conf_1 = __importDefault(require("conf"));
const defaultConfig = {
    events: ['push', 'workflow_run'],
    branches: ['main', 'master'],
    installed: false,
};
// Local config store
const store = new conf_1.default({
    projectName: 'knowtif',
    defaults: defaultConfig,
});
// Project-level config file
const getProjectConfigPath = () => path.join(process.cwd(), '.knowtif.json');
const getConfig = () => {
    // First check for project-level config
    const projectPath = getProjectConfigPath();
    if (fs.existsSync(projectPath)) {
        try {
            const content = fs.readFileSync(projectPath, 'utf-8');
            return { ...defaultConfig, ...JSON.parse(content) };
        }
        catch {
            // Fall through to global config
        }
    }
    return store.store;
};
exports.getConfig = getConfig;
const saveConfig = (config, projectLevel = true) => {
    const current = (0, exports.getConfig)();
    const updated = { ...current, ...config };
    if (projectLevel) {
        const projectPath = getProjectConfigPath();
        fs.writeFileSync(projectPath, JSON.stringify(updated, null, 2));
    }
    else {
        store.store = updated;
    }
    return updated;
};
exports.saveConfig = saveConfig;
const hasDestinations = (config) => {
    return !!((config.discord?.enabled && config.discord.webhook) ||
        (config.pushover?.enabled && config.pushover.user && config.pushover.token) ||
        (config.ntfy?.enabled && config.ntfy.topic) ||
        (config.email?.enabled && config.email.host) ||
        (config.webhook?.enabled && config.webhook.url));
};
exports.hasDestinations = hasDestinations;
const getEnabledDestinations = (config) => {
    const destinations = [];
    if (config.discord?.enabled)
        destinations.push('Discord');
    if (config.pushover?.enabled)
        destinations.push('Pushover');
    if (config.ntfy?.enabled)
        destinations.push('ntfy.sh');
    if (config.email?.enabled)
        destinations.push('Email');
    if (config.webhook?.enabled)
        destinations.push('Webhook');
    return destinations;
};
exports.getEnabledDestinations = getEnabledDestinations;
