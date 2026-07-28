# AMAROK ONE — Design System v1

**Status:** Foundation (tokens + specification). Existing screens are **not** migrated yet.

**Audience:** Web (`apps/web`), shared UI (`packages/ui`), and future mobile surfaces.

**Principles:** Dark industrial theme, Hebrew-first RTL, high contrast for field use, amber primary accent, minimal chrome, API-driven data (no decorative fake metrics).

**Token source of truth:** `apps/web/src/design-system/tokens.css` (`--ds-*` variables). Legacy `--amarok-*` aliases map to the same values for current CSS.

---

## 1. Color palette

### Brand

| Token                         | Role                            | Value / reference |
| ----------------------------- | ------------------------------- | ----------------- |
| `--ds-color-primary`          | Primary actions, key highlights | `#f5c518`         |
| `--ds-color-primary-hover`    | Primary hover                   | `#e0b310`         |
| `--ds-color-primary-on`       | Text/icons on primary           | `#141414`         |
| `--ds-color-secondary`        | Secondary surfaces (buttons)    | `#2e2e2e`         |
| `--ds-color-secondary-hover`  | Secondary hover                 | `#353535`         |
| `--ds-color-secondary-on`     | Text on secondary               | `#f3f4f6`         |
| `--ds-color-secondary-border` | Secondary outline               | `#3a3a3a`         |

### Semantic

| Token                                   | Use                                     |
| --------------------------------------- | --------------------------------------- |
| `--ds-color-success` / `-muted` / `-on` | Active, completed, positive API/health  |
| `--ds-color-warning` / `-muted` / `-on` | Caution, degraded, non-blocking issues  |
| `--ds-color-error` / `-muted` / `-on`   | Errors, destructive emphasis, alerts    |
| `--ds-color-info` / `-muted` / `-on`    | Neutral informational messages (future) |

### Neutrals (dark scale)

| Token                            | Typical use                           |
| -------------------------------- | ------------------------------------- |
| `--ds-gray-950` … `--ds-gray-50` | Full gray ramp (850 = app base today) |
| `--ds-color-text`                | Primary copy                          |
| `--ds-color-text-muted`          | Secondary copy, table meta            |
| `--ds-color-text-disabled`       | Disabled controls                     |

### Background, surface, border

| Token                      | Use                      |
| -------------------------- | ------------------------ |
| `--ds-color-bg-base`       | App canvas               |
| `--ds-color-bg-subtle`     | Gradients / subtle depth |
| `--ds-color-bg-elevated`   | Sidebar, dropdowns       |
| `--ds-color-bg-surface`    | Cards, panels, inputs    |
| `--ds-color-bg-hover`      | Row/link hover           |
| `--ds-color-border`        | Default borders          |
| `--ds-color-border-subtle` | Dividers inside panels   |

**Rules**

- Do not introduce new hex values in feature CSS; extend tokens in `tokens.css` if needed.
- Status colors must use semantic tokens, not raw green/red/yellow in components.
- Primary yellow is **never** used for body text on dark backgrounds (accessibility).

---

## 2. Typography

**Family:** Alef (Google Fonts), loaded in `apps/web/index.html`. Weights **400** (regular) and **700** (bold) only.

| CSS weight in designs | Implementation                  |
| --------------------- | ------------------------------- |
| Regular body          | `400`                           |
| Medium (500)          | Use `400` (no 500 file)         |
| Semibold (600)        | Use `700` or `400` by hierarchy |
| Bold headings         | `700`                           |

### Heading scale

| Level | Token sizes                 | Usage                                          |
| ----- | --------------------------- | ---------------------------------------------- |
| H1    | `--ds-text-h1-*` (2rem)     | App header page title (`app-header__title`)    |
| H2    | `--ds-text-h2-*` (1.5rem)   | Module page title (`*-page__title`, dashboard) |
| H3    | `--ds-text-h3-*` (1.25rem)  | Card titles, form section titles               |
| H4    | `--ds-text-h4-*` (1.125rem) | State titles (empty/error)                     |
| H5    | `--ds-text-h5-*` (1rem)     | Subsection headings                            |
| H6    | `--ds-text-h6-*` (0.875rem) | Compact headings                               |

Use **one H1 per route** inside the shell (header). Module content starts at H2.

### Body

| Style      | Token                 | Usage             |
| ---------- | --------------------- | ----------------- |
| Body large | `--ds-text-body-lg-*` | Lead paragraphs   |
| Body       | `--ds-text-body-*`    | Default UI copy   |
| Body small | `--ds-text-body-sm-*` | Table cells, meta |

### Caption & overline

| Style    | Token                  | Usage                                                           |
| -------- | ---------------------- | --------------------------------------------------------------- |
| Caption  | `--ds-text-caption-*`  | Hints, footnotes, login hint                                    |
| Overline | `--ds-text-overline-*` | Eyebrows (“OPERATIONS”, module eyebrows) — uppercase + tracking |

### Button typography

| Token                     | Value    |
| ------------------------- | -------- |
| `--ds-text-button-size`   | 0.875rem |
| `--ds-text-button-line`   | 1.25rem  |
| `--ds-text-button-weight` | 700      |

**Rules**

- `font-family` only via `--ds-font-family` (or inherited from `body`).
- User-entered Latin (email, IDs): `dir="ltr"` on the control, not on the whole page.
- Numbers in tables: prefer `dir="ltr"` for codes and phone-like values.

---

## 3. Spacing system

**Base unit:** 4px (`0.25rem` at default root font size).

| Token           | px  | Use                                    |
| --------------- | --- | -------------------------------------- |
| `--ds-space-1`  | 4   | Tight gaps, badge padding              |
| `--ds-space-2`  | 8   | Label-to-field, icon gap               |
| `--ds-space-3`  | 12  | Compact lists                          |
| `--ds-space-4`  | 16  | Default gap in forms/toolbars          |
| `--ds-space-5`  | 20  | Page/section padding (desktop content) |
| `--ds-space-6`  | 24  | Panel padding, login panel             |
| `--ds-space-8`  | 32  | Large section breaks                   |
| `--ds-space-10` | 40  | —                                      |
| `--ds-space-12` | 48  | —                                      |
| `--ds-space-16` | 64  | —                                      |

### Standard usage

| Token                      | Use                                |
| -------------------------- | ---------------------------------- |
| `--ds-page-padding`        | Main content inset (desktop)       |
| `--ds-page-padding-mobile` | Main content inset (≤768px)        |
| `--ds-section-gap`         | Vertical gap between page sections |
| `--ds-card-padding`        | Interior card/panel padding        |
| `--ds-form-gap`            | Gap between form sections          |
| `--ds-field-gap`           | Label to control                   |

**Rules**

- Prefer spacing tokens over arbitrary `rem` in new CSS.
- Existing screens keep current spacing until a deliberate migration pass.

---

## 4. Border radius

| Token              | rem  | Use                                                  |
| ------------------ | ---- | ---------------------------------------------------- |
| `--ds-radius-sm`   | 4px  | Badges, small chips                                  |
| `--ds-radius-md`   | 6px  | Buttons (`@amarok-one/ui` default)                   |
| `--ds-radius-lg`   | 8px  | Inputs, cards, nav items (default `--amarok-radius`) |
| `--ds-radius-xl`   | 10px | Prominent panels (e.g. login)                        |
| `--ds-radius-full` | pill | Avatars, status pills                                |

**Rule:** Pick the smallest radius that fits the component; do not mix arbitrary values.

---

## 5. Shadows (elevation)

| Level | Token                 | Use                              |
| ----- | --------------------- | -------------------------------- |
| 0     | `--ds-shadow-none`    | Flat panels on dark bg           |
| 1     | `--ds-shadow-sm`      | Subtle lift (rare on dark theme) |
| 2     | `--ds-shadow-md`      | Dropdowns                        |
| 3     | `--ds-shadow-lg`      | Login panel, floating menus      |
| 4     | `--ds-shadow-overlay` | Modals (future)                  |

Dark UI uses **borders + background steps** more than shadow; reserve high elevation for overlays.

---

## 6. Buttons

Implemented today in `@amarok-one/ui` as **primary** and **secondary**; v1 defines the full set for migration.

| Variant       | Background                              | Text                      | Border                        | When to use                                     |
| ------------- | --------------------------------------- | ------------------------- | ----------------------------- | ----------------------------------------------- |
| **Primary**   | `--ds-color-primary`                    | `--ds-color-primary-on`   | none                          | Main action (Save, Sign in, Add)                |
| **Secondary** | `--ds-color-secondary`                  | `--ds-color-secondary-on` | `--ds-color-secondary-border` | Cancel, back, low emphasis                      |
| **Danger**    | transparent or `--ds-color-error-muted` | `--ds-color-error-on`     | `--ds-color-error`            | Delete, irreversible actions                    |
| **Ghost**     | transparent                             | `--ds-color-text`         | none                          | Tertiary actions in toolbars                    |
| **Disabled**  | any                                     | —                         | —                             | `opacity: 0.5`, `cursor: not-allowed`, no hover |

**Specs (all variants)**

- Min height: 2.5rem touch target on mobile
- Padding: `--ds-space-2` `--ds-space-4`
- Radius: `--ds-radius-md`
- Typography: button tokens
- Focus: `--ds-focus-ring` + `--ds-focus-offset`
- One primary button per visible form footer or header action group

**Class naming (target):** `ds-button`, `ds-button--primary|secondary|danger|ghost`

---

## 7. Form controls

**Shared field anatomy:** label → control → hint/error (optional).

| Control      | Height / padding                         | Radius             | Border              | Background                                     |
| ------------ | ---------------------------------------- | ------------------ | ------------------- | ---------------------------------------------- |
| **Input**    | padding `--ds-space-3` `--ds-space-4`    | `--ds-radius-lg`   | `--ds-color-border` | `--ds-color-bg-base`                           |
| **Select**   | same as input                            | same               | same                | same                                           |
| **Textarea** | min-height 6rem, same horizontal padding | same               | same                | same                                           |
| **Checkbox** | 1.125rem box                             | `--ds-radius-sm`   | `--ds-color-border` | `--ds-color-bg-base`                           |
| **Switch**   | track 2.5rem × 1.25rem                   | `--ds-radius-full` | —                   | off: `--ds-gray-600`, on: `--ds-color-primary` |

**States**

- **Focus:** `--ds-focus-ring` (match login field pattern)
- **Disabled:** `--ds-color-text-disabled`, reduced opacity
- **Error:** border `--ds-color-error`, message `--ds-color-error-on` on `--ds-color-error-muted` background
- **Required:** visual indicator on label (asterisk or “required” copy), not color alone

**Rules**

- Always associate `<label htmlFor>` or `aria-label`
- Search inputs: `type="search"` + visible or visually hidden label
- Do not disable primary submit without explanation

---

## 8. Cards

**Structure:** optional overline → title → description → body slot.

| Property   | Token                             |
| ---------- | --------------------------------- |
| Background | `--ds-color-bg-surface`           |
| Border     | 1px `--ds-color-border`           |
| Radius     | `--ds-radius-lg`                  |
| Padding    | `--ds-card-padding`               |
| Shadow     | `--ds-shadow-none` (dark default) |

Use `@amarok-one/ui` `Card` for new work; theme overrides live in app CSS until components consume tokens directly.

---

## 9. Tables

**Container:** `overflow-x: auto`, border + `--ds-radius-lg`, background surface.

| Element       | Style                                                                               |
| ------------- | ----------------------------------------------------------------------------------- |
| Header (`th`) | overline typography, `--ds-color-text-muted`, `--ds-space-3`/`--ds-space-4` padding |
| Body (`td`)   | body small, `--ds-color-text`, bottom border `--ds-color-border`                    |
| Row hover     | background `--ds-color-bg-hover` (when rows clickable)                              |
| Min width     | allow horizontal scroll on small viewports; future: card layout ≤ `--ds-bp-md`      |

**Rules**

- Numeric/id columns: `dir="ltr"`
- Empty table: use Empty State component, not a blank table
- Actions column: icon buttons or ghost buttons, never multiple primaries per row

---

## 10. Modals

**Not fully implemented in UI yet** — spec for `window.confirm` replacement and future flows.

| Layer    | Token                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| Backdrop | `rgba(0,0,0,0.55)`, `--ds-z-modal-backdrop`                                               |
| Panel    | `--ds-color-bg-elevated`, border, `--ds-radius-xl`, `--ds-shadow-overlay`, `--ds-z-modal` |
| Padding  | `--ds-space-6`                                                                            |
| Width    | `min(100% - 2rem, 28rem)` default; wide forms up to `36rem`                               |

**Anatomy:** title (H3) → body → footer (secondary left/cancel, primary right/confirm in LTR logic; use `justify-content: flex-end` with logical properties for RTL).

**Behavior:** focus trap, Escape closes, return focus to trigger, `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.

---

## 11. Status badges

Domain badges (customer, equipment, service call) wrap `@amarok-one/ui` `Badge` with app overrides.

| Variant | Background                       | Text                    |
| ------- | -------------------------------- | ----------------------- |
| default | `--ds-color-bg-hover`            | `--ds-color-text-muted` |
| success | `--ds-color-success-muted`       | `--ds-color-success-on` |
| warning | `--ds-color-warning-muted`       | `--ds-color-warning-on` |
| danger  | error muted (define when adding) | `--ds-color-error-on`   |
| info    | `--ds-color-info-muted`          | `--ds-color-info-on`    |

**Rules**

- Badge text = short status label from i18n, not raw enum slugs
- Do not rely on color alone — include text

---

## 12. Icons

**Recommendation:** [**Lucide**](https://lucide.dev/) (React: `lucide-react`) as the single icon set for AMAROK ONE web.

| Criterion    | Lucide                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Style        | 24×24 grid, 2px stroke, rounded caps — matches industrial but clean UI                                 |
| RTL          | Mirror directional icons (`chevron-left` / `chevron-right`) via `transform` or choose logical variants |
| Tree-shaking | Per-icon imports                                                                                       |
| License      | ISC                                                                                                    |

**Usage rules**

- Size: 1.25rem inline with body, 1.5rem in empty states
- Color: `currentColor` inheriting from parent text token
- Replace Unicode placeholders (☰, ◎, ⏳) during UI migration, not before spec approval
- Nav icons optional; if added, one icon per item + unchanged label text

---

## 13. Responsive breakpoints

| Name | Token        | px   | Current behavior                     |
| ---- | ------------ | ---- | ------------------------------------ |
| sm   | `--ds-bp-sm` | 480  | — (reserve)                          |
| md   | `--ds-bp-md` | 768  | Mobile nav drawer, collapsed grids   |
| lg   | `--ds-bp-lg` | 960  | Dashboard columns, hide org switcher |
| xl   | `--ds-bp-xl` | 1280 | — (reserve)                          |

**Rules**

- Mobile-first CSS where new styles are written
- Use `min-width` media queries for progressive enhancement
- Touch targets ≥ 44×44px at `--ds-bp-md` and below
- Test at 360px width minimum

---

## 14. RTL rules

**Default locale:** Hebrew (`he`), direction **rtl**.

| Rule               | Implementation                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Document direction | `I18nProvider` sets `document.documentElement.dir` and `lang`                                          |
| Layout             | CSS logical properties: `inline-start/end`, `margin-inline`, `padding-inline`, `text-align: start/end` |
| Shell              | Sidebar on **inline-end** (right in RTL)                                                               |
| LTR islands        | `dir="ltr"` on emails, URLs, codes, phone numbers                                                      |
| Icons              | Chevrons/menus that imply direction must flip or use symmetric icons                                   |
| Modals             | Button order follows reading order (primary at inline-start for RTL confirm flows)                     |

**English (`en`):** direction `ltr` when locale switching is enabled; do not hardcode `direction: rtl` on `html` in feature CSS.

---

## 15. Accessibility rules

| Area           | Requirement                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| Color contrast | Text on surfaces ≥ WCAG AA (4.5:1 body, 3:1 large text)                      |
| Focus          | Visible `:focus-visible` using `--ds-focus-ring` on all interactive elements |
| Keyboard       | Menus/drawers/modals operable without pointer; Escape closes overlays        |
| Semantics      | One H1 per route; landmarks (`header`, `nav`, `main`)                        |
| States         | `role="alert"` errors, `role="status"` success; loading `aria-live="polite"` |
| Forms          | Labels, describedby for errors, no placeholder-only labels                   |
| Motion         | Respect `prefers-reduced-motion` for drawer/modal transitions (future)       |
| i18n           | All user-visible strings via `useTranslation` / message catalogs             |

---

## How every future screen must follow this system

1. **Start from tokens** — New CSS uses `--ds-*` from `tokens.css`. Do not add one-off colors or spacing unless the token file is updated first.

2. **Compose from shared primitives** — Use `@amarok-one/ui` (`Button`, `Card`, `Badge`, `Logo`) and app-level patterns (`LoadingState`, `ErrorState`, `EmptyState`). New primitives (Dialog, Input, Table) should be added to `packages/ui` or `apps/web/src/components` with `ds-*` classes defined once.

3. **Follow the page template** — App shell (sidebar + header + main) → optional page header (overline + H2 + subtitle + actions) → sections separated by `--ds-section-gap` → data display (table/cards/forms).

4. **Typography hierarchy** — Header H1 = route title; module H2 = context; H3 = sections. Eyebrows use overline tokens.

5. **Actions** — One primary CTA per context; destructive flows use **danger** + confirm modal (when built); secondary for navigation.

6. **Feedback** — Loading/error/empty states mandatory for async data; inline alerts use semantic error/success surfaces.

7. **RTL & i18n** — All copy translated; logical CSS; LTR only where data requires it.

8. **Responsive** — Design for `--ds-bp-md` drawer behavior; tables scroll or collapse per table spec.

9. **No logic in presentation** — Design system changes do not alter API calls, RBAC, or routing.

10. **Migration path** — Existing screens keep `--amarok-*` classes until a screen is explicitly migrated; then replace with token-based `ds-*` styles without changing behavior.

---

## Related files

| File                                    | Purpose                                    |
| --------------------------------------- | ------------------------------------------ |
| `apps/web/src/design-system/tokens.css` | CSS custom properties                      |
| `apps/web/src/index.css`                | Current app styles (legacy class names)    |
| `packages/ui/src/styles.css`            | Base component styles (to align in future) |
| `apps/web/index.html`                   | Alef font load                             |

**Version:** 1.0 — foundation spec; component library expansion is the next sprint.
