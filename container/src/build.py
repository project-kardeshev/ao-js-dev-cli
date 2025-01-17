#!/usr/bin/env python3

import sys
import os
import glob
import re
import shutil
from shlex import quote
import subprocess

sys.path.append('/usr/local/emcc-duktape')

from emcc_duktape_lib.definition import Definition
from emcc_duktape_lib.file import JSFile, ModuleFile, BundleFile
from emcc_duktape_lib.helper import is_js_source_file, is_binary_library, encode_hex_literals, shell_exec, debug_print

CC = os.environ.get('CC', 'cc')
NM = os.environ.get('NM', 'nm')
DUKTAPE_LOCAL_MODULE_DIR = '/src/modules'
DUKTAPE_LOCAL_MODULE_PREFIX_RE = re.compile(re.escape(DUKTAPE_LOCAL_MODULE_DIR) + '\/share\/js\/\d+.\d+/')

def __get_uname():
    uname = ''
    try:
        uname, _ = shell_exec('uname', '-s')
    except(subprocess.CalledProcessError):
        uname = 'Unknown'

    return uname

def __get_output(output, entry_file):
    out_file = os.path.basename(entry_file)
    if output.get('file'):
        out_file = output.get('file')

    tpl = os.path.splitext(out_file)[1]
    if not tpl[1]:
        tpl[1] = 'html'

    return '{}.{}'.format(tpl[0], tpl[1])

def main():
    uname = __get_uname()

    js_files = []
    library_files = []
    link_libraries = []
    dependency_libraries = []

    definition = Definition('/opt/definition.yml')
    entry_file = '/opt/loader.js'

    if not is_js_source_file(entry_file):
        print('main file of {} must be JS script.'.format(entry_file))
        return

    definition.install_dependencies(DUKTAPE_LOCAL_MODULE_DIR)

    local_include_dir = os.path.join(os.path.dirname(entry_file), 'src')
    local_include_prefix_re = re.compile(re.escape(local_include_dir + '/'))

    bundle_files = glob.glob('/src/**/*.js', recursive=True)
    bundle_files += glob.glob(local_include_dir + '/**/*.js', recursive=True)
    bundle_files += glob.glob(local_include_dir + '/**/*.so', recursive=True)
    bundle_files += glob.glob(DUKTAPE_LOCAL_MODULE_DIR + '/lib/js/**/*.so', recursive=True)
    bundle_files += glob.glob(DUKTAPE_LOCAL_MODULE_DIR + '/share/js/**/*.js', recursive=True)
    debug_print('Start to factory and distinguish module files')

    for bundle in bundle_files:
        if is_js_source_file(bundle):
            basename = re.sub(DUKTAPE_LOCAL_MODULE_PREFIX_RE, '', bundle)
            basename = re.sub(local_include_prefix_re, '', basename)
            js_files.append(JSFile(bundle, basename))
            continue

        if is_binary_library(bundle):
            try:
                nm, _ = shell_exec(NM, bundle)
                is_module = False

                for jsopen in re.finditer(r'[^dD] _?jsopen_([0-9a-zA-Z!"#\$%&\'\(\)\*\+,\-\.\/:;\<=\>\?@\[\]^_`\{\|\}~]+)', nm):
                    debug_print('jsopen_{} function found. add to library in {}'.format(jsopen.group(1), bundle))
                    library_files.append(ModuleFile(bundle, jsopen.group(1)))
                    is_module = True

                if is_module:
                    link_libraries.append(BundleFile(bundle))
                else:
                    dependency_libraries.append(BundleFile(bundle))

            except(subprocess.CalledProcessError):
                print(NM + ' command failed')
                return

    debug_print('===== Bundle JS files ======')
    debug_print('\n'.join([v.filepath for v in js_files]))
    debug_print('===== Library files =====')
    debug_print('\n'.join([v.filepath for v in library_files]))
    debug_print('===== Link libraries =====')
    debug_print('\n'.join([v.filepath for v in link_libraries]))
    debug_print('===== Dependency libraries =====')
    debug_print('\n'.join([v.filepath for v in dependency_libraries]))

    debug_print('Start to generate compile.c')

    with open('/opt/main.js', mode='r') as js:
        js_program = js.read()

        with open('/opt/main.c', mode='r') as c:
            c_program = c.read()
            c_program = c_program.replace('__JS_BASE__', encode_hex_literals(js_program))
            with open(entry_file, mode='r') as main_file:
                p = main_file.read()
                c_program = c_program.replace('__JS_MAIN__', encode_hex_literals(p))

            inject_js_files = []
            for i, f in enumerate(js_files):
                with open(f.filepath, mode='r') as j:
                    lines = j.readlines()
                    if lines[0].find("\xef\xbb\xbf") != -1:
                        lines[0] = lines[0][4:]
                    elif lines[0][0] == '#':
                        lines = lines[1:]

                    inject_js_files.extend([
                        '  static const unsigned char js_require_{}[] = {{{}}};'.format(i, encode_hex_literals('\n'.join(lines))),
                        '  duk_eval_raw(ctx, (const char*)js_require_{}, sizeof(js_require_{}), DUK_COMPILE_EVAL);'.format(i, i)
                    ])

            for f in library_files:
                inject_js_files.extend([
                    '  int jsopen_{}(duk_context* ctx);'.format(f.module_name),
                    '  duk_push_c_function(ctx, jsopen_{}, 0); duk_put_global_string(ctx, "{}");'.format(f.module_name, f.basename)
                ])

            c_program = c_program.replace('__JS_FUNCTION_DECLARATIONS__', definition.make_function_declarations())
            c_program = c_program.replace('__INJECT_JS_FILES__', '\n'.join(inject_js_files))

            with open('/tmp/compile.c', mode='w') as build:
                build.write(c_program)

    debug_print('Start to compile as WASM')
    cmd = ['emcc', '-O3', 
      '-g2',
      '-s', 'ASYNCIFY=1',
      '-s', 'MEMORY64=1',
      '-s', 'STACK_SIZE=41943040',
      '-s', 'ASYNCIFY_STACK_SIZE=41943040',
      '-s', 'ALLOW_MEMORY_GROWTH=1', 
      '-s', 'INITIAL_MEMORY=52428800', 
      '-s', 'MAXIMUM_MEMORY=524288000', 
      '-s', 'WASM=1', 
      '-s', 'MODULARIZE', 
      '-s', 'DETERMINISTIC=1', 
      '-s', 'NODERAWFS=0', 
      '-s', 'FORCE_FILESYSTEM=1',
      '-msimd128',
      '--pre-js', '/opt/pre.js'
    ]
    cmd.extend(['-L/opt/aolibc', '-l:aolibc.a'])
    cmd.extend(['-s', 'ASSERTIONS=1'])
    cmd.extend(definition.get_extra_args())
    cmd.extend(['-I', quote('/duktape/preconfigured')])
    cmd.extend(['/tmp/compile.c', quote('/duktape/preconfigured/libduktape.a')])
    cmd.extend([quote(v.filepath) for v in link_libraries])
    cmd.extend([quote(v.filepath) for v in dependency_libraries])

    cmd.extend(['-s', 'EXPORTED_FUNCTIONS=["_malloc", "_main"]'])
    cmd.extend(['-lm', '-ldl', '-o', definition.get_output_file(), '-s', 'EXPORTED_RUNTIME_METHODS=["cwrap"]'])

    debug_print('Compile command is {}'.format(' '.join(cmd)))
    shell_exec(*cmd)

if __name__ == '__main__':
    main()

    if os.path.isdir(DUKTAPE_LOCAL_MODULE_DIR):
        shutil.rmtree(DUKTAPE_LOCAL_MODULE_DIR)
