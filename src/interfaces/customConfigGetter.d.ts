import { TemplateConfig, InitedOptions } from './templateConfig'

export interface ActionMap {
  /** prompt type 为`confirm`时对应的用户的操作类型 */
  readonly confirm: string
  /** prompt type 为`toggle`时对应的用户的操作类型 */
  readonly toggle: string
  /** prompt type 为`select`时对应的用户的操作类型 */
  readonly select: string
  /** prompt type 为`multiselect`时对应的用户的操作类型 */
  readonly multiselect: string
  /** prompt type 为`autocomplete`时对应的用户的操作类型 */
  readonly autocomplete: string
  /** prompt type 为`autocompleteMultiselect`时对应的用户的操作类型 */
  readonly autocompleteMultiselect: string
  /** prompt type 为`date`时对应的用户的操作类型 */
  readonly date: string
}

export interface CustomConfigGetterInitOptions {
  /** 模板仓储 */
  source?: string
  /** 模板仓储的 commit hash */
  commit?: string
  /** 模板仓储的配置 */
  templateConfig?: TemplateConfig
  /** 用于初始化的 options */
  initedOptions?: InitedOptions
}
