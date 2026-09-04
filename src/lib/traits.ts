import {
  classifyDesktopSlug,
  defaultDisplayServer,
  layoutLabel,
  lookupDesktop,
  resolveDesktopLayout,
  type DesktopLayout,
} from "./catalogs";
import { exploreHref } from "./explore-params";
import type { DesktopKind, DisplayServer, FetchSpec } from "./fetch-spec";
import { canonicalSlug, labeledFrom } from "./slug";

export type TraitCategory =
  | "kind"
  | "display"
  | "layout"
  | "aesthetic"
  | "platform";

export type DerivedTrait = {
  id: string;
  category: TraitCategory;
  label: string;
  href?: string;
};

export function deriveDisplayServer(
  spec: Pick<FetchSpec, "desktop" | "displayServer">,
): DisplayServer | undefined {
  if (spec.displayServer) {
    return spec.displayServer;
  }
  if (!spec.desktop.kind) {
    return undefined;
  }
  return defaultDisplayServer(spec.desktop.kind, spec.desktop.slug);
}

export function deriveLayout(
  spec: Pick<FetchSpec, "desktop" | "wm">,
): DesktopLayout | undefined {
  return resolveDesktopLayout({
    desktopSlug: spec.desktop.slug,
    wmSlug: spec.wm?.slug,
  });
}

function kindTraitLabel(kind: DesktopKind): string {
  switch (kind) {
    case "wm":
      return "WM";
    case "de":
      return "DE";
    case "compositor":
      return "Compositor";
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export function deriveTraits(spec: FetchSpec): DerivedTrait[] {
  const traits: DerivedTrait[] = [];

  if (spec.desktop.kind) {
    traits.push({
      id: spec.desktop.kind,
      category: "kind",
      label: kindTraitLabel(spec.desktop.kind),
      href: exploreHref({}, { kind: spec.desktop.kind }),
    });
  }

  const server = deriveDisplayServer(spec);
  if (server === "wayland") {
    traits.push({
      id: "wayland",
      category: "display",
      label: "Wayland",
      href: exploreHref({}, { displayServer: "wayland" }),
    });
  } else if (server === "x11") {
    traits.push({
      id: "x11",
      category: "display",
      label: "X11",
      href: exploreHref({}, { displayServer: "x11" }),
    });
  } else if (server === "quartz") {
    traits.push({
      id: "quartz",
      category: "display",
      label: "Quartz",
      href: exploreHref({}, { displayServer: "quartz" }),
    });
    traits.push({
      id: "macos-wm",
      category: "platform",
      label: "macOS WM",
    });
  }

  const layout = deriveLayout(spec);
  if (layout) {
    traits.push({
      id: layout,
      category: "layout",
      label: layoutLabel(layout),
      href: exploreHref({}, { layout }),
    });
  }

  const hasPywal =
    spec.colorscheme?.slug === "pywal" ||
    spec.utils.items.some((u) => u.slug === "pywal");
  if (hasPywal) {
    traits.push({
      id: "dynamic-colors",
      category: "aesthetic",
      label: "Dynamic colors",
      href: exploreHref({}, { colorscheme: "pywal" }),
    });
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
