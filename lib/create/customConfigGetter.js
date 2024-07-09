"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const jsonfile_1 = __importDefault(require("jsonfile"));
const mustache_1 = __importDefault(require("mustache"));
const chalk_1 = __importDefault(require("chalk"));
const constants_1 = require("../common/constants");
const config_1 = require("../config");
const gitUtils_1 = require("../common/gitUtils");
const prompts_1 = __importDefault(require("./prompts"));
class CustomConfigGetter {
    static async run(options) {
        await CustomConfigGetter.getSource(options === null || options === void 0 ? void 0 : options.source);
        CustomConfigGetter.getCommit(options === null || options === void 0 ? void 0 : options.commit);
        CustomConfigGetter.getTemplateConfig(options === null || options === void 0 ? void 0 : options.templateConfig);
        CustomConfigGetter.completeInitOptions();
        await CustomConfigGetter.prompt({
            initedOptions: options === null || options === void 0 ? void 0 : options.initedOptions,
        });
        const result = {
            templateConfig: CustomConfigGetter.templateConfig,
            initOptions: CustomConfigGetter.initOptions,
            data: CustomConfigGetter.data,
            source: CustomConfigGetter.source,
            commit: CustomConfigGetter.commit,
        };
        return result;
    }
    static async getSource(source) {
        if (source) {
            CustomConfigGetter.source = source;
            return;
        }
        const choices = [
            ...config_1.templateList,
            {
                name: constants_1.CUSTOM_TEXT,
                description: '通过输入 git 地址来自定义模板仓储',
                repository: '',
            },
        ].map((item) => ({
            title: item.name,
            description: item.description,
            value: item.name,
        }));
        const response = await prompts_1.default({
            type: 'select',
            name: 'value',
            message: '选择一个仓储进行复制',
            choices,
            initial: 0,
        });
        if (response.value !== constants_1.CUSTOM_TEXT) {
            CustomConfigGetter.source = response.value;
            return;
        }
        let inputSource = { value: '' };
        while (!inputSource.value || !inputSource.value.endsWith('.git')) {
            inputSource = await prompts_1.default({
                type: 'text',
                name: 'value',
                message: '请输入以 `.git` 为结尾的，可用于 clone 的 git 地址',
                initial: '',
            });
        }
        CustomConfigGetter.source = gitUtils_1.gitCacheUtils.getRepoNameFromRepo(inputSource.value);
        gitUtils_1.gitCacheUtils.addTmpTemplate({
            name: CustomConfigGetter.source,
            repository: inputSource.value,
            description: '',
        });
    }
    static getCommit(commit) {
        if (commit) {
            CustomConfigGetter.commit = commit;
            return;
        }
        gitUtils_1.gitCacheUtils.init(CustomConfigGetter.source);
        gitUtils_1.gitCacheUtils.setUtils({
            baseUrl: path_1.resolve(constants_1.GIT_CACHE_BASE_URL, CustomConfigGetter.source),
        });
        CustomConfigGetter.commit = gitUtils_1.gitCacheUtils.lastCommitHash();
    }
    static getTemplateConfig(templateConfig) {
        CustomConfigGetter.templateConfig =
            templateConfig ||
                jsonfile_1.default.readFileSync(path_1.resolve(constants_1.GIT_CACHE_BASE_URL, CustomConfigGetter.source, constants_1.TEMPLATE_CONFIG_FILE_NAME));
    }
    static completeInitOptions() {
        CustomConfigGetter.initOptions = CustomConfigGetter.templateConfig.initOptions || [];
        CustomConfigGetter.initOptions = CustomConfigGetter.initOptions.map((item, index) => {
            if (index === 0 && (!item || item.prompt.name !== 'projectName')) {
                console.error('.ksconfig.json的第一个元素必须代表项目名，prompt.name必须为`projectName`');
            }
            if (!item || item.prompt.message)
                return item;
            const type = item.prompt.type;
            const actionMap = {
                confirm: '选择',
                toggle: '勾选',
                select: '选择',
                multiselect: '选择',
                autocomplete: '输入并选择',
                autocompleteMultiselect: '输入并选择',
                date: '选择',
            };
            const action = actionMap[type] || '输入';
            item.prompt.message = `请${action}${item.prompt.name}的值`;
            return item;
        });
    }
    static enhanceInitial(p) {
        if (typeof p.name !== 'string' || (p.initial !== undefined && p.initial !== ''))
            return p;
        if (p.name.toLocaleLowerCase().includes('repository')) {
            p.initial = gitUtils_1.curGitUtils.getRepoUrl();
            return p;
        }
        if (p.name === 'projectName') {
            p.initial = gitUtils_1.curGitUtils.getRepoNameFromRepo(gitUtils_1.curGitUtils.getRepoUrl());
            return p;
        }
        return p;
    }
    static async prompt({ initedOptions }) {
        const injectPrompts = [
            {
                type: 'toggle',
                name: `${constants_1.INJECT_PROMPTS_PREFIX}renderHere`,
                message: '是否在当前目录创建仓储',
                initial: true,
                active: 'yes',
                inactive: 'no',
            },
            {
                type: 'toggle',
                name: constants_1.isTemplateKey,
                message: '创建的是否是仓储模板',
                initial: false,
                active: 'yes',
                inactive: 'no',
            },
        ];
        if (injectPrompts.some((p) => !p.name.startsWith(constants_1.INJECT_PROMPTS_PREFIX))) {
            console.error(chalk_1.default.red(`公共插入的 prompt 的 name 应该以 ${constants_1.INJECT_PROMPTS_PREFIX} 开头`));
            process.exit(1);
        }
        CustomConfigGetter.data = await prompts_1.default(injectPrompts, initedOptions);
        for (let i = 0; i < CustomConfigGetter.initOptions.length; i += 1) {
            const item = CustomConfigGetter.initOptions[i];
            if (!item)
                continue;
            let p = item.prompt;
            if (!CustomConfigGetter.data[constants_1.isTemplateKey]) {
                p = CustomConfigGetter.enhanceInitial(p);
                if (typeof p.initial === 'string') {
                    p.initial = mustache_1.default.render(p.initial, CustomConfigGetter.data);
                }
            }
            if ((CustomConfigGetter.data[constants_1.isTemplateKey] && !item.replaceInTemplate) ||
                CustomConfigGetter.data[p.name] !== undefined)
                continue;
            const data = await prompts_1.default(p, initedOptions);
            CustomConfigGetter.data = Object.assign(Object.assign({}, CustomConfigGetter.data), data);
        }
    }
}
exports.default = CustomConfigGetter;
CustomConfigGetter.source = '';
CustomConfigGetter.commit = '';
CustomConfigGetter.initOptions = [];
