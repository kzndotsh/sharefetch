# Catalog notes

Separate catalogs live in `src/lib/catalogs.ts`:

- `DESKTOP_WM`
- `DESKTOP_DE`
- `DESKTOP_COMPOSITOR`
- `DISTROS`
- `COLORSCHEMES`
- `UTILS` (by `UtilRole`)

Do not merge WM/DE/compositor into one “WM” list.

Synonyms: `src/lib/slug.ts`.
Themes: `src/lib/embed-query.ts`.

Sample cards:

- `docs/embed-de.svg` — GNOME (`desktop.kind = de`)
- `docs/embed-compositor.svg` — Hyprland (`desktop.kind = compositor`)

Builder screenshot is the `/new` split pane (live SVG on the right). Capture it from a running app if you need a PNG in review.
