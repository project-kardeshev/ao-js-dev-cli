import AoLoader from '@permaweb/ao-loader';
import fs from 'node:fs';
import path from 'node:path';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const wasmBinary = fs.readFileSync(path.join(dirname, './process-out.wasm'));
const AO_LOADER_OPTIONS = {
  format: 'wasm64-unknown-emscripten-draft_2024_02_15',
  inputEncoding: 'JSON-1',
  outputEncoding: 'JSON-1',
  memoryLimit: '524288000', // in bytes
  computeLimit: (9e12).toString(),
  extensions: [],
};


async function loadAo() {
  const handle = await AoLoader(wasmBinary, AO_LOADER_OPTIONS);
    const evalRes = await handle(
    null,
    {
      ...DEFAULT_HANDLE_OPTIONS,
      Tags: [
        { name: 'Action', value: 'Eval' },
        { name: 'Module', value: ''.padEnd(43, '1') },
      ],
      Data: 'console.log(1 + 1, "should be 2")',
    },
    AO_LOADER_HANDLER_ENV,
  );
  console.log(evalRes)
}

loadAo()