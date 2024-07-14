/* global Deno */

import { Command } from '../deps.js'

const JS = `
const process = { _version: "0.0.1" };

process.handle = function(msg, ao) {
    if (!ao.isTrusted(msg)) {
        throw new Error('ao Message is not trusted');
    }

    if (msg.Data === "ping") {
        ao.send({ Target: msg.From, Data: "pong" });
    }

    return ao.result({
        Output: 'sent pong reply'
    });
};

module.exports = process;

`

export function init (_, name) {
  // const config = {
  //   name,
  //   entry: 'src/main.js',
  //   output: `${name}.js`
  // }
  return Deno.mkdir(`./${name}`, { recursive: true })
    .then((_) => Deno.writeTextFile(`./${name}/process.js`, JS))
}

export const command = new Command()
  .description('Create an ao Process Source Project')
  .arguments('<name:string>')
  .action(init)
