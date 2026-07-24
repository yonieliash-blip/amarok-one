# @amarok-one/mobile

Expo React Native mobile app for AMAROK ONE field technicians.

## Prerequisites

- [Expo Go](https://expo.dev/go) on a physical device, or Android/iOS simulators

## Scripts

| Script           | Description                        |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Start Expo dev server              |
| `pnpm android`   | Open on Android emulator or device |
| `pnpm ios`       | Open on iOS simulator (macOS only) |
| `pnpm build`     | Type-check the project             |
| `pnpm lint`      | Lint source files                  |
| `pnpm typecheck` | Type-check without emitting        |

## Monorepo setup

Metro is configured to resolve workspace packages from the monorepo root. Run `pnpm build` at the repository root before starting the mobile app so shared packages are compiled.
