# Shared Packages

Internal libraries shared across AMAROK ONE applications.

| Package                   | Directory                    | Description                   |
| ------------------------- | ---------------------------- | ----------------------------- |
| `@amarok-one/config`      | [config/](config/)           | TypeScript and ESLint presets |
| `@amarok-one/types`       | [types/](types/)             | Domain TypeScript types       |
| `@amarok-one/utils`       | [utils/](utils/)             | Shared utility functions      |
| `@amarok-one/ui`          | [ui/](ui/)                   | React component library       |
| `@amarok-one/permissions` | [permissions/](permissions/) | RBAC permission engine        |

All packages use the `@amarok-one/*` scope and are linked via pnpm workspace protocol (`workspace:*`).

Build packages before running apps:

```bash
pnpm build
```
