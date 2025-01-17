import os

class JSFile():
    def __init__(self, filepath, basename=None):
        self.filepath = filepath
        if basename:
            self.basename = basename
        else:
            self.basename = os.path.basename(filepath)

        module_name = os.path.splitext(self.basename)[0].replace('/', '.')
        if module_name.startswith('.src'):
            module_name = module_name.replace('.src', '', 1)
        self.module_name = module_name


class ModuleFile():
    def __init__(self, filepath, jsopen_name):
        self.filepath = filepath
        self.module_name = jsopen_name
        self.basename = jsopen_name.replace('_', '.')


class BundleFile(JSFile):
    def __init__(self, filepath):
        super().__init__(filepath)
        self.filepath = os.path.relpath(filepath)
