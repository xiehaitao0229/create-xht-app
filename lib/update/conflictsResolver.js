"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../common/logger"));
class ConflictResolvers {
    constructor(gitCacheUtils) {
        this.reInstallWhenConfict = (conflictFilenames) => {
            const installCmdMap = {
                'pnpm-lock.yaml': 'pnpm i',
                'yarn.lock': 'yarn',
                'package-lock.json': 'npm i',
            };
            if (conflictFilenames.includes('package.json')) {
                const conflictLock = Object.keys(installCmdMap).find((_) => conflictFilenames.includes(_));
                if (conflictLock) {
                    logger_1.default.red(`无法重新安装以解决 ${conflictLock} 的冲突，原因是 package.json 本身有冲突`);
                    logger_1.default.red(`请解决完 package.json 的冲突后，执行 ${installCmdMap[conflictLock]} 以解决 ${conflictLock} 的冲突`);
                }
                return conflictFilenames;
            }
            return conflictFilenames.filter((_) => {
                if (!installCmdMap[_])
                    return true;
                logger_1.default(`正在重新安装以解决 ${_} 中的冲突...`);
                this.gitCacheUtils.exec(`rm ${_}`);
                this.gitCacheUtils.exec(installCmdMap[_]);
                return false;
            });
        };
        this.removeEmptyConflict = (conflictFilenames) => conflictFilenames.filter((_) => {
            const lines = this.gitCacheUtils.readFileSync(_).split('\n');
            let i = 0;
            let isConflict = false;
            let needResolve = false;
            while (i < lines.length) {
                if (lines[i] !== '<<<<<<< HEAD') {
                    i += 1;
                    continue;
                }
                const start = i;
                let mid = -1;
                let end = -1;
                let j = i;
                while (j < lines.length) {
                    j += 1;
                    const trimStr = lines[j].trim();
                    if (trimStr === '=======') {
                        mid = j;
                        continue;
                    }
                    if (trimStr.startsWith('>>>>>>> tmp_')) {
                        end = j;
                        break;
                    }
                    if (trimStr) {
                        break;
                    }
                }
                if (mid === -1 || end === -1) {
                    i += 1;
                    isConflict = true;
                    continue;
                }
                const deleteLines = Math.min(end - mid, mid - start);
                lines.splice(end, 1);
                lines.splice(mid, 1);
                lines.splice(start, deleteLines);
                needResolve = true;
            }
            if (needResolve) {
                logger_1.default(`正在自动解决 ${_} 中的空行冲突...`);
                this.gitCacheUtils.writeFileSync(_, lines.join('\n'));
            }
            return isConflict;
        });
        this.resolve = (conflictFilenames) => this.resolvers.reduce((acc, resolver) => (acc.length ? resolver(acc) : []), conflictFilenames);
        this.gitCacheUtils = gitCacheUtils;
        this.resolvers = [this.reInstallWhenConfict.bind(this), this.removeEmptyConflict.bind(this)];
    }
}
exports.default = ConflictResolvers;
