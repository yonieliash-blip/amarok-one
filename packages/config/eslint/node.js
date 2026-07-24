import globals from "globals";
import { baseConfig } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
