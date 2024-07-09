import glob from 'glob'
import shelljs from 'shelljs'
import { resolve } from 'path'
import Mustache from 'mustache'
import Utils from '../common/commandUtils'
import {
  GIT_CACHE_BASE_URL,
  TEMPLATE_CONFIG_FILE_NAME,
  TEMP_DIR,
  LEFT_REPLACEMENT,
  RIGHT_REPLACEMENT,
  INJECT_PROMPTS_PREFIX,
  isTemplateKey,
} from '../common/constants'
import { RunResult, TemplateItem } from '../interfaces'
import { RenderConfigItem, RenderConfig, replaceItem } from '../interfaces/renderTool'
import {
  TemplateInitOption,
  TemplateConfigWithOptionalInitOptionsOrUndefined,
  InitedOptions,
} from '../interfaces/templateConfig'
import logger from '../common/logger'
import { gitCacheUtils } from '../common/gitUtils'

export default class RenderTool {
  /** 用于渲染的总数据 */
  private renderData: RunResult
  /** 以文件为维度的渲染数据 */
  private renderConfig: RenderConfig = {}
  /** 需要渲染的文件数组 */
  private fileArray: Array<string> = []
  /** 生成的项目 */
  private target: string | undefined
  /** 内嵌 utils */
  private utils: Utils = new Utils()

  constructor(renderData: RunResult, target?: string) {
    this.renderData = renderData
    this.target = target
    this.init()
  }

  /**
   * 初始化
   * 将渲染数据改变成以文件为维度的渲染数据
   * 初始化需要渲染的文件数组、生成的项目
   *
   * @private
   * @memberof RenderTool
   */
  private init() {
    const configs: Array<TemplateInitOption | undefined> = this.renderData.initOptions
    configs.forEach((item: TemplateInitOption | undefined) => {
      if (!item || (this.renderData.data[isTemplateKey] && !item.replaceInTemplate) || !item.globPatterns)
        return
      const globPatterns: Array<string> =
        typeof item.globPatterns === 'string' ? [item.globPatterns] : item.globPatterns
      // 生成一个 TemplateInitOption 涉及的所有文件
      const files: Array<string> = globPatterns.reduce(
        (acc: Array<string>, pattern: string) =>
          acc.concat(
            glob.sync(
              pattern,
              Object.assign(
                {
                  cwd: resolve(GIT_CACHE_BASE_URL, this.renderData.source),
                },
                item.globOpts || {}
              )
            )
          ),
        []
      )

      files.forEach((file: string) => {
        // 收集文件
        this.fileArray.includes(file) || this.fileArray.push(file)

        // 补充该文件相关的渲染数据
        const configItem: RenderConfigItem = this.renderConfig[file] || {}
        configItem.data = configItem.data || {}
        const name: string = <string>item.prompt.name
        configItem.data[name] = this.renderData.data[name]
        if (item.replacePattern) {
          // 可能一个文件有多个需要 replace 的值，所以是数组
          configItem.replaces = configItem.replaces || []
          configItem.replaces.push({
            key: name,
            pattern: item.replacePattern,
            template: item.replaceTemplate || '',
          })
        }
        this.renderConfig[file] = configItem
      })
    })

    if (!this.target) {
      this.target = this.renderData.data[`${INJECT_PROMPTS_PREFIX}renderHere`]
        ? Utils.originCwd
        : resolve(Utils.originCwd, this.renderData.data.projectName)
    }
    this.utils = new Utils({ baseUrl: this.target })
  }

  /**
   * 复制模板到目标目录下
   *
   * @private
   * @memberof RenderTool
   */
  private copy() {
    this.utils.exist('./') || shelljs.mkdir(this.target as string)

    // 将模板复制到目标目录下
    shelljs.cd(GIT_CACHE_BASE_URL)
    shelljs.rm('-rf', TEMP_DIR)
    shelljs.mkdir(TEMP_DIR)
    shelljs.cp('-r', `${this.renderData.source}/.`, `${TEMP_DIR}/`)
    // 不复制.git
    shelljs.rm('-rf', `${TEMP_DIR}/.git`)
    shelljs.cp('-r', `${TEMP_DIR}/.`, `${this.target}/`)
    shelljs.rm('-rf', TEMP_DIR)
  }

  /**
   * 获取字符串中的 muchtache 模板中的变量
   * 目前只支持以下情况
   * 1. {{ value }}
   * 2. {{{ value }}}
   * 3. {{# value }}
   * 4. {{/ value }}
   * 5. {{^ value }}
   *
   * @private
   * @param {string}                    str 字符创
   * @returns {(Array<string> | null)}      匹配出来的字符串数组，如果匹配不到，返回 null
   * @memberof RenderTool
   */
  private getMustacheValueNames(str: string): Array<string> | null {
    const matches = str.match(/{{([^}]+)}}/g)
    if (!matches) return null
    const names: Array<string> = []
    matches.forEach((m) => {
      const name = (m.match(/{{(?:[#|^|/]?)(?:\s*)(\S+)(?:\s*)}}/) || [])[1] || ''
      if (!name && names.includes(name)) return
      names.push(name)
    })
    return names && names.length ? names : null
  }

  /**
   * 逐行进行 Mustache.render
   * FIXME: 只支持 mustache 所需变量全部不为 undefined 的情况
   *
   * @private
   * @param {string}              fileContent 文件内容
   * @param {Record<string, any>} data        用于渲染的数据
   * @returns {string}                        渲染后的文件
   * @memberof RenderTool
   */
  private mustacheRenderLineByLine(fileContent: string, data: Record<string, any>): string {
    return fileContent
      .split('\n')
      .map((line: string): string => {
        const names = this.getMustacheValueNames(line)
        const allMatch = names?.every((name) => data[name] !== undefined)
        return allMatch ? Mustache.render(line, data) : line
      })
      .join('\n')
  }

  /**
   * 安全的 mustache render 方法
   * 主要考虑模板渲染时，数据不全的情况
   *
   * @private
   * @param {string}              fileContent 文件内容
   * @param {Record<string, any>} data        用于渲染的数据
   * @returns {string}
   * @memberof RenderTool
   */
  private mustacheSafeRender(fileContent: string, data: Record<string, any>): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ;[...fileContent.matchAll(/{{(?:[#|^|/]?)(?:\s*)(\S+)(?:\s*)}}/g)]
      .filter((matchContent) => data[matchContent[1]] === undefined)
      .forEach((matchContent) => {
        fileContent = fileContent.replace(
          matchContent[0],
          matchContent[0].replace(/\{/g, LEFT_REPLACEMENT).replace(/\}/g, RIGHT_REPLACEMENT)
        )
      })

    return Mustache.render(fileContent, data)
      .replace(new RegExp(LEFT_REPLACEMENT, 'g'), '{')
      .replace(new RegExp(RIGHT_REPLACEMENT, 'g'), '}')
  }

  /**
   * 一般替换
   *
   * @private
   * @param {RenderConfigItem} configItem 替换配置
   * @param {string} fileContent          文件内容
   * @returns {string}
   * @memberof RenderTool
   */
  private replace(configItem: RenderConfigItem, fileContent: string): string {
    if (!configItem.replaces || !configItem.replaces.length) return fileContent

    configItem.replaces.forEach((r: replaceItem) => {
      // 原有的 value
      const rawValue = (configItem.data || {})[r.key]
      if (rawValue === undefined) return
      // 如果有 template ，replace 的值进行一次加工
      const value = r.template ? Mustache.render(r.template, this.renderData.data) : rawValue
      // replace
      fileContent = fileContent.replace(new RegExp(r.pattern, 'g'), value)
    })
    return fileContent
  }

  /**
   * 渲染文件
   *
   * @private
   * @memberof RenderTool
   */
  private renderFiles() {
    this.fileArray.forEach((file: string) => {
      // .ktconfig.json 先不处理
      if (file === TEMPLATE_CONFIG_FILE_NAME) return null

      const configItem: RenderConfigItem = this.renderConfig[file] || {}
      // 读文件
      let fileContent = this.utils.readFileSync(file)
      // 先 replace
      fileContent = this.replace(configItem, fileContent)
      // 再 render
      // 逐行 render 是因为创建的对象也是模板时，部分值无法获取
      // 如果直接渲染，会出 bug
      fileContent = this.mustacheSafeRender(fileContent, <Record<string, any>>configItem.data)
      // 回写
      this.utils.writeFileSync(file, fileContent)
    })
  }

  /**
   * 设置配置文件里的 initOptions 字段，如果不是渲染模板，则去掉此字段；
   *
   * @private
   * @param {TemplateConfigWithOptionalInitOptionsOrUndefined} templateConfig
   * @returns {TemplateConfigWithOptionalInitOptionsOrUndefined}
   * @memberof RenderTool
   */
  private setInitOptions(
    templateConfig: TemplateConfigWithOptionalInitOptionsOrUndefined
  ): TemplateConfigWithOptionalInitOptionsOrUndefined {
    if (!templateConfig) return templateConfig

    // 如果不是渲染模板，去掉 initOptions 这个字段
    if (!this.renderData.data[isTemplateKey]) {
      delete templateConfig.initOptions
      return templateConfig
    }

    const configItem: RenderConfigItem = this.renderConfig[TEMPLATE_CONFIG_FILE_NAME] || {}

    // 先 replace
    const replacedFileContent = this.replace(configItem, JSON.stringify(templateConfig, null, 2))

    // 如果是 .ktconfig.json，需要将没有标识 replaceInTemplate 的元素剔除不替换
    const initOptions = JSON.parse(replacedFileContent).initOptions?.map(
      (opt: TemplateInitOption | undefined) => {
        if (!opt?.replaceInTemplate) return opt
        const ret = JSON.parse(
          this.mustacheRenderLineByLine(JSON.stringify(opt, null, 2), <Record<string, any>>configItem.data)
        )
        return ret
      }
    )
    return { initOptions }
  }

  /**
   * 设置配置文件里的 origin 字段
   *
   * @private
   * @param {TemplateConfigWithOptionalInitOptionsOrUndefined} templateConfig
   * @returns {TemplateConfigWithOptionalInitOptionsOrUndefined}
   * @memberof RenderTool
   */
  private setOrigin(
    templateConfig: TemplateConfigWithOptionalInitOptionsOrUndefined
  ): TemplateConfigWithOptionalInitOptionsOrUndefined {
    if (!templateConfig) return templateConfig

    // 设置 origin
    templateConfig.origin = {
      git: (gitCacheUtils
        .getTmpTemplate()
        .find((item) => item.name === this.renderData.source) as TemplateItem).repository,
      commit: this.renderData.commit,
    }

    return templateConfig
  }

  /**
   * 设置配置文件的 isTemplate 字段
   *
   * @private
   * @param {TemplateConfigWithOptionalInitOptionsOrUndefined} templateConfig
   * @returns {TemplateConfigWithOptionalInitOptionsOrUndefined}
   * @memberof RenderTool
   */
  private setIsTemplate(
    templateConfig: TemplateConfigWithOptionalInitOptionsOrUndefined
  ): TemplateConfigWithOptionalInitOptionsOrUndefined {
    if (!templateConfig) return templateConfig

    templateConfig.isTemplate = this.renderData.data[isTemplateKey]
    return templateConfig
  }

  /**
   * 设置初始化参数
   *
   * @private
   * @param {TemplateConfigWithOptionalInitOptionsOrUndefined} templateConfig
   * @returns {TemplateConfigWithOptionalInitOptionsOrUndefined}
   * @memberof RenderTool
   */
  private setInitedOptions(
    templateConfig: TemplateConfigWithOptionalInitOptionsOrUndefined
  ): TemplateConfigWithOptionalInitOptionsOrUndefined {
    if (!templateConfig) return templateConfig

    templateConfig.initedOptions = {}
    Object.keys(this.renderData.data).forEach((key) => {
      if (key.startsWith(INJECT_PROMPTS_PREFIX)) return
      ;(templateConfig.initedOptions as InitedOptions)[key] = this.renderData.data[key]
    })
    return templateConfig
  }

  /**
   * 回写配置文件
   *
   * @private
   * @memberof RenderTool
   */
  private renderTemplateConfig() {
    const methods = ['setInitOptions', 'setOrigin', 'setIsTemplate', 'setInitedOptions']
    const templateConfig = methods.reduce(
      (acc: TemplateConfigWithOptionalInitOptionsOrUndefined, curMethodKey: string) => {
        return this[curMethodKey as 'setInitOptions' | 'setOrigin' | 'setIsTemplate' | 'setInitedOptions'](
          acc
        )
      },
      this.renderData.templateConfig
    )

    // 回写
    this.utils.writeFileSync(TEMPLATE_CONFIG_FILE_NAME, JSON.stringify(templateConfig, null, 2))
  }

  /**
   * 渲染
   *
   * @memberof RenderTool
   */
  public render(): void {
    // 复制模板到目标目录下
    this.copy()
    logger.green('copy done')

    // 渲染文件
    this.renderFiles()
    logger.green('renderFiles done')

    // 渲染配置文件
    this.renderTemplateConfig()
    logger.green('renderTemplateConfig done')
  }
}
