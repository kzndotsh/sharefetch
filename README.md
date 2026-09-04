# Sharefetch

Publish a desktop stack as a typed **fetch**, share it as an SVG, and browse others by real facets — not screenshots.

A fetch is a `FetchSpec`: desktop (WM / DE / compositor), layout, distro, theme, utils, optional layers. Explore ranks public fetches; upvotes are one per actor. Embeds are live SVG URLs you can drop in a README.

**WM ≠ DE ≠ compositor.** GNOME is a DE. i3 is a WM. Hyprland is a compositor. Those are separate kinds on `desktop.kind`.

## Stack

- Next.js (App Router) + React
- Postgres + Drizzle
- Better Auth (optional GitHub OAuth; guests can publish)

## Setup

Postgres is required. Compose binds **5433** so it does not collide with a local 5432.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:push
pnpm db:seed
pnpm test
pnpm dev
```

App: http://localhost:3000

If you already run Postgres, set `DATABASE_URL` to a `sharefetch` database and skip Compose.

## Routes

| Path | |
| --- | --- |
| `/` | Home |
| `/new` | Builder (live SVG + stack editor) |
| `/explore` | Public board (popular / latest / random, filters, votes) |
| `/f/[id]` | Fetch page + embed snippet |
| `/u/[handle]` | Profile |
| `/embed/[id].svg` | Embeddable card |

## Embed

```md
![fetch](http://localhost:3000/embed/<id>.svg?theme=dark&v=<updatedAt>)
```

| Param | |
| --- | --- |
| `theme` | `default`, `dark`, `light`, `tokyonight`, `gruvbox`, `nord`, `catppuccin` |
| `hide` | comma list, e.g. `distro,utils` |
| `show_icons` | `true` |
| `layout` | `compact` \| `full` |
| `v` | cache buster — use `updatedAt` from **Re-verify** |

Cache is short (`max-age=600`). Self-host if the image matters in a README.

## Scripts

| | |
| --- | --- |
| `pnpm db:generate` / `db:migrate` / `db:push` | Schema |
| `pnpm db:seed` | Sample public fetches |
| `pnpm test` | Vitest |
| `pnpm docs:schema` | Write `docs/schema.json` |
| `pnpm docs:svg` | Sample SVGs under `docs/` |

## Auth

GitHub OAuth is optional (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`). Publishing works with a guest cookie and handle.

## Extending

- **Slug synonyms** — `SYNONYMS` in `src/lib/slug.ts` (`arch` → `arch-linux`)
- **Catalogs** — desktops, distros, themes, utils in `src/lib/catalogs.ts` (see `docs/catalog.md`)
- **Embed themes** — `EMBED_THEMES` + `THEME_MAP` in `src/lib/embed-query.ts`
- **Spec** — Zod model in `src/lib/fetch-spec.ts`; JSON Schema via `pnpm docs:schema`
