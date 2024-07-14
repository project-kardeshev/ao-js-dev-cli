#include "duktape.h"
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <emscripten.h>

static duk_context *ctx;

// Pre-compiled JavaScript loader program
static const unsigned char js_base_program[] = {__JS_BASE__};
// Pre-compiled entry script which user wrote
static const unsigned char js_main_program[] = {__JS_MAIN__};

// This line will be injected by emcc-duktape as export functions to WASM declaration
__JS_FUNCTION_DECLARATIONS__

static void signal_handler(int sig) {
    printf("Caught signal %d\n", sig);
    // Perform cleanup or error handling
}

static void js_error_handler(duk_context *ctx) {
    duk_safe_to_stacktrace(ctx, -1);
    const char *exception_str = duk_get_string(ctx, -1);
    if (exception_str) {
        fprintf(stderr, "JavaScript error: %s\n", exception_str);
    }
    duk_pop(ctx);
}

int main(void) {
    // Set up signal handler
    signal(SIGINT, signal_handler);

    // Initialize Duktape context
    ctx = duk_create_heap_default();
    if (!ctx) {
        fprintf(stderr, "Failed to create Duktape context\n");
        return 1;
    }

    // Evaluate the base JavaScript code
    if (duk_peval_lstring(ctx, (const char*)js_base_program, sizeof(js_base_program)) != 0) {
        js_error_handler(ctx);
        duk_destroy_heap(ctx);
        return 1;
    }
    duk_pop(ctx);

    // Inject additional JavaScript files
    __INJECT_JS_FILES__

    // Evaluate the main JavaScript code
    if (duk_peval_lstring(ctx, (const char*)js_main_program, sizeof(js_main_program)) != 0) {
        js_error_handler(ctx);
        duk_destroy_heap(ctx);
        return 1;
    }
    duk_pop(ctx);

    // Clean up
    duk_destroy_heap(ctx);

    return 0;
}
