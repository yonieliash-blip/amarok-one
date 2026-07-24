import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import { baseConfig } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
