import prompts from 'prompts'
import { MyPromptObject } from '../interfaces/templateConfig'
import logger from '../common/logger'

async function singlePrompt(p: MyPromptObject, data?: Record<string, any>): Promise<prompts.Answers<string>> {
  if (data && data[p.name as string] !== undefined) {
    return {
      [p.name as string]: data[p.name as string],
    }
  }
  return prompts(p, {
    onCancel() {
      logger.red('获取配置中断')
      process.exit(1)
    },
  })
}

/**
 * 带退出提示的 prompt
 * 如果有相关数据，则不 prompt
 *
 * @export
 * @param {(MyPromptObject | Array<MyPromptObject>)} ps
 * @param {Record<string, any>} [data]
 * @returns {Promise<prompts.Answers<string>>}
 */
export default async function (
  ps: MyPromptObject | Array<MyPromptObject>,
  data?: Record<string, any>
): Promise<prompts.Answers<string>> {
  if (!Array.isArray(ps)) return await singlePrompt(ps, data)

  let answer = {}

  for (const p of ps) {
    answer = {
      ...answer,
      ...(await singlePrompt(p, data)),
    }
  }

  return answer
}
