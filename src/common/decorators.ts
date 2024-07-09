import shelljs from 'shelljs'

function safeShell(_target: unknown, _name: string, descriptor: unknown): void {
  const d = (descriptor as unknown) as { value: () => unknown }
  const oldValue = d.value

  d.value = function (...args) {
    const cwd = process.cwd()
    const result = oldValue.apply(this, args)
    shelljs.cd(cwd)
    return result
  }
}

export { safeShell }
