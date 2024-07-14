/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function run(_, f) {
  const pwd = Deno.cwd()
  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      '-v',
      `${pwd}:/src`,
      '-a',
      'stdout',
      '-a',
      'stderr',
      `ao-js-cli:${VERSION.IMAGE}`,
      'node',
      f
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Run a JavaScript File')
  .arguments('<file:string>')
  .action(run)
