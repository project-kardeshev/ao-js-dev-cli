import os
import sys
import yaml
from .helper import shell_exec, debug_print

class Definition():
    dependencies = []
    functions = []
    entry_file = ''
    output_file = ''
    extra_compile_arguments = {}
    pre_js = ''

    def __init__(self, definition_file):
        if not os.path.isfile(definition_file):
            print('{} does not exist. need to place it'.format(definition_file))
            sys.exit(1)

        with open(definition_file, mode='r') as definition:
            data = yaml.safe_load(definition)
            self.dependencies = data.get('dependencies', [])
            self.functions = data.get('functions', [])
            self.entry_file = data.get('entry_file', '')
            self.output_file = data.get('output_file', '')
            self.extra_compile_arguments = data.get('extra_args', {})
            self.pre_js = data.get('pre_js', '')

    def get_entry_file(self):
        if not self.entry_file:
            return os.path.join(os.getcwd(), 'main.js')

        return os.path.abspath(self.entry_file)

    def get_extra_args(self):
        args = []
        for key, val in self.extra_compile_arguments.items():
            args.extend(['-s', '{}={}'.format(key, val)])

        if self.pre_js:
            if not os.path.isfile(self.pre_js):
                print('pre_js: {} does not exist. need to place it'.format(self.pre_js))
                sys.exit(1)

            args.extend(['--pre-js', self.pre_js])

        return args

    def get_output_file(self):
        if self.output_file:
            return self.output_file

        return '{}.html'.format(os.path.splitext(os.path.basename(self.entry_file))[0])

    def install_dependencies(self, local_module_dir):
        for mod in self.dependencies:
            print('Install module {} via npm...'.format(mod))
            # install locally
            shell_exec('npm', 'install', '--prefix', local_module_dir, mod)

    def make_function_declarations(self):
        template = '''
EMSCRIPTEN_KEEPALIVE
{} {}({}) {{
  if (ctx == NULL) {{
    ctx = duk_create_heap_default();
  }}
  // Push arguments
  duk_push_global_object(ctx);
  duk_get_prop_string(ctx, -1, "{}");
  if (!duk_is_function(ctx, -1)) {{
    printf("function {} is not defined globally in JS runtime\\n");
    duk_pop(ctx);  // Pop the non-function value
    {}
  }}
{}

  // Call JS function
  duk_push_global_object(ctx);
  {};
  if (duk_pcall(ctx, {}) != DUK_EXEC_SUCCESS) {{
    printf("failed to call {} function\\n");
    const char* error = duk_safe_to_string(ctx, -1);
    printf("error: %s\\n", error);
    duk_pop(ctx);  // Pop error
    {}
  }}

  // Handle return values
{}
  duk_pop(ctx);  // Pop global object and result
}}
'''
        wasm_functions = []
        for name, config in self.functions.items():
            arguments = []
            push_arguments = []
            return_type = config.get('return', 'void')
            arg_values = []
            for i, arg in enumerate(config.get('args', [])):
                if arg == 'int':
                    arguments.append('int arg_{}'.format(i))
                    push_arguments.append('duk_push_int(ctx, arg_{});'.format(i))
                elif arg == 'string':
                    arguments.append('const char* arg_{}'.format(i))
                    push_arguments.append('duk_push_string(ctx, arg_{});'.format(i))
                arg_values.append('')

            failed_return_value = ''
            capture_return_value = ''
            if return_type == 'int':
                failed_return_value = 'return 0;'
                capture_return_value = '''if (duk_is_number(ctx, -1)) {{
    int return_value = duk_get_int(ctx, -1);
    duk_pop(ctx);  // Pop return value
    return return_value;
  }}
  return 0;'''
            elif return_type == 'string':
                failed_return_value = 'return "";'
                capture_return_value = '''if (duk_is_string(ctx, -1)) {{
    const char* return_value = duk_get_string(ctx, -1);
    duk_pop(ctx);  // Pop return value
    return return_value;
  }}
  return "";'''
                return_type = 'const char* '

            function = template.format(
                    return_type,
                    name,
                    ', '.join(arguments),
                    name,
                    name,
                    failed_return_value,
                    '\n'.join(push_arguments),
                    '\n'.join(arg_values),
                    len(push_arguments),
                    name,
                    failed_return_value,
                    capture_return_value)
            debug_print(function)
            wasm_functions.append(function)

        return '\n'.join(wasm_functions)

