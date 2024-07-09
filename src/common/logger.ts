// FIXME: 是否有更优雅的写法

import chalk from 'chalk'
import { SimpleLog, Logger, ExternalMethod } from '../interfaces/logger'

function log(...args: unknown[]): void {
  console.log('[create-xht-app]:', ...args)
}

const logger: SimpleLog = (...args: unknown[]): void => {
  log(...args)
}

const externalMethods: ExternalMethod[] = ['red', 'green']
externalMethods.forEach((_) => {
  ;(logger as Logger)[_] = (...args: unknown[]) => {
    log(...args.map((a) => chalk[_](a)))
  }
})

export default logger as Logger
