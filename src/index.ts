import { resolve } from 'path'
import { program } from 'commander'
import jsonfile from 'jsonfile'
import create from './create'
import resetByChangingConfig from './update/resetByChangingConfig'
import updateFromTemplate from './update/updateFromTemplate'

const { version } = jsonfile.readFileSync(resolve(__dirname, '..', 'package.json'))

async function main() {
  program.version(version)

  program
    .command('create', { isDefault: true })
    .description('Create a new app')
    .action(async () => {
      await create()
    })

  program
    .command('update')
    .description('Update an app based on the updated template')
    .action(async () => {
      await updateFromTemplate()
    })

  program
    .command('reset')
    .description('Reset an app according to the updated configuration')
    .action(async () => {
      await resetByChangingConfig()
    })

  program.parse(process.argv)
}

main()
