/**
 * 最简单的 log 函数
 *
 * @export
 * @interface SimpleLog
 */
export interface SimpleLog {
  (...args: unknown[]): void
}

/** 目前支持的 log 颜色 */
export type ExternalMethod = 'red' | 'green'

/**
 * 自带着色能力的 log
 *
 * @export
 * @interface Logger
 * @extends {SimpleLog}
 */
export interface Logger extends SimpleLog {
  red: SimpleLog
  green: SimpleLog
}
