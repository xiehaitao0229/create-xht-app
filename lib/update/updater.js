"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const jsonfile_1 = __importDefault(require("jsonfile"));
const shelljs_1 = __importDefault(require("shelljs"));
const constants_1 = require("../common/constants");
const gitUtils_1 = require("../common/gitUtils");
const renderTool_1 = __importDefault(require("../create/renderTool"));
const customConfigGetter_1 = __importDefault(require("../create/customConfigGetter"));
const decorators_1 = require("../common/decorators");
const logger_1 = __importDefault(require("../common/logger"));
const conflictsResolver_1 = __importDefault(require("./conflictsResolver"));
const config_1 = require("../config");
const timeStamp = Date.now();
class Updater {
    constructor() {
        this.cwd = process.cwd();
        this.branchNames = {
            base: `tmp_${timeStamp}_base`,
            newInit: `tmp_${timeStamp}_newInit`,
            current: `tmp_${timeStamp}_current`,
        };
    }
    preventMain() {
        return gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.cwd }).branch() === constants_1.MAIN_BRANCH;
    }
    isWrongDir() {
        return !gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.cwd }).exist(constants_1.TEMPLATE_CONFIG_FILE_NAME);
    }
    preCheck() {
        if (this.preventMain()) {
            logger_1.default.red(`禁止在 ${constants_1.MAIN_BRANCH} 分支上执行更新操作！`);
            process.exit(1);
        }
        if (this.isWrongDir()) {
            logger_1.default.red('必须在由 @qfe/create-qfe-app 生成的仓储根目录下执行');
            process.exit(1);
        }
    }
    isNewest() {
        var _a, _b;
        const tmlCommitHash = gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.templateAbsDirInCache }).lastCommitHash();
        return ((_b = (_a = this.ktConfig) === null || _a === void 0 ? void 0 : _a.origin) === null || _b === void 0 ? void 0 : _b.commit) === tmlCommitHash;
    }
    init() {
        var _a, _b, _c, _d;
        this.curRepo = gitUtils_1.curGitUtils.getRepoUrl();
        this.curRepoName = gitUtils_1.curGitUtils.getRepoNameFromRepo(this.curRepo);
        this.curRepoTmpName = `${this.curRepoName}_tmp`;
        this.curRepoAbsDirInCache = path_1.resolve(constants_1.GIT_CACHE_BASE_URL, this.curRepoName);
        this.ktConfigNewest = jsonfile_1.default.readFileSync(path_1.resolve(this.cwd, constants_1.TEMPLATE_CONFIG_FILE_NAME));
        gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.cwd }).checkout('.');
        this.ktConfig = jsonfile_1.default.readFileSync(path_1.resolve(this.cwd, constants_1.TEMPLATE_CONFIG_FILE_NAME));
        const gitRepo = (_b = (_a = this.ktConfig) === null || _a === void 0 ? void 0 : _a.origin) === null || _b === void 0 ? void 0 : _b.git;
        this.templateAbsDirInCache = path_1.resolve(constants_1.GIT_CACHE_BASE_URL, gitUtils_1.curGitUtils.getRepoNameFromRepo(gitRepo));
        if (!config_1.templateList.some((_) => _.repository === gitRepo)) {
            gitUtils_1.curGitUtils.addTmpTemplate({
                name: gitUtils_1.curGitUtils.getRepoNameFromRepo(gitRepo),
                repository: gitRepo,
                description: '',
            });
        }
        gitUtils_1.gitCacheUtils.setUtils({ baseUrl: constants_1.GIT_CACHE_BASE_URL }).init(gitRepo);
        this.ktConfigTemplateNewest = jsonfile_1.default.readFileSync(path_1.resolve(this.templateAbsDirInCache, constants_1.TEMPLATE_CONFIG_FILE_NAME));
        gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.templateAbsDirInCache });
        this.commitTemplateNewest = gitUtils_1.gitCacheUtils.lastCommitHash();
        gitUtils_1.gitCacheUtils.checkout((_d = (_c = this.ktConfigNewest) === null || _c === void 0 ? void 0 : _c.origin) === null || _d === void 0 ? void 0 : _d.commit);
        this.ktConfigTemplateOrigin = jsonfile_1.default.readFileSync(path_1.resolve(this.templateAbsDirInCache, constants_1.TEMPLATE_CONFIG_FILE_NAME));
        gitUtils_1.gitCacheUtils.checkout(constants_1.MAIN_BRANCH);
    }
    makeEmptyRepo(branchName, checkoutFrom) {
        const curRepoName = this.curRepoName;
        const tmpDir = this.curRepoTmpName;
        gitUtils_1.gitCacheUtils.setUtils({ baseUrl: constants_1.GIT_CACHE_BASE_URL });
        if (gitUtils_1.gitCacheUtils.exist(curRepoName)) {
            shelljs_1.default.cd(constants_1.GIT_CACHE_BASE_URL);
            shelljs_1.default.mv(curRepoName, tmpDir);
        }
        else {
            gitUtils_1.gitCacheUtils.clone(this.curRepo, tmpDir);
        }
        gitUtils_1.gitCacheUtils
            .setUtils({
            baseUrl: path_1.resolve(constants_1.GIT_CACHE_BASE_URL, tmpDir),
        })
            .checkoutNewBranch(branchName, checkoutFrom);
        shelljs_1.default.cd(constants_1.GIT_CACHE_BASE_URL);
        shelljs_1.default.mkdir(curRepoName);
        shelljs_1.default.mv(`${tmpDir}/.git`, `${curRepoName}/.git`);
        shelljs_1.default.rm('-rf', tmpDir);
    }
    async makeRunResult(ktConfig, rewriteInitedOptions) {
        var _a, _b;
        return await customConfigGetter_1.default.run({
            source: gitUtils_1.curGitUtils.getRepoNameFromRepo((_a = ktConfig.origin) === null || _a === void 0 ? void 0 : _a.git),
            commit: (_b = ktConfig.origin) === null || _b === void 0 ? void 0 : _b.commit,
            templateConfig: ktConfig,
            initedOptions: Object.assign(Object.assign({ [`${constants_1.INJECT_PROMPTS_PREFIX}isTemplate`]: ktConfig.isTemplate || false, [`${constants_1.INJECT_PROMPTS_PREFIX}renderHere`]: true }, ktConfig.initedOptions), rewriteInitedOptions),
        });
    }
    async makeRepoByOrigin(emptyBranch, emptyBranchBase, ktConfig, commitMsg) {
        this.makeEmptyRepo(emptyBranch, emptyBranchBase);
        const ktConfigTemplate = this.ktConfigTemplateOrigin;
        const renderData = await this.makeRunResult({
            initOptions: ktConfigTemplate.initOptions,
            origin: ktConfig.origin,
            isTemplate: ktConfig.isTemplate,
            initedOptions: Object.assign(Object.assign({}, ktConfigTemplate.initedOptions), ktConfig.initedOptions),
        });
        const branch = gitUtils_1.gitCacheUtils
            .setUtils({
            baseUrl: this.templateAbsDirInCache,
        })
            .branch();
        gitUtils_1.gitCacheUtils.checkout(renderData.commit);
        const renderTool = new renderTool_1.default(renderData, this.curRepoAbsDirInCache);
        renderTool.render();
        gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.curRepoAbsDirInCache }).commit(commitMsg);
        gitUtils_1.gitCacheUtils
            .setUtils({
            baseUrl: this.templateAbsDirInCache,
        })
            .checkout(branch);
    }
    async makeNewInitRepo(commitMsg) {
        var _a, _b, _c, _d;
        this.makeEmptyRepo(this.branchNames.newInit, this.branchNames.base);
        const ktConfigTemplate = this.ktConfigTemplateNewest;
        const renderData = await this.makeRunResult({
            initOptions: ktConfigTemplate.initOptions,
            origin: {
                git: (_b = (_a = this.ktConfigNewest) === null || _a === void 0 ? void 0 : _a.origin) === null || _b === void 0 ? void 0 : _b.git,
                commit: this.commitTemplateNewest,
            },
            isTemplate: (_c = this.ktConfigNewest) === null || _c === void 0 ? void 0 : _c.isTemplate,
            initedOptions: ktConfigTemplate.initedOptions,
        }, (_d = this.ktConfigNewest) === null || _d === void 0 ? void 0 : _d.initedOptions);
        const renderTool = new renderTool_1.default(renderData, this.curRepoAbsDirInCache);
        renderTool.render();
        gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.curRepoAbsDirInCache }).commit(commitMsg);
    }
    makeCurrentRepo(commitMsg) {
        this.makeEmptyRepo(this.branchNames.current, this.branchNames.base);
        shelljs_1.default.cd(constants_1.GIT_CACHE_BASE_URL);
        shelljs_1.default.mv(this.curRepoName, `${this.curRepoTmpName}`);
        gitUtils_1.gitCacheUtils
            .setUtils({
            baseUrl: constants_1.GIT_CACHE_BASE_URL,
        })
            .clone(this.curRepo);
        shelljs_1.default.rm('-rf', `${this.curRepoName}/.git`);
        shelljs_1.default.mv(`${this.curRepoTmpName}/.git`, `${this.curRepoName}/.git`);
        shelljs_1.default.rm('-rf', `${this.curRepoTmpName}`);
        gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.curRepoAbsDirInCache }).commit(commitMsg);
        return gitUtils_1.gitCacheUtils.lastCommitHash();
    }
    merge(sourceBranch, targetBranch) {
        gitUtils_1.gitCacheUtils.setUtils({ baseUrl: this.curRepoAbsDirInCache }).checkout(targetBranch).merge(sourceBranch);
    }
    handleConflicts(infoStr) {
        const conflictResolvers = new conflictsResolver_1.default(gitUtils_1.gitCacheUtils);
        const conflictFilenames = conflictResolvers.resolve(gitUtils_1.gitCacheUtils
            .setUtils({
            baseUrl: this.curRepoAbsDirInCache,
        })
            .getConflictFilenames() || []);
        if (!conflictFilenames.length) {
            return false;
        }
        logger_1.default.red('存在冲突文件：');
        conflictFilenames.forEach((_) => {
            logger_1.default.red(`# ${_}`);
            gitUtils_1.gitCacheUtils.writeFileSync(_, gitUtils_1.gitCacheUtils.readFileSync(_).replace(new RegExp(this.branchNames.newInit, 'g'), infoStr));
        });
        return true;
    }
    copyOrDeleteDiffFiles(commitHash) {
        gitUtils_1.gitCacheUtils
            .setUtils({
            baseUrl: this.curRepoAbsDirInCache,
        })
            .getDiffFilesInfo(commitHash)
            .forEach((_) => {
            const { filename, mode } = _;
            if (mode !== 'D') {
                if (!gitUtils_1.gitCacheUtils.exist(filename))
                    return;
                const target = path_1.resolve(this.cwd, filename);
                const targetDir = target.split('/').slice(0, -1).join('/');
                shelljs_1.default.mkdir('-p', targetDir);
                shelljs_1.default.cp(path_1.resolve(this.curRepoAbsDirInCache, filename), target);
                return;
            }
            shelljs_1.default.rm(path_1.resolve(this.cwd, filename));
        });
    }
    clearCache() {
        shelljs_1.default.cd(constants_1.GIT_CACHE_BASE_URL);
        shelljs_1.default.rm('-rf', this.curRepoName);
    }
}
__decorate([
    decorators_1.safeShell
], Updater.prototype, "makeEmptyRepo", null);
__decorate([
    decorators_1.safeShell
], Updater.prototype, "makeCurrentRepo", null);
__decorate([
    decorators_1.safeShell
], Updater.prototype, "clearCache", null);
exports.default = new Updater();
