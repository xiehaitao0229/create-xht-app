"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.curGitUtils = exports.gitCacheUtils = exports.GitUtils = void 0;
const config_1 = require("../config");
const commandUtils_1 = __importDefault(require("./commandUtils"));
const constants_1 = require("./constants");
const logger_1 = __importDefault(require("./logger"));
class GitUtils extends commandUtils_1.default {
    constructor(opts) {
        super(opts);
        this.tmpTemplateList = [];
        this.tmpTemplateList = config_1.templateList;
    }
    clone(remoteUrl, dirname = '') {
        this.exec(`git clone ${remoteUrl} ${dirname}`);
        return dirname;
    }
    getRepoNameFromRepo(repo) {
        const tmpl = this.tmpTemplateList.find((_) => _.repository === repo);
        return tmpl
            ? tmpl.name
            : repo
                .split('/')
                .reverse()[0]
                .replace(/\.git$/, '');
    }
    cloneOrPull(remoteUrl, dirname = '') {
        const d = dirname ? dirname : this.getRepoNameFromRepo(remoteUrl);
        if (this.exist(d)) {
            logger_1.default(`仓储 ${d} 已经存在，尝试拉取...`);
            this.execSilently(`cd ${d} && git pull`);
            return d;
        }
        return this.clone(remoteUrl, d);
    }
    init(nameOrRepo) {
        this.exist('./') ||
            this.exec(`sudo mkdir ${constants_1.GIT_CACHE_BASE_URL} && sudo chmod -R 777 ${constants_1.GIT_CACHE_BASE_URL}`);
        const sourceInfo = this.tmpTemplateList.find((item) => item.name === nameOrRepo || item.repository == nameOrRepo);
        const list = sourceInfo === undefined ? this.tmpTemplateList : [sourceInfo];
        const ret = [];
        list.forEach((item) => {
            ret.push(this.cloneOrPull(item.repository, item.name));
        });
        return ret;
    }
    branch() {
        return this.execSilently('git symbolic-ref -q --short HEAD');
    }
    setUtils(opts) {
        this.reset(opts);
        return this;
    }
    checkoutNewBranch(branchName, checkoutFrom = 'origin/master') {
        logger_1.default(`切换临时分支：${branchName}...`);
        this.execSilently(`git checkout ${checkoutFrom} -b ${branchName}`);
        return this;
    }
    checkout(name) {
        this.exec(`git checkout ${name}`);
        return this;
    }
    isCommitHashExists(commitHash) {
        logger_1.default(`检验 commit hash ${commitHash} 是否存在...`);
        return !!this.execSilently(`git log | grep ${commitHash}`);
    }
    mergeCommitsToOne(commitHash, branchName) {
        try {
            logger_1.default(`合并未更新的模板仓储的所有 commit，提交信息为'merge: 模板仓储'...`);
            this.execSilently(`git reset --soft ${commitHash} && git commit -am 'merge: 模板仓储' && git push origin ${branchName}`);
            return this.lastCommitHash();
        }
        catch (e) {
            logger_1.default.red(e);
            return '';
        }
    }
    lastCommitHash() {
        return this.execSilently('git show -s --format=oneline').split(' ')[0];
    }
    addTarget(git) {
        if (this.exec('git remote get-url --all target') !== git && this.exec(`git remote add target ${git}`)) {
            return false;
        }
        this.exec('git fetch target');
        return true;
    }
    cherryPick(commitHash) {
        this.exec(`git cherry-pick ${commitHash}`);
        return this;
    }
    deleteBranch(branchName, type = 'all') {
        if (type === 'all' || type === 'local') {
            logger_1.default(`删除本地仓储 ${branchName}`);
            this.execSilently(`git branch -D ${branchName}`);
        }
        if (type === 'all' || type === 'remote') {
            logger_1.default(`删除远程仓储 ${branchName}`);
            this.execSilently(`git push origin --delete ${branchName}`);
        }
        return this;
    }
    getRepoUrl() {
        return this.execSilently('git remote -v | grep fetch').replace('origin', '').split(' ')[0].trim();
    }
    commit(message) {
        this.execSilently(`git add . && git commit -am "${message}"`);
        return this;
    }
    merge(branch) {
        return this.execSilently(`git merge ${branch}`);
    }
    getConflictFilenames() {
        const mergeMsgFilename = '.git/MERGE_MSG';
        if (!this.exist(mergeMsgFilename))
            return null;
        const mergeMsg = this.execSilently(`cat ${mergeMsgFilename}`);
        if (!mergeMsg.includes('# Conflicts:'))
            return null;
        let conflictsDone = false;
        return mergeMsg
            .split('# Conflicts:')[1]
            .split('\n')
            .filter((_) => {
            if (conflictsDone)
                return false;
            if (!_.includes(' '))
                return true;
            conflictsDone = true;
            return false;
        })
            .map((_) => _.split(/\s/).find((item) => item !== '#' && item))
            .filter((_) => _);
    }
    getDiffFilesInfo(commitHash) {
        return this.execSilently(`git diff ${commitHash} --name-status`)
            .split('\n')
            .filter((_) => _)
            .map((_) => {
            const mode = _[0];
            const filename = _.slice(1).trim();
            return { mode, filename };
        });
    }
    addTmpTemplate(item) {
        this.tmpTemplateList.push(item);
    }
    getTmpTemplate() {
        return JSON.parse(JSON.stringify(this.tmpTemplateList));
    }
}
exports.GitUtils = GitUtils;
exports.gitCacheUtils = new GitUtils();
exports.curGitUtils = new GitUtils({
    baseUrl: process.cwd(),
});
