import { templateList } from '../config'
import Utils from './commandUtils'
import { UtilsNewOpts, TemplateItem } from '../interfaces'
import { GIT_CACHE_BASE_URL } from './constants'
import logger from './logger'

export class GitUtils extends Utils {
  constructor(opts?: UtilsNewOpts) {
    super(opts)
    this.tmpTemplateList = templateList
  }

  private tmpTemplateList: Array<TemplateItem> = []

  /**
   * git clone
   *
   * @param {string} remoteUrl    仓储远程地址
   * @param {string} [dirname=''] 相对于baseUrl的路径
   * @returns {string}            仓储名
   * @memberof GitUtils
   */
  public clone(remoteUrl: string, dirname = ''): string {
    this.exec(`git clone ${remoteUrl} ${dirname}`)
    return dirname
  }

  /**
   * 从仓储 git 路径推出在 .gitCache 目录下的仓储名
   * 优先从配置中取
   *
   * @private
   * @param {string} repo 仓储 git 路径
   * @returns {string}
   * @memberof Updater
   */
  public getRepoNameFromRepo(repo: string): string {
    const tmpl = this.tmpTemplateList.find((_) => _.repository === repo)
    return tmpl
      ? tmpl.name
      : repo
          .split('/')
          .reverse()[0]
          .replace(/\.git$/, '')
  }

  /**
   * 仓储未clone则clone，clone了就到对应的目下执行git pull
   *
   * @private
   * @param {string} remoteUrl    仓储远程地址
   * @param {string} [dirname=''] 相对于baseUrl的路径
   * @returns {string}            仓储名
   * @memberof GitUtils
   */
  public cloneOrPull(remoteUrl: string, dirname = ''): string {
    const d = dirname ? dirname : this.getRepoNameFromRepo(remoteUrl)
    if (this.exist(d)) {
      logger(`仓储 ${d} 已经存在，尝试拉取...`)
      this.execSilently(`cd ${d} && git pull`)
      return d
    }
    return this.clone(remoteUrl, d)
  }

  /**
   * 初始化.gitCache
   *
   * @param {string} nameOrRepo 仓储远程名或仓储地址
   * @returns {Array<string>}   仓储名数组
   * @memberof GitUtils
   */
  public init(nameOrRepo: string): Array<string> {
    this.exist('./') ||
      this.exec(`sudo mkdir ${GIT_CACHE_BASE_URL} && sudo chmod -R 777 ${GIT_CACHE_BASE_URL}`)
    const sourceInfo: TemplateItem | undefined = this.tmpTemplateList.find(
      (item) => item.name === nameOrRepo || item.repository == nameOrRepo
    )
    const list = sourceInfo === undefined ? this.tmpTemplateList : [sourceInfo]
    const ret: Array<string> = []
    list.forEach((item) => {
      ret.push(this.cloneOrPull(item.repository, item.name))
    })
    return ret
  }

  /**
   * 获取当前分支
   *
   * @returns {string} 当前分支
   * @memberof GitUtils
   */
  public branch(): string {
    return this.execSilently('git symbolic-ref -q --short HEAD')
  }

  /**
   * 重置 utils 的参数
   *
   * @param {UtilsNewOpts} [opts] utils 参数
   * @memberof GitUtils
   */
  public setUtils(opts?: UtilsNewOpts): GitUtils {
    this.reset(opts)
    return this
  }

  /**
   * 切新分支
   *
   * @param {string} branchName
   * @memberof GitUtils
   */
  public checkoutNewBranch(branchName: string, checkoutFrom = 'origin/master'): GitUtils {
    logger(`切换临时分支：${branchName}...`)
    this.execSilently(`git checkout ${checkoutFrom} -b ${branchName}`)
    return this
  }

  /**
   * 切分支、commit
   *
   * @param {string} name
   * @memberof GitUtils
   */
  public checkout(name: string): GitUtils {
    this.exec(`git checkout ${name}`)
    return this
  }

  /**
   * 检查 commit 是否存在
   *
   * @param {string} commitHash
   * @returns {boolean}         是否存在
   * @memberof GitUtils
   */
  public isCommitHashExists(commitHash: string): boolean {
    logger(`检验 commit hash ${commitHash} 是否存在...`)
    return !!this.execSilently(`git log | grep ${commitHash}`)
  }

  /**
   * 合并某个 commit 之后的所有 commit 并提交、推远程
   *
   * @param {string} commitHash
   * @param {string} branchName
   * @returns {string}         是否成功
   * @memberof GitUtils
   *
   * FIXME: 这里判断是否成功应该不够严谨
   */
  public mergeCommitsToOne(commitHash: string, branchName: string): string {
    try {
      logger(`合并未更新的模板仓储的所有 commit，提交信息为'merge: 模板仓储'...`)
      this.execSilently(
        `git reset --soft ${commitHash} && git commit -am 'merge: 模板仓储' && git push origin ${branchName}`
      )
      return this.lastCommitHash()
    } catch (e) {
      logger.red(e)
      return ''
    }
  }

  /**
   * 获取最后一个 commitHash
   *
   * @returns {string}
   * @memberof GitUtils
   */
  public lastCommitHash(): string {
    return this.execSilently('git show -s --format=oneline').split(' ')[0]
  }

  /**
   * 添加远程目标
   *
   * @param {*} git     git 仓储地址
   * @memberof GitUtils
   * @returns {boolean} 是否成功
   *
   * FIXME: 这里判断是否成功应该不够严谨，只针对了重复设置目标的情况
   */
  public addTarget(git: string): boolean {
    if (this.exec('git remote get-url --all target') !== git && this.exec(`git remote add target ${git}`)) {
      return false
    }
    this.exec('git fetch target')
    return true
  }

  /**
   * cherry pick
   *
   * @param {string} commitHash
   * @memberof GitUtils
   */
  public cherryPick(commitHash: string): GitUtils {
    this.exec(`git cherry-pick ${commitHash}`)
    return this
  }

  /**
   * 删除分支
   *
   * @param {string} branchName   分支名
   * @param {string} [type='all'] 删除类型，local：本地；remote：远程；all：本地 + 远程
   * @memberof GitUtils
   */
  public deleteBranch(branchName: string, type = 'all'): GitUtils {
    if (type === 'all' || type === 'local') {
      logger(`删除本地仓储 ${branchName}`)
      this.execSilently(`git branch -D ${branchName}`)
    }
    if (type === 'all' || type === 'remote') {
      logger(`删除远程仓储 ${branchName}`)
      this.execSilently(`git push origin --delete ${branchName}`)
    }
    return this
  }

  /**
   * 获取当前仓储的 git 地址
   *
   * @returns {string}
   * @memberof GitUtils
   */
  public getRepoUrl(): string {
    return this.execSilently('git remote -v | grep fetch').replace('origin', '').split(' ')[0].trim()
  }

  /**
   * git commit
   *
   * @param {string} message  commit message
   * @memberof GitUtils
   */
  public commit(message: string): GitUtils {
    this.execSilently(`git add . && git commit -am "${message}"`)
    return this
  }

  /**
   * git merge
   *
   * @param {string} branch merge 的分支名
   * @returns {string}      git merge 的输出
   * @memberof GitUtils
   */
  public merge(branch: string): string {
    return this.execSilently(`git merge ${branch}`)
  }

  /**
   * 获取冲突文件数组，基于 .git/MERGE_MSG 里的冲突信息
   *
   * @returns {(string[] | null)}
   * @memberof GitUtils
   *
   * FIXME: 这里判断是否成功应该不够严谨
   */
  public getConflictFilenames(): string[] | null {
    const mergeMsgFilename = '.git/MERGE_MSG'
    if (!this.exist(mergeMsgFilename)) return null
    const mergeMsg = this.execSilently(`cat ${mergeMsgFilename}`)
    if (!mergeMsg.includes('# Conflicts:')) return null
    let conflictsDone = false
    return mergeMsg
      .split('# Conflicts:')[1]
      .split('\n')
      .filter((_) => {
        if (conflictsDone) return false
        if (!_.includes(' ')) return true
        conflictsDone = true
        return false
      })
      .map((_) => _.split(/\s/).find((item) => item !== '#' && item))
      .filter((_) => _) as string[]
  }

  /**
   * 获取 diff 文件 + 修改模式的数组
   *
   * @param {string} commitHash 要 diff 的 commit hash
   * @returns {{ mode: 'D' | 'M', filename: string }[]}
   * @memberof GitUtils
   */
  public getDiffFilesInfo(commitHash: string): { mode: string; filename: string }[] {
    return this.execSilently(`git diff ${commitHash} --name-status`)
      .split('\n')
      .filter((_) => _)
      .map((_) => {
        const mode = _[0]
        const filename = _.slice(1).trim()
        return { mode, filename }
      })
  }

  /**
   * 添加自定义模板元素
   *
   * @param item {TemplateItem} 模板元素
   * @memberof GitUtils
   */
  public addTmpTemplate(item: TemplateItem): void {
    this.tmpTemplateList.push(item)
  }

  /**
   * 获取全部模板元素，包括自定义模板元素
   *
   * @returns {TemplateItem[]}
   * @memberof GitUtils
   */
  public getTmpTemplate(): Array<TemplateItem> {
    return JSON.parse(JSON.stringify(this.tmpTemplateList))
  }
}

export const gitCacheUtils = new GitUtils()
export const curGitUtils = new GitUtils({
  baseUrl: process.cwd(),
})
