/* global Deno */

import { Command } from '../deps.js'
import { VERSION } from '../versions.js'

export async function build () {
  const pwd = Deno.cwd()
  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      '-v',
      `${pwd}:/src`,
      `ao-js-cli:${VERSION.IMAGE}`,
      'emcc-duktape'
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Build the Javascript Project into WASM')
  .action(build)
