# EAS iOS Build — Next Steps (Sprint 5.3)

Repository-side preparation for the **first successful EAS iOS build**. Complete the owner steps below in order.

## Repository status (automated checks)

| Check                                                         | Status                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Monorepo EAS hooks (`eas-build-pre-install` / `post-install`) | Configured; post-install builds workspace packages                                      |
| `eas.json` profiles + Node 22                                 | Configured                                                                              |
| App icon / splash (1024×1024 square)                          | Run `pnpm assets:fix-store` after updating source art                                   |
| `expo-doctor` schema (icon dimensions)                        | Must pass before cloud build                                                            |
| Expo account login                                            | **Done** — CLI authenticated (`amarok-ce` / `@amaroksoftware`)                          |
| EAS project link (`extra.eas.projectId`)                      | **Done** — `@amaroksoftware/amarok-one-mobile` (`0c83bdd6-6c4a-432d-862d-edaaf68c837c`) |
| Apple distribution credentials                                | **Required — owner action**                                                             |
| `EXPO_PUBLIC_API_URL` (HTTPS staging)                         | **Required in EAS env before production build**                                         |

## 1. Install EAS CLI (do not add to package.json)

From any directory:

```bash
npm install -g eas-cli
# or per build:
pnpm dlx eas-cli@16 build --platform ios --profile production
```

## 2. Log in to Expo (CLI session required)

Logging into [expo.dev](https://expo.dev) in a browser does **not** authenticate the EAS CLI on your machine. Run this in a **local terminal** (not only the website):

```bash
cd apps/mobile
pnpm run eas:whoami    # should print your Expo username
pnpm dlx eas-cli@16 login
pnpm run eas:whoami    # verify login succeeded
```

**Alternative (recommended for CI / agents):** create a token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens), add to root `.env` (never commit):

```
EXPO_TOKEN=your_token_here
```

Then verify:

```bash
cd apps/mobile
pnpm run eas:whoami
```

## 3. Link EAS project

**Status: complete.** Project: [@amaroksoftware/amarok-one-mobile](https://expo.dev/accounts/amaroksoftware/projects/amarok-one-mobile)  
Project ID: `0c83bdd6-6c4a-432d-862d-edaaf68c837c` (in `app.json` → `extra.eas.projectId`).

If you need to re-link on another machine:

```bash
cd apps/mobile
pnpm run eas:init
```

## 4. Set release API URL in EAS

TestFlight devices cannot reach `localhost`. In [expo.dev](https://expo.dev) → your project → **Environment variables**, set:

| Name                  | Profile      | Example                              |
| --------------------- | ------------ | ------------------------------------ |
| `EXPO_PUBLIC_API_URL` | `production` | `https://staging-api.yourdomain.com` |

## 5. Apple credentials (first iOS build)

Requires Apple Developer Program membership and interactive setup:

```bash
cd apps/mobile
eas credentials
```

EAS can generate distribution certificate and provisioning profile when you are logged into Apple Developer (may require 2FA).

## 6. Trigger the build

```bash
cd apps/mobile
eas build --platform ios --profile production
```

Monitor at [expo.dev](https://expo.dev). On success, submit to TestFlight:

```bash
eas submit --platform ios --profile production
```

## Monorepo notes

- Run all `eas` commands from `apps/mobile`.
- Git root must remain the monorepo root (not `apps/mobile/.git`).
- Do **not** add `pnpm-lock.yaml` or `pnpm-workspace.yaml` to `.easignore`.
- `eas-build-pre-install` uses Corepack + `pnpm install --frozen-lockfile` at repo root (Linux on EAS; local Windows may fail on `corepack enable` without admin — that is expected).

## Local validation (no Apple account)

```bash
# From apps/mobile
pnpm run assets:fix-store   # after changing icon/splash source files
pnpm dlx expo-doctor
pnpm run eas-build-post-install
pnpm typecheck
pnpm test
```

## Related docs

- [APPLE_DEVELOPER.md](./APPLE_DEVELOPER.md) — Apple enrollment and App Store Connect
- [README.md](./README.md) — Mobile app overview
