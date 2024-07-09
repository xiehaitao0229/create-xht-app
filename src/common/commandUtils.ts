import fs from 'fs'
import { resolve } from 'path'
import shell, { ExecOptions } from 'shelljs'
import { UtilsNewOpts } from '../interfaces'
import { GIT_CACHE_BASE_URL } from './constants'
import { safeShell } from './decorators'

class Utils {
  /** 忽略 base，即都在相对路径进行操作 */
  private noBase = false
  /** 基础路径，相对路径可以根据此字段生成完整路径 */
  private baseUrl: string = GIT_CACHE_BASE_URL
  /** 初始的 cwd */
  public static originCwd: string = process.cwd()

  constructor(opts?: UtilsNewOpts) {
    this.reset(opts)
  }

  /**
   * 设置
   *
   * @param {UtilsNewOpts} [opts]
   * @memberof Utils
   */
  public reset(opts?: UtilsNewOpts): void {
    opts = opts || {}
    this.noBase = opts.noBase || false
    this.baseUrl = opts.baseUrl || this.baseUrl
  }

  /**
   * 生成绝对路径
   *
   * @private
   * @param {string} path 相对路径
   * @returns {string}    绝对路径
   * @memberof Utils
   */
  private absolute(path: string): string {
    return this.noBase ? path : resolve(this.baseUrl, path)
  }

  /**
   * 到baseUrl下执行命令
   *
   * @param {string} cmd          命令
   * @param {ExecOptions} [opts]  可选配置
   * @returns {string}            执行的结果
   * @memberof Utils
   */
  @safeShell
  public exec(cmd: string, opts?: ExecOptions): string {
    this.noBase || shell.cd(this.baseUrl)
    return shell
      .exec(cmd, opts || {})
      .toString()
      .trim()
  }

  /**
   * 到baseUrl下沉默执行命令
   *
   * @param {string} cmd
   * @param {ExecOptions} [opts]
   * @returns {string}
   * @memberof Utils
   */
  public execSilently(cmd: string, opts?: ExecOptions): string {
    return this.exec(cmd, { ...opts, silent: true })
  }

  /**
   * 路径是否存在
   *
   * @param {string} path 路径
   * @returns {boolean}   是否存在
   * @memberof Utils
   */
  public exist(path: string): boolean {
    return fs.existsSync(this.absolute(path))
  }

  /**
   * 同步读文件，用 utf-8 编码读
   *
   * @param {string} path 路径
   * @returns {string}    文件内容
   * @memberof Utils
   */
  public readFileSync(path: string): string {
    return fs.readFileSync(this.absolute(path), { encoding: 'utf-8' })
  }

  /**
   * 同步写文件
   *
   * @param {string} path 路径
   * @param {string} data 文件内容
   * @returns {void}
   * @memberof Utils
   */
  public writeFileSync(path: string, data: string): void {
    return fs.writeFileSync(this.absolute(path), data)
  }
}

export default Utils
