import { resolve } from 'path'
import jsonfile from 'jsonfile'
import shelljs from 'shelljs'
import { RunResult } from '../interfaces'
import { TemplateConfig, InitedOptions } from '../interfaces/templateConfig'
import {
  TEMPLATE_CONFIG_FILE_NAME,
  GIT_CACHE_BASE_URL,
  MAIN_BRANCH,
  INJECT_PROMPTS_PREFIX,
} from '../common/constants'
import { curGitUtils, gitCacheUtils } from '../common/gitUtils'
import RenderTool from '../create/renderTool'
import CustomConfigGetter from '../create/customConfigGetter'
import { safeShell } from '../common/decorators'
import logger from '../common/logger'
import ConflictResolvers from './conflictsResolver'
import { templateList } from '../config'
const timeStamp = Date.now()

class Updater {
  /** ktConfig.json 的内容 */
  public ktConfig: TemplateConfig | undefined
  /** 最新的 ktConfig.json 的内容，仅用于更改配置后的自我更新 */
  public ktConfigNewest: TemplateConfig | undefined
  /** 模板仓储最新的 ktConfig.json 的内容 */
  private ktConfigTemplateNewest: TemplateConfig | undefined
  /** 模板仓储最新的 commit */
  private commitTemplateNewest: string | undefined
  /** 和当前目标仓储 origin 对应的模板仓储的 ktConfig.json 的内容 */
  private ktConfigTemplateOrigin: TemplateConfig | undefined
  /** 当前目标仓储的 git 地址 */
  private curRepo: string | undefined
  /** 当前目标仓储在 .gitCache 中的仓储名 */
  private curRepoName: string | undefined
  /** 当前目标仓储在 .gitCache 中的临时仓储名 */
  private curRepoTmpName: string | undefined
  /** 当前目标仓储在 .gitCache 中的对应仓储的绝对路径 */
  private curRepoAbsDirInCache: string | undefined
  /** 模板仓储在 .gitCache 中的对应仓储的绝对路径 */
  private templateAbsDirInCache: string | undefined
  /** 当前仓储所在路径 */
  private readonly cwd = process.cwd()
  /** 更新时用到的分支名 */
  public readonly branchNames = {
    base: `tmp_${timeStamp}_base`,
    newInit: `tmp_${timeStamp}_newInit`,
    current: `tmp_${timeStamp}_current`,
  }

  /**
   * 是否在主分支下执行
   *
   * @private
   * @returns {boolean}
   * @memberof Updater
   */
  private preventMain(): boolean {
    return gitCacheUtils.setUtils({ baseUrl: this.cwd }).branch() === MAIN_BRANCH
  }

  /**
   * 是否是在错误路径上执行当前操作
   *
   * @private
   * @returns {boolean}
   * @memberof Updater
   */
  private isWrongDir(): boolean {
    return !gitCacheUtils.setUtils({ baseUrl: this.cwd }).exist(TEMPLATE_CONFIG_FILE_NAME)
  }

  /**
   * 预检查
   *
   * @public
   * @memberof Updater
   */
  public preCheck(): void {
    // 更新必须在非主分支下执行
    if (this.preventMain()) {
      logger.red(`禁止在 ${MAIN_BRANCH} 分支上执行更新操作！`)
      process.exit(1)
    }
    // 必须在正确目录下执行
    if (this.isWrongDir()) {
      logger.red('必须在由 @qfe/create-xht-app 生成的仓储根目录下执行')
      process.exit(1)
    }
  }

  /**
   * 是否是最新代码（如果是，则不用更新）
   *
   * @public
   * @returns {boolean}
   * @memberof Updater
   */
  public isNewest(): boolean {
    const tmlCommitHash = gitCacheUtils.setUtils({ baseUrl: this.templateAbsDirInCache }).lastCommitHash()
    return this.ktConfig?.origin?.commit === tmlCommitHash
  }

  /**
   * 初始化，包括更新模板仓储，初始化内置数据
   *
   * @public
   * @memberof Updater
   */
  public init(): void {
    this.curRepo = curGitUtils.getRepoUrl()
    this.curRepoName = curGitUtils.getRepoNameFromRepo(this.curRepo)
    this.curRepoTmpName = `${this.curRepoName}_tmp`
    this.curRepoAbsDirInCache = resolve(GIT_CACHE_BASE_URL, this.curRepoName as string)
    this.ktConfigNewest = jsonfile.readFileSync(resolve(this.cwd, TEMPLATE_CONFIG_FILE_NAME))
    gitCacheUtils.setUtils({ baseUrl: this.cwd }).checkout('.')
    this.ktConfig = jsonfile.readFileSync(resolve(this.cwd, TEMPLATE_CONFIG_FILE_NAME))
    const gitRepo = this.ktConfig?.origin?.git as string
    this.templateAbsDirInCache = resolve(GIT_CACHE_BASE_URL, curGitUtils.getRepoNameFromRepo(gitRepo))
    if (!templateList.some((_) => _.repository === gitRepo)) {
      curGitUtils.addTmpTemplate({
        name: curGitUtils.getRepoNameFromRepo(gitRepo),
        repository: gitRepo,
        description: '',
      })
    }
    gitCacheUtils.setUtils({ baseUrl: GIT_CACHE_BASE_URL }).init(gitRepo)
    this.ktConfigTemplateNewest = jsonfile.readFileSync(
      resolve(this.templateAbsDirInCache, TEMPLATE_CONFIG_FILE_NAME)
    )
    gitCacheUtils.setUtils({ baseUrl: this.templateAbsDirInCache })
    this.commitTemplateNewest = gitCacheUtils.lastCommitHash()
    gitCacheUtils.checkout(this.ktConfigNewest?.origin?.commit as string)
    this.ktConfigTemplateOrigin = jsonfile.readFileSync(
      resolve(this.templateAbsDirInCache, TEMPLATE_CONFIG_FILE_NAME)
    )
    gitCacheUtils.checkout(MAIN_BRANCH)
  }

  /**
   * 生成一个当前目标仓储的空仓储
   *
   * @private
   * @param {string} branchName     空仓储的分支名
   * @param {string} [checkoutFrom] 从哪个分支来切当前的分支
   * @memberof Updater
   */
  @safeShell
  private makeEmptyRepo(branchName: string, checkoutFrom?: string): void {
    const curRepoName = this.curRepoName as string
    const tmpDir = this.curRepoTmpName as string
    gitCacheUtils.setUtils({ baseUrl: GIT_CACHE_BASE_URL })

    // 拉取目标仓储代码到 tmp 目录
    if (gitCacheUtils.exist(curRepoName)) {
      shelljs.cd(GIT_CACHE_BASE_URL)
      shelljs.mv(curRepoName, tmpDir)
    } else {
      gitCacheUtils.clone(this.curRepo as string, tmpDir)
    }

    // 切临时分支
    gitCacheUtils
      .setUtils({
        baseUrl: resolve(GIT_CACHE_BASE_URL, tmpDir),
      })
      .checkoutNewBranch(branchName, checkoutFrom)

    // mkdir 一个名为 curRepoName 的目录，并将 tmp 目录下的 .git 复制过来
    shelljs.cd(GIT_CACHE_BASE_URL)
    shelljs.mkdir(curRepoName)
    shelljs.mv(`${tmpDir}/.git`, `${curRepoName}/.git`)
    shelljs.rm('-rf', tmpDir)
  }

  /**
   * 生成用于 renderTool 渲染用的数据
   *
   * @private
   * @param {TemplateConfig} ktConfig               是基于什么样的 ktconfig 来生成数据
   * @param {InitedOptions} [rewriteInitedOptions]  覆写的 initedOptions
   * @returns {Promise<RunResult>}
   * @memberof Updater
   */
  private async makeRunResult(
    ktConfig: TemplateConfig,
    rewriteInitedOptions?: InitedOptions
  ): Promise<RunResult> {
    return await CustomConfigGetter.run({
      source: curGitUtils.getRepoNameFromRepo(ktConfig.origin?.git as string),
      commit: ktConfig.origin?.commit as string,
      templateConfig: ktConfig,
      initedOptions: {
        [`${INJECT_PROMPTS_PREFIX}isTemplate`]: ktConfig.isTemplate || false,
        [`${INJECT_PROMPTS_PREFIX}renderHere`]: true,
        ...ktConfig.initedOptions,
        ...rewriteInitedOptions,
      },
    })
  }

  /**
   * 生成仓储
   * 由当前目标仓储的模板仓储（其对应的 commitHash） + 目标仓储初始化时的 initedOptions 来生成
   * 其分支最终是 this.branchNames.base
   *
   * @public
   * @param {string} emptyBranch                    空仓储分支
   * @param {(string | undefined)} emptyBranchBase  空仓储分支基于哪个分支拉去的
   * @param {TemplateConfig} ktConfig               用于生成的 config
   * @param {string} commitMsg                      提交信息
   * @memberof Updater
   */
  public async makeRepoByOrigin(
    emptyBranch: string,
    emptyBranchBase: string | undefined,
    ktConfig: TemplateConfig,
    commitMsg: string
  ): Promise<void> {
    // 生成空仓储
    this.makeEmptyRepo(emptyBranch, emptyBranchBase)

    // 基于当前目标仓储生成或最后一次更新时对应的模板仓储的 commitHash 进行基础仓储生成
    const ktConfigTemplate = this.ktConfigTemplateOrigin as TemplateConfig
    const renderData: RunResult = await this.makeRunResult({
      initOptions: ktConfigTemplate.initOptions, // 因为业务仓储可能 initOptions 不完整，所以需要用模板的
      origin: ktConfig.origin,
      isTemplate: ktConfig.isTemplate,
      initedOptions: {
        ...ktConfigTemplate.initedOptions,
        ...ktConfig.initedOptions,
      },
    })
    const branch = gitCacheUtils
      .setUtils({
        baseUrl: this.templateAbsDirInCache,
      })
      .branch()
    gitCacheUtils.checkout(renderData.commit)
    const renderTool: RenderTool = new RenderTool(renderData, this.curRepoAbsDirInCache)
    renderTool.render()
    gitCacheUtils.setUtils({ baseUrl: this.curRepoAbsDirInCache }).commit(commitMsg)
    gitCacheUtils
      .setUtils({
        baseUrl: this.templateAbsDirInCache,
      })
      .checkout(branch) // 清除副作用
  }

  /**
   * 基于基础仓储对应的分支拉一个新分支
   * 并用最新模板
   *  + 当前目标仓储的 initedOption
   *  + 最新模板新增的 initedOptions 来生成仓储
   *
   * @public
   * @memberof Updater
   */
  public async makeNewInitRepo(commitMsg: string): Promise<void> {
    // 生成空仓储，并预先置好分支
    this.makeEmptyRepo(this.branchNames.newInit, this.branchNames.base)

    // 生成仓储
    const ktConfigTemplate = this.ktConfigTemplateNewest as TemplateConfig
    const renderData: RunResult = await this.makeRunResult(
      {
        initOptions: ktConfigTemplate.initOptions,
        origin: {
          git: this.ktConfigNewest?.origin?.git as string,
          commit: this.commitTemplateNewest as string,
        },
        isTemplate: this.ktConfigNewest?.isTemplate,
        initedOptions: ktConfigTemplate.initedOptions,
      },
      this.ktConfigNewest?.initedOptions
    )
    const renderTool: RenderTool = new RenderTool(renderData, this.curRepoAbsDirInCache)
    renderTool.render()
    gitCacheUtils.setUtils({ baseUrl: this.curRepoAbsDirInCache }).commit(commitMsg)
  }

  /**
   * 基于基础仓储对应的分支拉一个新分支
   * 生成一个具有当前目标仓储最新代码的仓储
   *
   * @public
   * @returns {string}  返回生成后，当前的 commitHash
   * @memberof Updater
   */
  @safeShell
  public makeCurrentRepo(commitMsg: string): string {
    // 生成空仓储，并预先置好分支
    this.makeEmptyRepo(this.branchNames.current, this.branchNames.base)

    // clone 当前目标仓储的最新代码，并将其 .git 换成上述空仓储的 .git
    shelljs.cd(GIT_CACHE_BASE_URL)
    shelljs.mv(this.curRepoName as string, `${this.curRepoTmpName}`)
    gitCacheUtils
      .setUtils({
        baseUrl: GIT_CACHE_BASE_URL,
      })
      .clone(this.curRepo as string)
    shelljs.rm('-rf', `${this.curRepoName}/.git`)
    shelljs.mv(`${this.curRepoTmpName}/.git`, `${this.curRepoName}/.git`)
    shelljs.rm('-rf', `${this.curRepoTmpName}`)
    gitCacheUtils.setUtils({ baseUrl: this.curRepoAbsDirInCache }).commit(commitMsg)
    return gitCacheUtils.lastCommitHash()
  }

  /**
   * merge
   *
   * @public
   * @param {string} sourceBranch
   * @param {string} targetBranch
   * @memberof Updater
   */
  public merge(sourceBranch: string, targetBranch: string): void {
    gitCacheUtils.setUtils({ baseUrl: this.curRepoAbsDirInCache }).checkout(targetBranch).merge(sourceBranch)
  }

  /**
   * 如果合并后有冲突，则：
   * 1. 自动解决部分冲突
   * 2. 打印冲突信息
   * 3. 替换冲突信息
   * 4. 返回 true
   *
   * @public
   * @returns {boolean} 是否冲突
   * @memberof Updater
   */
  public handleConflicts(infoStr: string): boolean {
    const conflictResolvers = new ConflictResolvers(gitCacheUtils)

    const conflictFilenames = conflictResolvers.resolve(
      gitCacheUtils
        .setUtils({
          baseUrl: this.curRepoAbsDirInCache,
        })
        .getConflictFilenames() || []
    )

    if (!conflictFilenames.length) {
      return false
    }
    logger.red('存在冲突文件：')
    conflictFilenames.forEach((_) => {
      logger.red(`# ${_}`)
      gitCacheUtils.writeFileSync(
        _,
        gitCacheUtils.readFileSync(_).replace(new RegExp(this.branchNames.newInit, 'g'), infoStr)
      )
    })
    return true
  }

  /**
   * 将当前和 commitHash diff 的文件拷贝到目标仓储里，如果 diff 的模式是 'D'，则删除
   *
   * @public
   * @param {string} commitHash
   * @memberof Updater
   */
  public copyOrDeleteDiffFiles(commitHash: string): void {
    gitCacheUtils
      .setUtils({
        baseUrl: this.curRepoAbsDirInCache,
      })
      .getDiffFilesInfo(commitHash)
      .forEach((_) => {
        const { filename, mode } = _
        if (mode !== 'D') {
          if (!gitCacheUtils.exist(filename)) return
          const target = resolve(this.cwd, filename)
          const targetDir = target.split('/').slice(0, -1).join('/')
          shelljs.mkdir('-p', targetDir)
          shelljs.cp(resolve(this.curRepoAbsDirInCache as string, filename), target)
          return
        }
        shelljs.rm(resolve(this.cwd, filename))
      })
  }

  /**
   * 清除缓存
   *
   * @public
   * @memberof Updater
   */
  @safeShell
  public clearCache(): void {
    shelljs.cd(GIT_CACHE_BASE_URL)
    shelljs.rm('-rf', this.curRepoName as string)
  }
}

export default new Updater()
