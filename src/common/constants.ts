import { resolve } from 'path'

/** git catch 的路径 */
export const GIT_CACHE_BASE_URL: string = resolve(__dirname, '../../.gitCache')

/** 模板配置文件名 */
export const TEMPLATE_CONFIG_FILE_NAME = '.ktconfig.json'

/** 创建仓储时的临时目录 */
export const TEMP_DIR = 'temp'

/** 主分支 */
export const MAIN_BRANCH = 'master'

/** 用于安全的 mustache render 方法的左括号替代字符串 */
export const LEFT_REPLACEMENT = '【「『'

/** 用于安全的 mustache render 方法的右括号替代字符串 */
export const RIGHT_REPLACEMENT = '』」】'

/** 本工具写入的临时 promtps 的变量名的前缀 */
export const INJECT_PROMPTS_PREFIX = '__'

/** 是否创建的是模板仓储的 key */
export const isTemplateKey = `${INJECT_PROMPTS_PREFIX}isTemplate`

export const CUSTOM_TEXT = '自定义'
