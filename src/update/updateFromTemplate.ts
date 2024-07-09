import updater from './updater'
import logger from '../common/logger'
import { TemplateConfig } from '../interfaces/templateConfig'

/**
 * 通过更新后的模板更新当前仓储
 */
async function updateFromTemplate(): Promise<void> {
  // 预校验
  updater.preCheck()
  // 更新模板仓储，初始化内置数据
  updater.init()
  // 如果是最新代码则不用更新
  if (updater.isNewest()) {
    logger.green('当前代码已经是最新代码')
    process.exit(0)
  }
  // 生成基础仓储，后面两个参与 merge 的分支会基于基础仓储所对应的分支
  // 由当前目标仓储的模板仓储（其对应的 commitHash） + 目标仓储初始化时的 initedOptions 来生成
  await updater.makeRepoByOrigin(
    updater.branchNames.base,
    undefined,
    updater.ktConfig as TemplateConfig,
    'build: 基础仓储'
  )
  // 基于上面基础仓储对应的分支拉一个新分支
  // 用最新模板 + 当前目标仓储的 initedOption + 最新模板新增的 initedOptions 来生成仓储
  await updater.makeNewInitRepo('build: 新模板初始化后的仓储')
  // 基于上面基础仓储对应的分支拉一个新分支
  // 生成一个具有当前目标仓储最新代码的仓储
  const commitHash = updater.makeCurrentRepo('build: 最新代码')
  // merge makeNewInitRepo 和 makeCurrentRepo 的两个分支
  updater.merge(updater.branchNames.newInit, updater.branchNames.current)
  // 是否冲突
  const isConflict = updater.handleConflicts('updateFromTemplate')
  // 将合并后产生的 diff 文件拷贝到目标仓储中
  updater.copyOrDeleteDiffFiles(commitHash)
  logger.green(`已经根据模板更新完毕！${isConflict ? '请解决冲突。' : ''}`)
  // 清除缓存
  updater.clearCache()
}

export default updateFromTemplate
