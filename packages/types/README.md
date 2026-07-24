# @amarok-one/types

Shared TypeScript domain types for AMAROK ONE.

Contains API envelopes, health check shapes, and core domain models (`Equipment`, `User`, etc.) used across all apps and packages.

## Usage

```ts
import type { Equipment, HealthStatus } from "@amarok-one/types";
```

Build output is emitted to `dist/` and must be built before dependent packages compile:

```bash
pnpm --filter @amarok-one/types build
```
