import CustomConfigGetter from './customConfigGetter'
import RenderTool from './renderTool'
import { RunResult } from '../interfaces'

/**
 * 生成应用
 */
export default async function create(): Promise<void> {
  // 从用户输入收集的用于初始化仓储的自定义数据
  const renderData: RunResult = await CustomConfigGetter.run()

  // 渲染
  const renderTool: RenderTool = new RenderTool(renderData)
  renderTool.render()
}
