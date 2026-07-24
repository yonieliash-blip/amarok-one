# @amarok-one/web

React + Vite web client for AMAROK ONE.

## Scripts

| Script           | Description                                       |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Start Vite dev server on http://localhost:5173    |
| `pnpm build`     | Type-check and build for production               |
| `pnpm preview`   | Preview production build on http://localhost:4173 |
| `pnpm lint`      | Lint source files                                 |
| `pnpm typecheck` | Type-check without emitting                       |

## Environment

| Variable       | Default                 | Description          |
| -------------- | ----------------------- | -------------------- |
| `VITE_API_URL` | `http://localhost:3000` | Base URL for the API |

Set variables in the root `.env` file (see `.env.example`).

## Dependencies

- `@amarok-one/ui` — shared component library
- `@amarok-one/types` — domain types
- `@amarok-one/utils` — shared utilities
