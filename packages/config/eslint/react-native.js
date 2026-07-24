import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { baseConfig } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
