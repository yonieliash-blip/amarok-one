# Applications

Deployable applications in the AMAROK ONE monorepo.

| Package              | Directory          | Description             |
| -------------------- | ------------------ | ----------------------- |
| `@amarok-one/web`    | [web/](web/)       | React + Vite web client |
| `@amarok-one/api`    | [api/](api/)       | Hono REST API           |
| `@amarok-one/mobile` | [mobile/](mobile/) | Expo React Native app   |

## Quick start

```bash
pnpm --filter @amarok-one/web dev
pnpm --filter @amarok-one/api dev
pnpm --filter @amarok-one/mobile dev
```

Legacy directories (`frontend/`, `backend/`) are not part of the workspace and will be migrated in a future step.
