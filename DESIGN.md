---
name: Sharefetch
description: Graphite chrome around a lemon-accented fetch printout.
colors:
  bg: "#0e1216"
  paper: "#161c22"
  fg: "#d7dee5"
  muted: "#7d8894"
  accent: "#e6c200"
  border: "#2c343d"
typography:
  display:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
  headline:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.375
  title:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.55
  body:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.1em"
  chrome:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
  eyebrow:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.18em"
  kindCue:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.08em"
rounded:
  none: "0px"
spacing:
  field: "8px"
  control: "12px"
  inset: "16px"
  section: "32px"
  cluster: "64px"
components:
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.fg}"
    typography: "{typography.chrome}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.9rem"
  button-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.fg}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    typography: "{typography.chrome}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.9rem"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.55rem"
  chip-active:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
  field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.65rem"
  printout:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.fg}"
    rounded: "{rounded.none}"
    padding: "16px"
  kind-cue:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.none}"
    padding: "0 0.35rem"
---

# Design System: Sharefetch

## Overview

**Creative North Star: "The Cold Aisle"**

Sharefetch looks like a listing under fluorescent machine-room light. The page is graphite (`#0e1216`); every claim about a stack sits on a slightly lifted console paper (`#161c22`) with a 1px hairline. Lemon (`#e6c200`) is not a brand wash. It is the caution lamp: the header square, the SVG corner ticks, the primary publish action, the active facet, the focus ring.

IBM Plex Mono is the reading voice because a fetch is typed data. IBM Plex Sans is chrome only: nav, buttons, uppercase labels, the footer. The two faces never swap roles.

Embed themes (`dracula`, `gruvbox`, `nord`, and the rest) recolor the **SVG card**, never the site. Site chrome stays this graphite system so a README screenshot of the product still matches the product.

**Key Characteristics:**
- Square corners everywhere. Radius is a defect.
- Hairline borders (`#2c343d`), not shadows as the default depth cue.
- Lemon used as a rare signal, not a fill.
- Mono body, sans chrome. Uppercase tracked labels.
- The printout (card / builder section / live preview frame) is the signature silhouette.

## Colors

A cold aisle: graphite ground, slightly lighter console paper for claims, mist text, lemon as the only saturated voice.

### Primary
- **Caution lamp** (`{colors.accent}`): primary buttons, active chips, focus outline, header 8px square, SVG accent ticks, builder section numbers, hover on fetch titles. Selection invert: lemon fill, graphite text.

### Neutral
- **Graphite ground** (`{colors.bg}`): page, field interiors, the hole the printout sits in.
- **Console paper** (`{colors.paper}`): printouts, default buttons, header/footer sit on ground not paper.
- **Mist** (`{colors.fg}`): body and titles.
- **Conduit** (`{colors.muted}`): labels, eyebrows, handles, verified dates, secondary links, chip counts.
- **Steel** (`{colors.border}`): every stroke. Hover on default buttons and chips shifts the stroke to conduit, not lemon, unless the control is active.

**The Rare Lemon Rule.** Lemon occupies a small fraction of any screen. Filling a printout, a sidebar, or a hero with accent is a different product.

**The Site Is Not the Theme Rule.** `spec.theme` only paints the embed. Do not restyle `body` from an embed theme.

## Typography

**Display Font:** IBM Plex Mono (ui-monospace, SFMono-Regular, Menlo)
**Body Font:** IBM Plex Mono (same stack)
**Label/Mono Font:** IBM Plex Sans for chrome; mono stays on fields, JSON, snippets, printout rows

**Character:** Workhorse IBM Plex, not a novelty coding font. Mono carries the claim; sans keeps the shell from shouting "hacker aesthetic."

### Hierarchy
- **Display** (500, clamp 30–36px, 1.25): home h1 only.
- **Headline** (500, 24px, 1.375): page titles (builder, fetch).
- **Title** (500, 14px): fetch-card titles in the grid.
- **Body** (400, 14px / 1.55): default document text. Measure ~65ch on marketing copy (`max-w-prose`).
- **Label** (400, 11px, 0.1em, uppercase): form labels, section kicker type on fetch pages.
- **Eyebrow** (400, 12px sans, 0.18em, uppercase, conduit): "a fetch you can embed", "latest verified", "new fetch", "live card".
- **Chrome** (400, 13px sans): buttons. Chips are 12px, usually inheriting mono unless inside `.chrome`.
- **Kind cue** (400, 10px sans, 0.08em, uppercase): `WM` / `DE` / `compositor`.

**The Two-Voice Rule.** `.chrome` (and `.label`, `.btn`, `.kind-cue`) is Sans. Everything that is a value — titles, fields, JSON, printout `dd` — is Mono.

## Layout

Shell: `max-w-6xl` (72rem), `px-5` (20px), main `py-8` (32px). Header is 48px tall with the same inset.

Rhythm: tight inside a printout (`gap-2`–`gap-3`, row padding `0.45rem 0`), generous between page sections (`gap-16` on home, `gap-8`–`gap-10` on fetch/explore).

Grids:
- Home hero: two columns from `lg`, copy 1.1fr, sample printout 1fr.
- Explore: 16rem facet rail + 1fr from `lg`.
- Fetch: 1fr + 22rem aside from `lg`.
- Builder: 1fr + `minmax(0, 34rem)` live pane, sticky `top-6` from `lg`.
- Fetch grid: 1 / 2 / 3 columns at sm / lg, `gap-4`.
- Printout row: `7.5rem` key column + 1fr value.

Density is compact like a TUI, not sparse like a SaaS dashboard. Do not add card gutters "for breathing room" that break the printout as a continuous sheet.

## Elevation & Depth

Mostly flat. Depth is a 1px hairline plus one printout shadow: a 1px same-color ledge and a tight dark well (`0 1px 0 {colors.border}, 0 12px 32px -20px rgba(0, 0, 0, 0.9)`). No blur, no glow, no colored shadows.

### Shadow Vocabulary
- **Print well** (`box-shadow: 0 1px 0 #2c343d, 0 12px 32px -20px rgba(0, 0, 0, 0.9)`): `.printout` only. Not on buttons, chips, or the header.

**The Printout-Only Lift Rule.** If it is not a fetch card, a builder section, or the live preview frame, it stays flush with the ground.

## Shapes

**The Square Rule.** Radius is `0`. Buttons, chips, fields, printouts, kind cues, the header mark: all rectangles.

Hairlines are 1px solid `{colors.border}`. Kind cues and chips share that stroke. The header mark is an 8×8 lemon square; the default SVG repeats 10×10 and 6×6 lemon squares. Do not replace those with circles or status dots.

Focus: `1px solid` lemon, `2px` offset. Fields drop the outline and only recolor the border to lemon.

Motion: 120ms ease on border/background/color. Honor `prefers-reduced-motion`. Do not invent entrance animations.

## Components

### Buttons
- **Shape:** square, 1px stroke, sans 13px, padding ~7px 14px, inline-flex, gap 0.4rem.
- **Default:** paper fill, mist text, hairline. Hover: stroke becomes conduit. Disabled: 45% opacity.
- **Primary:** lemon fill and stroke, graphite text, weight 600. Hover: `brightness(1.08)`, stroke stays lemon.
- **Focus:** lemon outline, 2px offset (global).

### Chips
- **Style:** transparent fill, 1px hairline, 12px type, padding 3px 9px. Count in conduit.
- **Active:** lemon stroke and lemon text (`data-active="true"`). Not a filled pill.
- **Use:** Explore facets, embed themes, builder pane toggle, section reorder.

### Cards / Printouts
- **Corner Style:** square.
- **Background:** print paper.
- **Shadow Strategy:** print well, see Elevation.
- **Border:** 1px hairline.
- **Internal Padding:** 12px around an SVG, 16px around a fetch-card or builder section.
- **Rows:** 7.5rem mute key, value in mist, 1px divider between rows, none after the last.

### Inputs / Fields
- **Style:** graphite well, 1px hairline, 13px mono, padding 8px 10px.
- **Focus:** lemon border, no glow.
- **Placeholder:** conduit at 70% opacity.
- **Label:** sans 11px uppercase tracked, conduit, 5px gap above the field.

### Navigation
- Header: sans chrome, 1px bottom hairline, 48px. Wordmark is **mono** uppercase `0.18em` tracking with the lemon square. Nav links conduit → mist on hover. **Create fetch** is the only primary button in the bar.
- Footer: hairline rule, sans 12px conduit, same max width and inset.

### Kind cue
Boxed 10px uppercase `WM` / `DE` / `compositor`. Conduit text, hairline. Never color-code kind with lemon or three different hues; the letters are the distinction.

### Kind pick
Choice wells **inside** a printout (desktop kind). Graphite fill, 1px hairline, no print-well shadow. Active well uses a lemon stroke (`data-active="true"`). Nested `.printout` here is a defect.

### Fetch grid item
A printout whose title is a mono 14px 500 link (lemon on hover), handle in 12px conduit, four printout-rows max (desktop, distro, colors, utils), then the verified line.

### Verified
12px conduit. When older than 90 days, append ` · stale`. Stale is copy, not a second accent color, until a dedicated stale token exists.

## Do's and Don'ts

### Do:
- **Do** put claims (stacks, live SVG, JSON, paste) inside a printout.
- **Do** keep lemon rare: one primary action per cluster, active chips, focus, the square mark.
- **Do** use uppercase tracked eyebrows and labels for shell; sentence case for titles and values.
- **Do** keep embed theme switching on the card, not on `body`.

### Don't:
- **Don't** round corners, add glass, neon, or a second saturated hue in chrome.
- **Don't** set body in Plex Sans or labels in a third family.
- **Don't** fill chips or kind cues with lemon.
- **Don't** restyle the app from Catppuccin/Nord/etc. Those are card skins.
- **Don't** replace the lemon squares with logos, gradients, or status dots.
