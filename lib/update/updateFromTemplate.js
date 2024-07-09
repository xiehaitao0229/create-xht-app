"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const updater_1 = __importDefault(require("./updater"));
const logger_1 = __importDefault(require("../common/logger"));
async function updateFromTemplate() {
    updater_1.default.preCheck();
    updater_1.default.init();
    if (updater_1.default.isNewest()) {
        logger_1.default.green('当前代码已经是最新代码');
        process.exit(0);
    }
    await updater_1.default.makeRepoByOrigin(updater_1.default.branchNames.base, undefined, updater_1.default.ktConfig, 'build: 基础仓储');
    await updater_1.default.makeNewInitRepo('build: 新模板初始化后的仓储');
    const commitHash = updater_1.default.makeCurrentRepo('build: 最新代码');
    updater_1.default.merge(updater_1.default.branchNames.newInit, updater_1.default.branchNames.current);
    const isConflict = updater_1.default.handleConflicts('updateFromTemplate');
    updater_1.default.copyOrDeleteDiffFiles(commitHash);
    logger_1.default.green(`已经根据模板更新完毕！${isConflict ? '请解决冲突。' : ''}`);
    updater_1.default.clearCache();
}
exports.default = updateFromTemplate;
