/*
 * Same style canon as starci-academy-backend: 4-space indent, double quotes, no semicolons,
 * one element / one property / one call argument per line, and no `any`.
 *
 * The backend-only canon rules (@starci/eslint-canon-be: exceptions, EntityManager, CQRS...) do
 * not apply to a game engine, so only the shared formatting and type-safety rules live here.
 */
import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import {
    defineConfig
} from "eslint/config"

const SOURCES = [
    "packages/*/src/**/*.ts",
    "packages/*/src/**/*.tsx",
    "scripts/*.ts",
]

export default defineConfig([
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            ".work/**",
            "scripts/_variants/**",
            "packages/client/public/**",
        ],
    },
    {
        files: SOURCES,
        plugins: {
            js
        },
        extends: ["js/recommended"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ["packages/client/src/**/*.{ts,tsx}"],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: SOURCES,
    })),
    {
        files: SOURCES,
        rules: {
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "array-element-newline": ["error",
                "always"],
            "object-curly-newline": [
                "error",
                {
                    "ObjectExpression": "always",
                    "ImportDeclaration": "always",
                }
            ],
            "function-call-argument-newline": ["error",
                "always"],
            indent: ["error",
                4],
            "linebreak-style": "off",
            "no-trailing-spaces": "error",
            quotes: ["error",
                "double"],
            semi: ["error",
                "never"],
        },
    },
])
