# Mail layout modes

Native Mail supports two desktop reading layouts. Both share the same stores, routes, and components — only chrome arrangement changes.

## Modes

| Mode | Key | Behavior |
|------|-----|----------|
| **List** (default) | `list` | Gmail-style: full-width message list; click opens a full reading view with Back. Folder rail stays icon-only. |
| **Split** (legacy) | `split` | Existing layout: folder rail + sidebar message list + reading pane on the right (“Select a message to read”). |

Mobile is unchanged in spirit: list → open message. List mode makes desktop match that flow.

## Why both

Product can ship the denser Gmail-style list, while keeping the previous split pane one switch away if stakeholders prefer it.

## How to switch

### 1. In the app (preferred)

**Profile → Display → Mail layout** — choose *List* or *Split*. Preference is stored in `localStorage` under `nm_mail_layout`.

### 2. Environment default (new users / clear storage)

In `.env` / Nuxt public config:

```bash
# list (default) | split
NUXT_PUBLIC_MAIL_LAYOUT=list
```

Mapped in `nuxt.config.ts` as `runtimeConfig.public.mailLayout`.

### 3. Code

```ts
const { mode, isList, isSplit, setMode } = useMailLayout()
setMode('split') // restore legacy
setMode('list')  // Gmail-style
```

## Architecture

```
useMailLayout()          ← single source of truth (state + localStorage)
        │
        ├─ AppSidebar    ← second (mail list) panel only when isSplit
        ├─ sidebarLayout ← --sidebar-width: icon-only when isList
        └─ mail/[mailbox].vue
              ├─ isList  → full-width list OR full-width viewer
              └─ isSplit → legacy mobile list + desktop split pane
```

### Routes (unchanged)

- List / empty mailbox: `/mail/:mailbox`
- Open message: `/mail/:mailbox?id=`
- Deep link: `/mail/:mailbox/:id` still works

### Components reused

- `MailListItem` — list rows (optional denser `variant="row"` in list mode)
- `MailViewer` / `MailThread` — reading view in both modes
- Selection / bulk trash / restore — same composable

## Rollback for demos

1. Profile → Display → **Split (classic)**  
   or  
2. Set `NUXT_PUBLIC_MAIL_LAYOUT=split` and clear `localStorage.nm_mail_layout`

No deploy of an old branch required.

## Out of scope (this pass)

- Optional reading pane *beside* the list inside list mode (Gmail’s “split pane” toggle)
- Per-folder layout overrides
