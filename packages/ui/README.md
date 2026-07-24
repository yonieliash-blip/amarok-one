# @amarok-one/ui

Shared React component library for AMAROK ONE web applications.

## Components

- `Badge` — status indicator
- `Button` — primary and secondary actions
- `Card` — content container
- `Logo` — brand mark

## Usage

```tsx
import { Button, Card } from "@amarok-one/ui";
import "@amarok-one/ui/styles.css";
```

Built with [tsup](https://tsup.egoist.dev/). CSS is bundled separately — import `styles.css` in your app entry point.

## Development

```bash
pnpm --filter @amarok-one/ui dev   # watch mode
pnpm --filter @amarok-one/ui build
```
