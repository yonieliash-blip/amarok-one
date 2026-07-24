# AMAROK ONE

**ERP and Field Service Management for Construction Equipment and Forklifts**

AMAROK ONE is an enterprise platform for managing construction equipment and forklift operations — inventory, field service, maintenance workflows, and business operations in one system.

---

## Monorepo Structure

This repository is a [pnpm](https://pnpm.io/) workspace orchestrated by [Turborepo](https://turbo.build/).

```
amarok-one/
├── apps/
│   ├── web/              @amarok-one/web      — React + Vite
│   ├── api/              @amarok-one/api      — Hono REST API
│   └── mobile/           @amarok-one/mobile   — Expo React Native
├── packages/
│   ├── config/           @amarok-one/config   — Shared TS & ESLint presets
│   ├── types/            @amarok-one/types    — Domain types
│   ├── utils/            @amarok-one/utils    — Shared utilities
│   └── ui/               @amarok-one/ui       — React component library
├── infrastructure/       Docker & deployment configs
├── docs/                 Project documentation
└── .github/              GitHub Actions and issue templates
```

## Prerequisites

| Tool                                 | Version |
| ------------------------------------ | ------- |
| [Node.js](https://nodejs.org/)       | ≥ 20    |
| [pnpm](https://pnpm.io/installation) | ≥ 9     |

Enable Corepack (recommended):

```bash
corepack enable
corepack prepare pnpm@10.12.4 --activate
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Build entire workspace
pnpm build

# Start all dev servers
pnpm dev

# Lint and type-check
pnpm lint
pnpm typecheck
```

### Run individual apps

```bash
pnpm --filter @amarok-one/web dev      # http://localhost:5173
pnpm --filter @amarok-one/api dev      # http://localhost:3000
pnpm --filter @amarok-one/mobile dev   # Expo dev server
```

Copy `.env.example` to `.env` before running the API locally.

## Available Scripts

| Script              | Description                               |
| ------------------- | ----------------------------------------- |
| `pnpm dev`          | Start development servers across apps     |
| `pnpm build`        | Build all apps and packages               |
| `pnpm lint`         | Lint all workspace packages via Turborepo |
| `pnpm lint:root`    | Lint root-level config files              |
| `pnpm typecheck`    | Type-check all TypeScript projects        |
| `pnpm format`       | Format all files with Prettier            |
| `pnpm format:check` | Verify formatting without writing         |
| `pnpm clean`        | Clear Turborepo and build caches          |

## Tech Stack

| Layer    | Technology                  |
| -------- | --------------------------- |
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript                  |
| Web      | React 19 + Vite             |
| API      | Hono + Node.js              |
| Mobile   | Expo + React Native         |
| Quality  | ESLint + Prettier           |

## Documentation

| Document                                                     | Description                           |
| ------------------------------------------------------------ | ------------------------------------- |
| [AGENTS.md](AGENTS.md)                                       | **Mandatory rules for coding agents** |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                 | System design and architecture        |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md)         | Code conventions and quality bar      |
| [docs/SECURITY.md](docs/SECURITY.md)                         | Security requirements                 |
| [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) | Development process and verification  |
| [docs/MONOREPO.md](docs/MONOREPO.md)                         | Monorepo guide and conventions        |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                     | Deployment procedures                 |
| [docs/BACKUP.md](docs/BACKUP.md)                             | Backup and recovery                   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                           | Contribution guidelines               |

## License

UNLICENSED — private project. License terms to be determined.

## Contact

Open an issue on GitHub for questions or bug reports.
