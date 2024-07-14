// This script is a bridge program for WASM
const args = process.argv.slice(2);
const jsBundle = JSON.parse(args[0]);

Math.random = function() {
    return 0.5; // Replace with any value you want
};

// Inline loader
// In WASM, all JS scripts will be compiled as byte strings and set to jsBundle object.
// This loader will resolve by module name and evaluate it.
function inlineLoader(name) {
    const mod = jsBundle[name] || jsBundle[name + '.init'];
    if (!mod) throw new Error(`module ${name} not found`);
    if (typeof mod === 'string') {
        const script = mod;
        try {
            return new Function(script);
        } catch (err) {
            throw new Error(`error loading module ${name}: ${err}`);
        }
    } else if (typeof mod === 'function') {
        return mod;
    }
}

globalThis.inlineLoader = inlineLoader;

// The __js_webassembly__ module will be injected via the C program.
const main = inlineLoader('__js_webassembly__');
main();

// Export function call wrapper (commented out as in the original)
// function jsCall(functionName, ...args) {
//     for (const [k, v] of Object.entries(exports)) {
//         console.log(k);
//     }
//     console.log(exports['hello_world']);
//     console.log(functionName.length);
//     console.log(functionName === 'hello_world');
//     console.log(functionName === 'hello_world');
//     console.log(typeof functionName);

//     const mod = exports[functionName];
//     if (!mod) {
//         console.log(`Module ${functionName} isn't exported`);
//         return;
//     } else if (typeof mod !== 'object') {
//         console.log(`Module ${functionName} exported but not an object`);
//         return;
//     }

//     const fn = mod.fn;
//     if (!fn) {
//         console.log(`Module ${functionName}.fn is not defined`);
//         return;
//     } else if (typeof fn !== 'function') {
//         console.log(`Module ${functionName}.fn is not a function`);
//         return;
//     }
//     // Call exported function
//     return fn(...args);
// }
