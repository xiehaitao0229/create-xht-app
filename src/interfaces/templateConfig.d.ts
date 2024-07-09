import { PromptObject, PromptType } from '@types/prompts'
import { IOptions } from '@types/glob'

/**
 * 自定义的 prompt 配置
 *
 * @interface MyPromptObject
 * @extends {PromptObject}
 */
interface MyPromptObject extends PromptObject {
  /** 固定 type */
  type: PromptType
}

/**
 * 配置文件中的 initOptions 数组里单个元素的结构
 *
 * @export
 * @interface TemplateInitOption
 */
export interface TemplateInitOption {
  /** prompt 参数 */
  readonly prompt: MyPromptObject
  /** glob 的匹配公式 */
  readonly globPatterns: string | Array<string>
  /** glob 的选择参数 */
  readonly globOpts?: IOptions
  /** replace 时的匹配公式 */
  readonly replacePattern?: string
  /** replace 成的字符串的模板 */
  readonly replaceTemplate?: string
  /** 如果新建的是模板仓储，是否 replace（默认不会） */
  readonly replaceInTemplate?: boolean
}

/**
 * 配置文件中，origin 的结构
 *
 * @export
 * @interface Origin
 */
export interface Origin {
  /** 模板源仓储的 git 地址 */
  git: string
  /** 生成/最后一次更新时，对应模板源仓储的哪个 commitHash */
  commit: string
}

/** 配置文件中，initedOptions 的结构 */
export type InitedOptions = { [key: string]: boolean | string }

/**
 * 配置文件结构
 *
 * @export
 * @interface TemplateConfig
 */
export interface TemplateConfig {
  /** 模板仓储初始化参数 */
  initOptions: Array<TemplateInitOption | undefined>
  /** 模板源仓储信息 */
  origin?: Origin
  /** 是否是模板 */
  isTemplate?: boolean
  /** 初始化时用的配置 */
  initedOptions?: InitedOptions
}

/**
 * 非模板仓储的配置文件结构
 *
 * @export
 * @interface TemplateConfigWithOptionalInitOptions
 */
export interface TemplateConfigWithOptionalInitOptions {
  /** 模板仓储初始化参数 */
  initOptions?: Array<TemplateInitOption | undefined>
  /** 模板源仓储信息 */
  origin?: Origin
  /** 是否是模板 */
  isTemplate?: boolean
  /** 初始化时用的配置 */
  initedOptions?: InitedOptions
}

/** 配置文件结构或 undefined，一般用于 TemplateConfigWithOptionalInitOptions 类型的变量的不赋值声明 */
export type TemplateConfigWithOptionalInitOptionsOrUndefined =
  | TemplateConfigWithOptionalInitOptions
  | undefined
