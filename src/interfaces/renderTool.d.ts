export interface replaceItem {
  /** replace 的数据在用户输入数据中对应的 key 值 */
  key: string
  /** replace 时的匹配公式 */
  pattern: string
  /** replace 成的字符串的模板 */
  template: string
}

export interface RenderConfigItem {
  /** 用于渲染的 data */
  data?: { [key: string]: any }
  /** 用于替换的信息数组 */
  replaces: Array<replaceItem>
}

export interface RenderConfig {
  /** 渲染配置元素 */
  [key: string]: RenderConfigItem
}
