import { TemplateConfig, TemplateConfigWithOptionalInitOptions } from './templateConfig'

export interface UtilsNewOpts {
  /** 忽略 base，即都在相对路径进行操作 */
  readonly baseUrl?: string
  /** 基础路径，相对路径可以根据此字段生成完整路径 */
  readonly noBase?: boolean
}

export interface TemplateItem {
  /** 模板仓储名 */
  readonly name: string
  /** 模板描述 */
  readonly description: string
  /** 模板仓储远程 git 地址 */
  readonly repository: string
}

export interface RunResult {
  /** 模板仓储下的配置文件读出来的原始配置 */
  templateConfig?: TemplateConfig | TemplateConfigWithOptionalInitOptions
  /** 模板仓储下的配置文件读出来的 initOptions */
  readonly initOptions: Array<TemplateInitOption | undefined>
  /** 从用户输入收集的用于初始化仓储的自定义数据 */
  readonly data: { [key: string]: any }
  /** 模板 */
  readonly source: string
  /** 模板仓储最后一个 commit hash */
  readonly commit: string
}
