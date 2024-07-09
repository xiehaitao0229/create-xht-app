import { resolve } from 'path'
import jsonfile from 'jsonfile'
import Mustache from 'mustache'
import chalk from 'chalk'
import {
  GIT_CACHE_BASE_URL,
  TEMPLATE_CONFIG_FILE_NAME,
  INJECT_PROMPTS_PREFIX,
  isTemplateKey,
  CUSTOM_TEXT,
} from '../common/constants'
import { templateList } from '../config'
import { gitCacheUtils, curGitUtils } from '../common/gitUtils'
import prompts from './prompts'
import { TemplateItem, RunResult } from '../interfaces'
import { ActionMap, CustomConfigGetterInitOptions } from '../interfaces/customConfigGetter'
import {
  TemplateInitOption,
  TemplateConfig,
  MyPromptObject,
  InitedOptions,
} from '../interfaces/templateConfig'
import { Answers } from 'prompts'

/**
 * 收集生成新仓储所需要的配置数据
 *
 * @export
 * @class CustomConfigGetter
 */
export default class CustomConfigGetter {
  /** 模板仓储 */
  private static source = ''
  /** 模板仓储的 commit hash，正常初始化是最后一个 commit hash */
  private static commit = ''
  /** 从用户输入收集的用于初始化仓储的自定义数据 */
  private static data: { [key: string]: string | boolean | number }
  /** 模板仓储的配置 */
  private static templateConfig: TemplateConfig
  /** 模板仓储的 initOptions */
  private static initOptions: Array<TemplateInitOption | undefined> = []

  public static async run(options?: CustomConfigGetterInitOptions): Promise<RunResult> {
    // 从用户选择中，获取想要复制的模板
    await CustomConfigGetter.getSource(options?.source)

    // 赋值 commit
    CustomConfigGetter.getCommit(options?.commit)

    // 赋值 templateConfig
    CustomConfigGetter.getTemplateConfig(options?.templateConfig)

    // 完善 initOptions
    CustomConfigGetter.completeInitOptions()

    // 根据模板的.ksconfig来收集用户所需自定义内容
    await CustomConfigGetter.prompt({
      initedOptions: options?.initedOptions,
    })

    const result: RunResult = {
      templateConfig: CustomConfigGetter.templateConfig,
      initOptions: CustomConfigGetter.initOptions,
      data: CustomConfigGetter.data,
      source: CustomConfigGetter.source,
      commit: CustomConfigGetter.commit,
    }
    return result
  }

  /**
   * 从用户选择中，获取想要复制的模板
   *
   * @private
   * @static
   * @returns {Promise<void>}
   * @memberof CustomConfigGetter
   */
  private static async getSource(source?: string): Promise<void> {
    if (source) {
      CustomConfigGetter.source = source
      return
    }

    // TODO: 遍历已经clone下来的仓储，结合gitlab api，获取相关信息，保证信息即时性
    const choices = [
      ...templateList,
      {
        name: CUSTOM_TEXT,
        description: '通过输入 git 地址来自定义模板仓储',
        repository: '',
      },
    ].map((item: TemplateItem) => ({
      title: item.name,
      description: item.description,
      value: item.name,
    }))
    const response = await prompts({
      type: 'select',
      name: 'value',
      message: '选择一个仓储进行复制',
      choices,
      initial: 0,
    })

    if (response.value !== CUSTOM_TEXT) {
      CustomConfigGetter.source = response.value
      return
    }

    let inputSource: Answers<'value'> = { value: '' }
    while (!inputSource.value || !inputSource.value.endsWith('.git')) {
      inputSource = await prompts({
        type: 'text',
        name: 'value',
        message: '请输入以 `.git` 为结尾的，可用于 clone 的 git 地址',
        initial: '',
      })
    }
    CustomConfigGetter.source = gitCacheUtils.getRepoNameFromRepo(inputSource.value)
    gitCacheUtils.addTmpTemplate({
      name: CustomConfigGetter.source,
      repository: inputSource.value,
      description: '',
    })
  }

  /**
   * 设置 commit
   *
   * @private
   * @static
   * @param {string} [commit]
   * @memberof CustomConfigGetter
   */
  private static getCommit(commit?: string): void {
    if (commit) {
      CustomConfigGetter.commit = commit
      return
    }

    // 仓储未clone则clone，clone了就到对应的目下执行git pull
    gitCacheUtils.init(CustomConfigGetter.source)

    // 拿到最新一个 commit hash
    gitCacheUtils.setUtils({
      baseUrl: resolve(GIT_CACHE_BASE_URL, CustomConfigGetter.source),
    })
    CustomConfigGetter.commit = gitCacheUtils.lastCommitHash()
  }

  /**
   * 赋值 templateConfig
   *
   * @private
   * @static
   * @param {TemplateConfig} [templateConfig]
   * @memberof CustomConfigGetter
   */
  private static getTemplateConfig(templateConfig?: TemplateConfig): void {
    CustomConfigGetter.templateConfig =
      templateConfig ||
      jsonfile.readFileSync(resolve(GIT_CACHE_BASE_URL, CustomConfigGetter.source, TEMPLATE_CONFIG_FILE_NAME))
  }

  /**
   * 完善 initOptions
   *
   * @private
   * @static
   * @memberof CustomConfigGetter
   */
  private static completeInitOptions() {
    CustomConfigGetter.initOptions = CustomConfigGetter.templateConfig.initOptions || []
    CustomConfigGetter.initOptions = CustomConfigGetter.initOptions.map(
      (item: TemplateInitOption | undefined, index: number) => {
        if (index === 0 && (!item || item.prompt.name !== 'projectName')) {
          console.error('.ksconfig.json的第一个元素必须代表项目名，prompt.name必须为`projectName`')
        }

        if (!item || item.prompt.message) return item
        const type: string = item.prompt.type
        const actionMap: ActionMap = {
          confirm: '选择',
          toggle: '勾选',
          select: '选择',
          multiselect: '选择',
          autocomplete: '输入并选择',
          autocompleteMultiselect: '输入并选择',
          date: '选择',
        }
        const action = (<any>actionMap)[type] || '输入'
        item.prompt.message = `请${action}${item.prompt.name}的值`
        return item
      }
    )
  }

  /**
   * 增强 prompt.initial
   * 在该字段如果为 `undefined` 或为字符串时，增强规则如下：
   * 1. 如果 prompt.name 带 repository 则使用当前 git 仓储地址
   * 2. 如果 prompt.name 为 projectName 则使用当前 git 仓储名
   *
   * @private
   * @static
   * @param {MyPromptObject} [p]
   * @memberof CustomConfigGetter
   */
  private static enhanceInitial(p: MyPromptObject) {
    if (typeof p.name !== 'string' || (p.initial !== undefined && p.initial !== '')) return p
    if (p.name.toLocaleLowerCase().includes('repository')) {
      p.initial = curGitUtils.getRepoUrl()
      return p
    }
    if (p.name === 'projectName') {
      p.initial = curGitUtils.getRepoNameFromRepo(curGitUtils.getRepoUrl())
      return p
    }
    return p
  }

  /**
   * 根据模板的.ksconfig来收集用户所需自定义内容
   *
   * @private
   * @static
   * @memberof CustomConfigGetter
   */
  private static async prompt({ initedOptions }: { initedOptions?: InitedOptions }) {
    const injectPrompts: MyPromptObject[] = [
      {
        type: 'toggle',
        name: `${INJECT_PROMPTS_PREFIX}renderHere`,
        message: '是否在当前目录创建仓储',
        initial: true,
        active: 'yes',
        inactive: 'no',
      },
      {
        type: 'toggle',
        name: isTemplateKey,
        message: '创建的是否是仓储模板',
        initial: false,
        active: 'yes',
        inactive: 'no',
      },
    ]

    if (injectPrompts.some((p) => !(p.name as string).startsWith(INJECT_PROMPTS_PREFIX))) {
      console.error(chalk.red(`公共插入的 prompt 的 name 应该以 ${INJECT_PROMPTS_PREFIX} 开头`))
      process.exit(1)
    }

    CustomConfigGetter.data = await prompts(injectPrompts, initedOptions)

    for (let i = 0; i < CustomConfigGetter.initOptions.length; i += 1) {
      const item = CustomConfigGetter.initOptions[i]
      if (!item) continue

      let p = (<TemplateInitOption>item).prompt
      // 支持初始值模板渲染功能，只针对业务仓储，模板仓储不作渲染
      if (!CustomConfigGetter.data[isTemplateKey]) {
        p = CustomConfigGetter.enhanceInitial(p)
        if (typeof p.initial === 'string') {
          p.initial = Mustache.render(p.initial, CustomConfigGetter.data)
        }
      }

      // 如果创建的是模板，且 replaceInTemplate 不为 true，则不询问
      // 如果是重复的询问，则不询问
      if (
        (CustomConfigGetter.data[isTemplateKey] && !item.replaceInTemplate) ||
        CustomConfigGetter.data[<string>p.name] !== undefined
      )
        continue

      const data = await prompts(p, initedOptions)
      CustomConfigGetter.data = { ...CustomConfigGetter.data, ...data }
    }
  }
}
