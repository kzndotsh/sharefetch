# Sharefetch

Desktop stack cards you can publish, upvote, and embed as SVG.

Build a fetch at `/new`, browse `/explore`, drop the image URL in a README. Guests can publish; GitHub OAuth is optional.

## Run

Needs Postgres. Compose uses port **5433** to avoid clashing with a local 5432.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Open http://localhost:3000

Already have Postgres? Set `DATABASE_URL` and skip Compose.

```bash
pnpm test          # vitest
pnpm db:generate   # drizzle migration from schema
pnpm db:migrate
pnpm docs:schema   # docs/schema.json
pnpm docs:svg      # sample SVGs in docs/
```

## Use

1. **Create** — `/new`. Fill the stack (or paste fastfetch JSON). Publish.
2. **Share** — copy the markdown snippet from the fetch page (`/f/<id>`).
3. **Explore** — `/explore`. Filter, sort popular/latest, upvote.
4. **Topics** — `/t`. Browse desktops, distros, themes, and utils used on public fetches.
5. **Users** — `/u`. People with public fetches; each opens `/u/<handle>`.

Embed example:

```md
![fetch](https://your.host/embed/<id>.svg?theme=dark&v=<updatedAt>)
```

Useful query params: `theme`, `hide=distro,utils`, `layout=compact|full`, `v` (cache buster — bump via **Re-verify**). Themes: `default`, `dark`, `light`, `tokyonight`, `gruvbox`, `nord`, `catppuccin`.

Embeds cache for ~10 minutes. Self-host if the badge matters.

## Auth

Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (see `.env.example`). For GitHub sign-in, add `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`. Without that, publish still works via guest cookie + handle.

## Code map

| Area | Where |
| --- | --- |
| Fetch schema | `src/lib/fetch-spec.ts` |
| Catalogs / synonyms | `src/lib/catalogs.ts`, `src/lib/slug.ts` |
| SVG render | `src/lib/svg.ts` |
| Embed themes | `src/lib/embed-query.ts` |
| DB | `src/db/schema.ts`, `src/db/queries.ts` |
| Server actions | `src/app/actions/` |
| Builder UI | `src/app/new/` |
| Catalog notes | `docs/catalog.md` |
