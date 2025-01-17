/* global Deno */

import { Command } from './deps.js'

import { VERSION } from './versions.js'

import { command as Init } from './commands/init.js'
import { command as Javascript } from './commands/javascript.js'
import { command as Run } from './commands/run.js'
import { command as Build } from './commands/build.js'
import { command as Publish } from './commands/publish.js'
import { command as Spawn } from './commands/spawn.js'
import { command as Bundler } from './commands/bundler.js'

const cli = new Command()
  .name('ao')
  .version(VERSION.CLI)
  .description('The ao CLI for build, publishing, and spawning ao Modules and Processes')
  .action(() => cli.showHelp())
  .command('init', Init)
  .command('javascript', Javascript)
  .command('run', Run)
  .command('build', Build)
  .command('publish', Publish)
  .command('spawn', Spawn)
  .command('bundler', Bundler)

await cli.parse(Deno.args)
