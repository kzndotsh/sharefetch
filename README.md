# Sharefetch

Typed system/fetch profiles. Embeddable SVG cards. Explore by desktop, distro, colorscheme, and utils.

GNOME is a DE. Hyprland is a compositor. i3 is a WM. Those are not the same facet.

## Run

Postgres is required. `docker compose` binds **5433** so it does not fight a local 5432.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:push
pnpm db:seed
pnpm test
pnpm dev
```

If you already have Postgres on 5432, point `DATABASE_URL` at a `sharefetch` database and skip Compose.

Open http://localhost:3000

## Scripts

- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push`
- `pnpm db:seed` — 20 fetches covering WM, DE, and compositor
- `pnpm docs:svg` — sample cards in `docs/`
- `pnpm docs:schema` — `docs/schema.json`

## Embed

```md
![fetch](http://localhost:3000/embed/<id>.svg?theme=dark&v=<updatedAt>)
```

Query params: `theme` (`default`, `dark`, `light`, `tokyonight`, `gruvbox`, `nord`, `catppuccin`), `hide=distro,utils`, `show_icons=true`, `layout=compact|full`.

Cache headers are short (`max-age=600`). Shared free hosts die. Self-host the app if the card is load-bearing in a README.

Bump `?v=` by clicking **Re-verify** on the fetch page (`updatedAt` / `lastVerifiedAt`).

## Add a catalog synonym

Edit `SYNONYMS` in `src/lib/slug.ts`. Keys are lowercase. Values are canonical slugs (`arch` → `arch-linux`).

## Add an embed theme

Add an id to `EMBED_THEMES` and a palette in `THEME_MAP` in `src/lib/embed-query.ts`.

## Auth

GitHub OAuth via Better Auth is optional. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Create and publish work without an account (guest cookie + handle).
