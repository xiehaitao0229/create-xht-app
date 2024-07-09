import { GitUtils } from '../common/gitUtils'
import logger from '../common/logger'

type Resolver = (conflictFilenames: string[]) => string[]

/**
 * 冲突解决工具，主要能解决以下冲突：
 * 1. lock 文件冲突；
 * 2. 冲突内容只有空行的冲突；
 */
class ConflictResolvers {
  private resolvers: Resolver[]

  private gitCacheUtils: GitUtils

  /**
   * 重新安装以解决冲突的 lock 文件。
   *
   * @private
   * @param {string[]} conflictFilenames - 冲突文件名的数组。
   * @return {string[]} - 排除掉 lock 文件后的冲突文件名的数组。
   */
  private reInstallWhenConfict: Resolver = (conflictFilenames) => {
    const installCmdMap: Record<string, string> = {
      'pnpm-lock.yaml': 'pnpm i',
      'yarn.lock': 'yarn',
      'package-lock.json': 'npm i',
    }
    if (conflictFilenames.includes('package.json')) {
      const conflictLock = Object.keys(installCmdMap).find((_) => conflictFilenames.includes(_))
      if (conflictLock) {
        logger.red(`无法重新安装以解决 ${conflictLock} 的冲突，原因是 package.json 本身有冲突`)
        logger.red(
          `请解决完 package.json 的冲突后，执行 ${installCmdMap[conflictLock]} 以解决 ${conflictLock} 的冲突`
        )
      }
      return conflictFilenames
    }
    return conflictFilenames.filter((_) => {
      if (!installCmdMap[_]) return true
      logger(`正在重新安装以解决 ${_} 中的冲突...`)
      this.gitCacheUtils.exec(`rm ${_}`)
      this.gitCacheUtils.exec(installCmdMap[_])
      return false
    })
  }

  /**
   * 解决冲突内容只有空行的冲突。
   *
   * @private
   * @param {string[]} conflictFilenames - 冲突文件名的数组。
   * @return {string[]} - 解决空行冲突后，剩余的冲突文件名的数组。
   */
  private removeEmptyConflict: Resolver = (conflictFilenames) =>
    conflictFilenames.filter((_) => {
      const lines = this.gitCacheUtils.readFileSync(_).split('\n')
      let i = 0
      let isConflict = false
      let needResolve = false
      while (i < lines.length) {
        if (lines[i] !== '<<<<<<< HEAD') {
          i += 1
          continue
        }
        const start = i
        let mid = -1
        let end = -1
        let j = i
        while (j < lines.length) {
          j += 1
          const trimStr = lines[j].trim()
          if (trimStr === '=======') {
            mid = j
            continue
          }
          if (trimStr.startsWith('>>>>>>> tmp_')) {
            end = j
            break
          }
          if (trimStr) {
            break
          }
        }
        if (mid === -1 || end === -1) {
          i += 1
          isConflict = true
          continue
        }
        const deleteLines = Math.min(end - mid, mid - start)
        lines.splice(end, 1)
        lines.splice(mid, 1)
        lines.splice(start, deleteLines)
        needResolve = true
      }
      if (needResolve) {
        logger(`正在自动解决 ${_} 中的空行冲突...`)
        this.gitCacheUtils.writeFileSync(_, lines.join('\n'))
      }
      return isConflict
    })

  constructor(gitCacheUtils: GitUtils) {
    this.gitCacheUtils = gitCacheUtils
    this.resolvers = [this.reInstallWhenConfict.bind(this), this.removeEmptyConflict.bind(this)]
  }

  /**
   * 自动解决冲突。
   *
   * @private
   * @param {string[]} conflictFilenames - 冲突文件名的数组。
   * @return {string[]} - 解决完能自动解决的冲突后，还有冲突的文件名数组。
   */
  public resolve: Resolver = (conflictFilenames) =>
    this.resolvers.reduce((acc, resolver) => (acc.length ? resolver(acc) : []), conflictFilenames)
}

export default ConflictResolvers
