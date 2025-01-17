/* global Deno */

import { Command } from '../deps.js'
import { tagsArg, walletArgs } from '../utils.js'
import { VERSION } from '../versions.js'

function sourceArgs (src) {
  return [
    '-e',
    `MODULE_TX=${src}`
  ]
}

/**
 * TODO:
 * - Validate existence of wallet
 * - require confirmation and bypass with --yes
 */
export async function spawn ({ wallet, tag, value, source }) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...sourceArgs(source),
    ...tagsArg({ tags: tag, values: value })
  ]

  const p = Deno.run({
    cmd: [
      'docker',
      'run',
      '--platform',
      'linux/amd64',
      ...cmdArgs,
      '-it',
      `ao-js-cli:${VERSION.IMAGE}`,
      'ao-spawn'
    ]
  })
  await p.status()
}

export const command = new Command()
  .description('Spawn an ao Process using a published ao Module')
  .option(
    '-w, --wallet <path:string>',
    'the path to the wallet that should be used to sign the transaction',
    { required: true }
  )
  .option(
    '-m, --module <txId:string>',
    'the transaction that contains the ao Module',
    { required: true }
  )
  .option(
    '-t, --tag <tag:string>',
    'additional tag to add to the transaction. MUST have a corresponding --value',
    { collect: true }
  )
  .option(
    '-v, --value <value:string>',
    'value of the preceding tag name',
    { collect: true }
  )
  .action(spawn)
