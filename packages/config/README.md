# @amarok-one/config

Shared TypeScript and ESLint configuration presets for the AMAROK ONE monorepo.

## TypeScript presets

| Export                                            | Use case                  |
| ------------------------------------------------- | ------------------------- |
| `@amarok-one/config/typescript/base.json`         | Library packages          |
| `@amarok-one/config/typescript/node.json`         | Node.js apps and services |
| `@amarok-one/config/typescript/react.json`        | React web apps            |
| `@amarok-one/config/typescript/react-native.json` | Expo / React Native apps  |

## ESLint presets

| Export                                   | Use case                 |
| ---------------------------------------- | ------------------------ |
| `@amarok-one/config/eslint/base`         | Base TypeScript rules    |
| `@amarok-one/config/eslint/react`        | React + Vite apps        |
| `@amarok-one/config/eslint/react-native` | Expo / React Native apps |
| `@amarok-one/config/eslint/node`         | Node.js services         |

## Usage

```js
// eslint.config.js
import nodeConfig from "@amarok-one/config/eslint/node";
export default nodeConfig;
```

```json
{
  "extends": "@amarok-one/config/typescript/node.json"
}
```
