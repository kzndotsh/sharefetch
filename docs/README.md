# docs

Generated artifacts and notes. Regenerate, do not hand-edit.

| File | Source | Command |
| --- | --- | --- |
| `schema.json` | `fetchSpecJsonSchema()` in `src/lib/fetch-spec.ts` | `pnpm docs:schema` |
| `embed-de.svg` | GNOME sample (`desktop.kind = de`, light theme) | `pnpm docs:svg` |
| `embed-compositor.svg` | Hyprland sample (`desktop.kind = compositor`, dark theme) | `pnpm docs:svg` |
| `catalog.md` | Notes on the split catalogs and where synonyms and themes live | hand-written |

## Builder screenshot

There is no `builder.png` checked in. The builder at `/new` renders the live SVG card client-side with the same `renderFetchSvg` the embed route uses, so the card in `embed-compositor.svg` is what the right pane shows for the Hyprland sample. Capture a PNG of the split pane from a running `pnpm dev` during verification if a review needs it; a stored screenshot would go stale on every style change.
