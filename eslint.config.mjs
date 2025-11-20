import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tailwindcss from "eslint-plugin-tailwindcss";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: [
        ...next,
        ...nextCoreWebVitals,
        ...compat.extends("plugin:tailwindcss/recommended"),
        ...compat.extends("plugin:@typescript-eslint/recommended"),
        ...compat.extends("prettier")
    ],

    plugins: {
        tailwindcss,
    },

    rules: {
        "@typescript-eslint/no-explicit-any": "off",
    },
}, {
    files: ["**/*.ts", "**/*.tsx", "**/*.js"],

    languageOptions: {
        parser: tsParser,
    },
}]);