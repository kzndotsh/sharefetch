import {
  defaultDisplayServer,
  findUtil,
  lookupDesktop,
} from "./catalogs";
import type { DisplayServer, FetchSpec } from "./fetch-spec";

/** Sections that can receive a compatibility banner. */
export type CompatNoteSection =
  | "desktop"
  | "displayServer"
  | "utils"
  | "stack";

export type CompatNote = {
  section: CompatNoteSection;
  text: string;
};

export type CompatResult = {
  spec: FetchSpec;
  notes: CompatNote[];
};

const PICOM_NOTE =
  "picom is an X11 compositor util, not a Wayland session — dropped under compositor kind.";
const QUARTZ_KIND_NOTE =
  "Quartz is for macOS window managers — reset display server for this desktop kind.";
const MACOS_WAYLAND_NOTE =
  "macOS does not run Wayland — clamped display server to quartz.";
const COMPOSITOR_FIELD_NOTE =
  "Cleared the standalone compositor field; the session already is the compositor.";

export function formatCompatNotes(notes: CompatNote[]): string {
  return notes.map((note) => note.text).join(" · ");
}

export function notesForSection(
  notes: CompatNote[],
  section: CompatNoteSection,
): string[] {
  return notes.filter((note) => note.section === section).map((note) => note.text);
}

export function isUtilCompatible(spec: FetchSpec, slug: string): boolean {
  if (spec.desktop.kind !== "compositor") {
    return true;
  }
  const util = findUtil(slug);
  return util?.role !== "compositor";
}

export function isDisplayServerCompatible(
  spec: FetchSpec,
  server: DisplayServer,
): boolean {
  if (server !== "quartz") {
    return true;
  }
  if (spec.distro?.slug === "macos") {
    return true;
  }
  return spec.desktop.kind === "wm";
}

export function reconcileDesktopStack(spec: FetchSpec): CompatResult {
  let next: FetchSpec = { ...spec, utils: { items: [...spec.utils.items] } };
  const notes: CompatNote[] = [];
  const kind = next.desktop.kind;

  if (kind === "compositor") {
    const before = next.utils.items.length;
    next = {
      ...next,
      utils: {
        items: next.utils.items.filter((item) => {
          const role = item.role ?? findUtil(item.slug)?.role;
          return role !== "compositor";
        }),
      },
    };
    if (next.utils.items.length !== before) {
      notes.push({ section: "utils", text: PICOM_NOTE });
    }
    if (next.compositor) {
      next = { ...next, compositor: undefined };
      notes.push({ section: "desktop", text: COMPOSITOR_FIELD_NOTE });
    }
  }

  if (
    next.displayServer === "quartz" &&
    (kind === "de" || kind === "compositor") &&
    next.distro?.slug !== "macos"
  ) {
    const fallback =
      kind && next.desktop.slug
        ? defaultDisplayServer(kind, next.desktop.slug)
        : undefined;
    next = { ...next, displayServer: fallback };
    notes.push({ section: "displayServer", text: QUARTZ_KIND_NOTE });
  }

  if (next.distro?.slug === "macos" && next.displayServer === "wayland") {
    next = { ...next, displayServer: "quartz" };
    notes.push({ section: "displayServer", text: MACOS_WAYLAND_NOTE });
  }

  if (kind === "wm" && !next.displayServer && next.desktop.slug) {
    const looked = lookupDesktop(next.desktop.slug);
    const fromCatalog =
      looked?.kind === "wm"
        ? looked.entry.displayServer
        : defaultDisplayServer("wm", next.desktop.slug);
    if (fromCatalog) {
      next = { ...next, displayServer: fromCatalog };
    }
  }

  return { spec: next, notes };
}

export function utilIncompatibilityNote(slug: string): string {
  const util = findUtil(slug);
  if (util?.role === "compositor") {
    return PICOM_NOTE;
  }
  return "Not compatible with this desktop kind.";
}

export function displayServerIncompatibilityNote(server: DisplayServer): string {
  if (server === "quartz") {
    return "Quartz is for macOS window managers (or a macOS distro).";
  }
  return "Not compatible with this stack.";
}
