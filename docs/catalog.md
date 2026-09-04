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

## Desktop `layout`

Each WM / DE / compositor entry has a `layout` field used for derived traits and Explore:

| Value | Chip label | Meaning |
|---|---|---|
| `tiling` | Tiling | Non-overlapping tiles (i3, Hyprland, …) |
| `stacking` | Floating | Traditional overlapping windows (Openbox, GNOME, Wayfire, …). Stored as stacking; UI says Floating. |
| `dynamic` | Dynamic | ArchWiki: can switch between tiling and floating (dwm, Awesome, xmonad, Qtile). Not Wikipedia’s “automatic tiling layouts.” |
| `scrollable` | Scrollable | PaperWM-class infinite strip (Niri). |

References:

- [ArchWiki Window manager § Types](https://wiki.archlinux.org/title/Window_manager#Types)
- [ArchWiki Desktop environment](https://wiki.archlinux.org/title/Desktop_environment)

When a DE runs a replaced WM (`spec.wm`), layout comes from the WM slug, not the DE.

Manual vs automatic tiling, workspace/tag models, and compositor backends (wlroots / Smithay / …) are not facets yet.

Sample cards:

- `docs/embed-de.svg` — GNOME (`desktop.kind = de`)
- `docs/embed-compositor.svg` — Hyprland (`desktop.kind = compositor`)

Builder screenshot is the `/new` split pane (live SVG on the right). Capture it from a running app if you need a PNG in review.
