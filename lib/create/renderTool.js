"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const glob_1 = __importDefault(require("glob"));
const shelljs_1 = __importDefault(require("shelljs"));
const path_1 = require("path");
const mustache_1 = __importDefault(require("mustache"));
const commandUtils_1 = __importDefault(require("../common/commandUtils"));
const constants_1 = require("../common/constants");
const logger_1 = __importDefault(require("../common/logger"));
const gitUtils_1 = require("../common/gitUtils");
class RenderTool {
    constructor(renderData, target) {
        this.renderConfig = {};
        this.fileArray = [];
        this.utils = new commandUtils_1.default();
        this.renderData = renderData;
        this.target = target;
        this.init();
    }
    init() {
        const configs = this.renderData.initOptions;
        configs.forEach((item) => {
            if (!item || (this.renderData.data[constants_1.isTemplateKey] && !item.replaceInTemplate) || !item.globPatterns)
                return;
            const globPatterns = typeof item.globPatterns === 'string' ? [item.globPatterns] : item.globPatterns;
            const files = globPatterns.reduce((acc, pattern) => acc.concat(glob_1.default.sync(pattern, Object.assign({
                cwd: path_1.resolve(constants_1.GIT_CACHE_BASE_URL, this.renderData.source),
            }, item.globOpts || {}))), []);
            files.forEach((file) => {
                this.fileArray.includes(file) || this.fileArray.push(file);
                const configItem = this.renderConfig[file] || {};
                configItem.data = configItem.data || {};
                const name = item.prompt.name;
                configItem.data[name] = this.renderData.data[name];
                if (item.replacePattern) {
                    configItem.replaces = configItem.replaces || [];
                    configItem.replaces.push({
                        key: name,
                        pattern: item.replacePattern,
                        template: item.replaceTemplate || '',
                    });
                }
                this.renderConfig[file] = configItem;
            });
        });
        if (!this.target) {
            this.target = this.renderData.data[`${constants_1.INJECT_PROMPTS_PREFIX}renderHere`]
                ? commandUtils_1.default.originCwd
                : path_1.resolve(commandUtils_1.default.originCwd, this.renderData.data.projectName);
        }
        this.utils = new commandUtils_1.default({ baseUrl: this.target });
    }
    copy() {
        this.utils.exist('./') || shelljs_1.default.mkdir(this.target);
        shelljs_1.default.cd(constants_1.GIT_CACHE_BASE_URL);
        shelljs_1.default.rm('-rf', constants_1.TEMP_DIR);
        shelljs_1.default.mkdir(constants_1.TEMP_DIR);
        shelljs_1.default.cp('-r', `${this.renderData.source}/.`, `${constants_1.TEMP_DIR}/`);
        shelljs_1.default.rm('-rf', `${constants_1.TEMP_DIR}/.git`);
        shelljs_1.default.cp('-r', `${constants_1.TEMP_DIR}/.`, `${this.target}/`);
        shelljs_1.default.rm('-rf', constants_1.TEMP_DIR);
    }
    getMustacheValueNames(str) {
        const matches = str.match(/{{([^}]+)}}/g);
        if (!matches)
            return null;
        const names = [];
        matches.forEach((m) => {
            const name = (m.match(/{{(?:[#|^|/]?)(?:\s*)(\S+)(?:\s*)}}/) || [])[1] || '';
            if (!name && names.includes(name))
                return;
            names.push(name);
        });
        return names && names.length ? names : null;
    }
    mustacheRenderLineByLine(fileContent, data) {
        return fileContent
            .split('\n')
            .map((line) => {
            const names = this.getMustacheValueNames(line);
            const allMatch = names === null || names === void 0 ? void 0 : names.every((name) => data[name] !== undefined);
            return allMatch ? mustache_1.default.render(line, data) : line;
        })
            .join('\n');
    }
    mustacheSafeRender(fileContent, data) {
        ;
        [...fileContent.matchAll(/{{(?:[#|^|/]?)(?:\s*)(\S+)(?:\s*)}}/g)]
            .filter((matchContent) => data[matchContent[1]] === undefined)
            .forEach((matchContent) => {
            fileContent = fileContent.replace(matchContent[0], matchContent[0].replace(/\{/g, constants_1.LEFT_REPLACEMENT).replace(/\}/g, constants_1.RIGHT_REPLACEMENT));
        });
        return mustache_1.default.render(fileContent, data)
            .replace(new RegExp(constants_1.LEFT_REPLACEMENT, 'g'), '{')
            .replace(new RegExp(constants_1.RIGHT_REPLACEMENT, 'g'), '}');
    }
    replace(configItem, fileContent) {
        if (!configItem.replaces || !configItem.replaces.length)
            return fileContent;
        configItem.replaces.forEach((r) => {
            const rawValue = (configItem.data || {})[r.key];
            if (rawValue === undefined)
                return;
            const value = r.template ? mustache_1.default.render(r.template, this.renderData.data) : rawValue;
            fileContent = fileContent.replace(new RegExp(r.pattern, 'g'), value);
        });
        return fileContent;
    }
    renderFiles() {
        this.fileArray.forEach((file) => {
            if (file === constants_1.TEMPLATE_CONFIG_FILE_NAME)
                return null;
            const configItem = this.renderConfig[file] || {};
            let fileContent = this.utils.readFileSync(file);
            fileContent = this.replace(configItem, fileContent);
            fileContent = this.mustacheSafeRender(fileContent, configItem.data);
            this.utils.writeFileSync(file, fileContent);
        });
    }
    setInitOptions(templateConfig) {
        var _a;
        if (!templateConfig)
            return templateConfig;
        if (!this.renderData.data[constants_1.isTemplateKey]) {
            delete templateConfig.initOptions;
            return templateConfig;
        }
        const configItem = this.renderConfig[constants_1.TEMPLATE_CONFIG_FILE_NAME] || {};
        const replacedFileContent = this.replace(configItem, JSON.stringify(templateConfig, null, 2));
        const initOptions = (_a = JSON.parse(replacedFileContent).initOptions) === null || _a === void 0 ? void 0 : _a.map((opt) => {
            if (!(opt === null || opt === void 0 ? void 0 : opt.replaceInTemplate))
                return opt;
            const ret = JSON.parse(this.mustacheRenderLineByLine(JSON.stringify(opt, null, 2), configItem.data));
            return ret;
        });
        return { initOptions };
    }
    setOrigin(templateConfig) {
        if (!templateConfig)
            return templateConfig;
        templateConfig.origin = {
            git: gitUtils_1.gitCacheUtils
                .getTmpTemplate()
                .find((item) => item.name === this.renderData.source).repository,
            commit: this.renderData.commit,
        };
        return templateConfig;
    }
    setIsTemplate(templateConfig) {
        if (!templateConfig)
            return templateConfig;
        templateConfig.isTemplate = this.renderData.data[constants_1.isTemplateKey];
        return templateConfig;
    }
    setInitedOptions(templateConfig) {
        if (!templateConfig)
            return templateConfig;
        templateConfig.initedOptions = {};
        Object.keys(this.renderData.data).forEach((key) => {
            if (key.startsWith(constants_1.INJECT_PROMPTS_PREFIX))
                return;
            templateConfig.initedOptions[key] = this.renderData.data[key];
        });
        return templateConfig;
    }
    renderTemplateConfig() {
        const methods = ['setInitOptions', 'setOrigin', 'setIsTemplate', 'setInitedOptions'];
        const templateConfig = methods.reduce((acc, curMethodKey) => {
            return this[curMethodKey](acc);
        }, this.renderData.templateConfig);
        this.utils.writeFileSync(constants_1.TEMPLATE_CONFIG_FILE_NAME, JSON.stringify(templateConfig, null, 2));
    }
    render() {
        this.copy();
        logger_1.default.green('copy done');
        this.renderFiles();
        logger_1.default.green('renderFiles done');
        this.renderTemplateConfig();
        logger_1.default.green('renderTemplateConfig done');
    }
}
exports.default = RenderTool;
