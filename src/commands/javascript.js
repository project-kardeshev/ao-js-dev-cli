/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function js() {
  const pwd = Deno.cwd()
  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      '-v',
      `${pwd}:/src`,
      '-it',
      `ao-js-cli:${VERSION.IMAGE}`,
      'node'
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Start a JavaScript Repl')
  .action(js)
