# @amarok-one/mobile

Expo React Native mobile app for AMAROK ONE field technicians.

## Background shift location

Employees can explicitly enable background GPS during an active work day. Sampling stops at
clock-out or sign-out, and samples collected while the app cannot reach the API remain in a bounded
device queue. Background location uses native iOS/Android capabilities, so it must be tested in a
development or TestFlight build rather than Expo Go.

## Apple Developer & TestFlight

See [APPLE_DEVELOPER.md](./APPLE_DEVELOPER.md) for the Sprint 5.3 readiness checklist and owner actions (Apple Developer Program, App Store Connect, EAS).

For the first EAS iOS build workflow, see [EAS_BUILD.md](./EAS_BUILD.md).

## Prerequisites

- [Expo Go](https://expo.dev/go) on a physical device, or Android/iOS simulators
- For TestFlight: Apple Developer Program membership and [EAS Build](https://docs.expo.dev/build/introduction/)

## Scripts

| Script           | Description                        |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Start Expo dev server              |
| `pnpm android`   | Open on Android emulator or device |
| `pnpm ios`       | Open on iOS simulator (macOS only) |
| `pnpm build`     | Type-check the project             |
| `pnpm lint`      | Lint source files                  |
| `pnpm typecheck` | Type-check without emitting        |
| `pnpm test`      | Run unit tests                     |

EAS monorepo hooks (used by EAS Build cloud): `eas-build-pre-install`, `eas-build-post-install`.

## Environment

| Variable              | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | API base URL for release builds (must be HTTPS for TestFlight devices) |

Documented in root [`.env.example`](../../.env.example).

## Monorepo setup

Metro is configured to resolve workspace packages from the monorepo root. Run `pnpm build` at the repository root before starting the mobile app so shared packages are compiled.
