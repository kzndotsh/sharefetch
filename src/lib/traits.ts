import {
  classifyDesktopSlug,
  defaultDisplayServer,
  lookupDesktop,
} from "./catalogs";
import type { DesktopKind, DisplayServer, FetchSpec } from "./fetch-spec";
import { canonicalSlug, labeledFrom } from "./slug";

export type DerivedTrait = {
  slug: string;
  label: string;
};

const TILING_SLUGS = new Set([
  "i3",
  "bspwm",
  "dwm",
  "awesome",
  "xmonad",
  "qtile",
  "herbstluftwm",
  "hyprland",
  "sway",
  "niri",
  "river",
  "yabai",
  "aerospace",
]);

const STACKING_SLUGS = new Set([
  "gnome",
  "kde-plasma",
  "xfce",
  "cinnamon",
  "mate",
  "lxqt",
  "openbox",
  "wayfire",
  "budgie",
]);

export function deriveDisplayServer(spec: Pick<FetchSpec, "desktop" | "displayServer">): DisplayServer | undefined {
  if (spec.displayServer) {
    return spec.displayServer;
  }
  if (!spec.desktop.kind) {
    return undefined;
  }
  return defaultDisplayServer(spec.desktop.kind, spec.desktop.slug);
}

export function deriveTraits(spec: FetchSpec): DerivedTrait[] {
  const traits: DerivedTrait[] = [];
  const server = deriveDisplayServer(spec);
  if (server === "wayland") {
    traits.push({ slug: "wayland", label: "Wayland" });
  } else if (server === "x11") {
    traits.push({ slug: "x11", label: "X11" });
  } else if (server === "quartz") {
    traits.push({ slug: "quartz", label: "Quartz" });
    traits.push({ slug: "macos-wm", label: "macOS WM" });
  }

  const desktopSlug = spec.desktop.slug;
  if (TILING_SLUGS.has(desktopSlug)) {
    traits.push({ slug: "tiling", label: "tiling" });
  }
  if (STACKING_SLUGS.has(desktopSlug)) {
    traits.push({ slug: "stacking", label: "stacking" });
  }

  const hasPywal =
    spec.colorscheme?.slug === "pywal" ||
    spec.utils.items.some((u) => u.slug === "pywal");
  if (hasPywal) {
    traits.push({ slug: "dynamic-colors", label: "dynamic colors" });
  }

  return traits;
}

export function resolveDesktopFromLabels(input: {
  de?: string;
  wm?: string;
}): {
  kind: DesktopKind;
  label: string;
  slug: string;
  wm?: { label: string; slug: string };
  de?: { label: string; slug: string };
} {
  const deRaw = input.de?.trim();
  const wmRaw = input.wm?.trim();

  if (deRaw) {
    const de = labeledFrom(deRaw);
    const looked = lookupDesktop(de.slug);
    const kind: DesktopKind = "de";
    const wm = wmRaw ? labeledFrom(wmRaw) : undefined;
    return {
      kind,
      label: looked?.entry.label ?? de.label,
      slug: de.slug,
      de: { label: looked?.entry.label ?? de.label, slug: de.slug },
      wm,
    };
  }

  if (wmRaw) {
    const item = labeledFrom(wmRaw);
    const looked = lookupDesktop(item.slug);
    const kind = looked?.kind ?? classifyDesktopSlug(item.slug) ?? "wm";
    return {
      kind,
      label: looked?.entry.label ?? item.label,
      slug: item.slug,
    };
  }

  return {
    kind: "wm",
    label: "unknown",
    slug: "unknown",
  };
}

export function hashRaw(raw: string): string {
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export { canonicalSlug };
