// pack.js
// released under the Romantic WTF Public License
// http://getmoai.com/wiki/index.php?title=User:Pygy/Romantic_WTF_Public_License

const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const files = {};

const root = args[0].replace(/\/$/, '').replace(/\\$/, '');

function scandir(root, dirPath = '') {
    // adapted from http://keplerproject.github.com/luafilesystem/examples.html
    const fullPath = path.join(root, dirPath);
    const items = fs.readdirSync(fullPath);
    
    for (const item of items) {
        if (item !== '.' && item !== '..') {
            const relativePath = path.join(dirPath, item);
            const itemPath = path.join(fullPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                scandir(root, relativePath);
            } else {
                if (item.endsWith('.js')) {
                    let hndl = relativePath.replace(/\.js$/, '')
                                           .replace(/\//g, '.')
                                           .replace(/\\/g, '.')
                                           .replace(/^\./, '')
                                           .replace(/\.init$/, '');
                    files[hndl] = fs.readFileSync(itemPath, 'utf-8');
                }
            }
        }
    }
}

scandir(root);

const acc = [];

const wrapper = [
    "\n--------------------------------------\npackage.preload['",
    null, "'] = function (...)\n", null, "\nend\n"
];

for (const [k, v] of Object.entries(files)) {
    wrapper[1] = k;
    wrapper[3] = v;
    acc.push(wrapper.join(''));
}

acc.push(`
-----------------------------------------------

do {
  if (!package.__loadfile) {
    const originalLoadFile = require;
    function lf(file) {
      const hndl = file.replace(/\\.js$/, '')
                       .replace(/\\//g, '.')
                       .replace(/\\\\/g, '.')
                       .replace(/\\.init$/, '');
      return package.preload[hndl] || originalLoadFile(file);
    }

    function dofile(name) {
      return lf(name)();
    }

    require = lf;
    package.__loadfile = originalLoadFile;
  }
}
`);

if (files.main) {
    acc.push('\ndofile("main.js");');
}

console.log(acc.join(''));
