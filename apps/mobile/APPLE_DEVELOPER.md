# Apple Developer & TestFlight readiness (Sprint 5.3 — Task I1)

This document tracks what is prepared in the repository versus what the **project owner** must complete in Apple and Expo portals before the first TestFlight upload.

## Repository identifiers (do not change without updating Apple Developer)

| Item                      | Value                  |
| ------------------------- | ---------------------- |
| App display name          | AMAROK ONE             |
| Expo slug                 | `amarok-one-mobile`    |
| iOS bundle ID             | `com.amarokone.mobile` |
| Android package           | `com.amarokone.mobile` |
| Initial marketing version | `1.0.0`                |
| Initial iOS build number  | `1`                    |

## Owner checklist (manual — Apple Developer Program)

Complete these in order after repository config is merged:

1. **Apple Developer Program** — Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/) as **Organization** (recommended) or Individual.
2. **Apple ID** — Enable two-factor authentication on the account that will be Account Holder or Admin.
3. **D-U-N-S Number** — Required for Organization enrollment (allow 1–2 weeks if not already registered).
4. **Register App ID** — In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list), register `com.amarokone.mobile` (explicit App ID).
5. **App Store Connect app** — Create a new iOS app with the same bundle ID, name **AMAROK ONE**, primary language, and SKU (e.g. `amarok-one-mobile`).
6. **Export compliance** — `ITSAppUsesNonExemptEncryption` is set to `false` in `app.json` (standard HTTPS only). Confirm in App Store Connect when submitting.
7. **Expo account & EAS project** — Run `pnpm exec eas login` and `pnpm exec eas init` from `apps/mobile` (links EAS project; adds `extra.eas.projectId` to config).
8. **Apple Team ID** — Note the 10-character Team ID from Apple Developer → Membership for EAS credentials.
9. **App Store Connect API key (recommended)** — Create in App Store Connect → Users and Access → Keys, for non-interactive `eas submit`.

## EAS build profiles (`eas.json`)

| Profile       | Purpose                                                              |
| ------------- | -------------------------------------------------------------------- |
| `development` | Dev client, iOS simulator                                            |
| `preview`     | Internal device build (Ad Hoc / internal distribution)               |
| `production`  | App Store / TestFlight (`distribution: store`, auto-increment build) |

Set `EXPO_PUBLIC_API_URL` to your **HTTPS staging API** in the EAS project environment before the first production iOS build.

## Commands (after Apple + Expo setup)

From repository root:

```bash
pnpm install
cd apps/mobile
pnpm exec eas login
pnpm exec eas init
pnpm exec eas credentials   # iOS distribution cert + provisioning (guided)
pnpm exec eas build --platform ios --profile production
pnpm exec eas submit --platform ios --profile production
```

## Related files

- `app.json` — bundle ID, version, build number, icon, splash, privacy strings, encryption flag
- `eas.json` — EAS Build and Submit profiles
- `.easignore` — upload exclusions
- `assets/icon.png`, `assets/splash-icon.png` — store-required imagery
- `.env.example` — `EXPO_PUBLIC_API_URL` documentation
