import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            // Abstract base classes (LayoutStrategy, Renderer) document their
            // full method shape via unimplemented stubs - those params are
            // intentionally unused.
            "no-unused-vars": ["error", { args: "none" }],
        },
    },
    {
        // Core stays framework-agnostic: no DOM/Node globals allowed here,
        // so an accidental `window`/`document` reference is a lint error.
        files: ["tiling-windows/**/*.js"],
        languageOptions: {
            globals: { ...globals.es2021 },
        },
    },
    {
        files: ["tiling-windows-dom/**/*.js", "tiling-windows-demo/**/*.js"],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
    },
    {
        ignores: ["**/node_modules/**", "**/dist/**", "**/.turbo/**"],
    },
    prettierConfig,
];
