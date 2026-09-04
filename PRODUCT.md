# Sharefetch product

## Thesis

ProfileMe’s live chip builder, a StackShare-style layered typed object, and a github-readme-stats SVG URL, with paste/CLI-shaped refresh so profiles do not rot. Ricer facets (`desktop` kind, distro, colorscheme, utils) make Explore native to unixporn/dotfiles without becoming another screenshot index.

## Inspirations (patterns, not branding)

- **StackShare** — tools as entities, taxonomy + counts, URL-first share, staleness as `lastVerifiedAt`
- **TrackMyStack** — stack under intent, derived traits, mutation changelog, copy-stack
- **github-readme-stats** — markdown image one-liner, theme/hide/show query params, cache headers
- **ProfileMe.dev** — split-pane builder, live preview ⇄ JSON, delayed auth wall
- **toools.design** — facet browse + latest rail
- **awesome-dotfiles / dotfiles.lol** — community filter reality (title, distro, colorscheme, utils, dotfiles URL)

## WM ≠ DE

dotfiles.lol collapsed DE and WM into one `wm` string. That makes GNOME look like i3. Sharefetch’s primary facet is `desktop` with `kind: "wm" | "de" | "compositor"`.

- **de** — GNOME, KDE Plasma, XFCE. The session is a desktop environment.
- **wm** — i3, bspwm, dwm, yabai. A window manager, including macOS WMs on Quartz.
- **compositor** — Hyprland, Sway, Niri, River. The Wayland compositor *is* the session. Do not store these only as `compositor: { picom }`.

Optional `wm` / `de` / `compositor` fields add precision (KWin under Plasma, picom under i3). They never replace `desktop.kind`.

## Why not dotfiles.lol

Screenshots are optional interop. The sacred object is the FetchSpec plus the embed loop. Explore filters typed facets with counts, not a photo grid.

## Schema

`FetchSpec` v1 is the Zod model in `src/lib/fetch-spec.ts`. JSON Schema is generated to `docs/schema.json`. Unknown fields are kept (`z.looseObject`) so old embeds survive extensions.

Server columns denormalize `desktop_kind`, `desktop_slug`, `distro_slug`, `colorscheme_slug`, `display_server`, util slugs, and `last_verified_at` for Explore.

## Staleness

Every successful publish or re-verify sets `updatedAt` and `lastVerifiedAt`. Embed snippets include `?v=<updatedAt>`. The fetch page always shows the verified date.
