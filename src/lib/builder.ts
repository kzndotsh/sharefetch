import { z } from "zod";
import type { CatalogEntry } from "./catalogs";
import {
  DEFAULT_SECTION_ORDER,
  DESKTOP_KINDS,
  fetchSpecSchema,
  safeParseFetchSpec,
  type DesktopKind,
  type FetchSpec,
  type UtilItem,
} from "./fetch-spec";

export const SECTION_KEYS = [
  "title",
  "desktop",
  "displayServer",
  "detail",
  "distro",
  "colorscheme",
  "utils",
  "layers",
  "colors",
  "decisions",
  "visibility",
  "dotfilesUrl",
  "screenshots",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  title: "Title",
  desktop: "Desktop",
  displayServer: "Display server",
  detail: "WM / DE / compositor detail",
  distro: "Distro",
  colorscheme: "Colorscheme",
  utils: "Utils",
  layers: "Layers",
  colors: "Colors & theme",
  decisions: "Decisions",
  visibility: "Visibility",
  dotfilesUrl: "Dotfiles URL",
  screenshots: "Screenshots",
};

function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}

export function normalizeSectionOrder(order: string[]): SectionKey[] {
  const seen = new Set<SectionKey>();
  const out: SectionKey[] = [];
  for (const key of order) {
    if (isSectionKey(key) && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  for (const key of SECTION_KEYS) {
    if (!seen.has(key)) {
      out.push(key);
    }
  }
  return out;
}

export function moveSection(
  order: string[],
  key: SectionKey,
  delta: -1 | 1,
): string[] {
  const normalized: string[] = normalizeSectionOrder(order);
  const from = normalized.indexOf(key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= normalized.length) {
    return normalized;
  }
  normalized.splice(from, 1);
  normalized.splice(to, 0, key);
  return normalized;
}

export function wouldClobberSectionOrder(
  current: string[],
  incoming: string[],
): boolean {
  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);
  return !same(current, DEFAULT_SECTION_ORDER) && !same(current, incoming);
}

export function chooseDesktopKind(spec: FetchSpec, kind: DesktopKind): FetchSpec {
  if (spec.desktop.kind === kind) {
    return spec;
  }
  return {
    ...spec,
    desktop: { kind, label: "", slug: "" },
    displayServer: undefined,
  };
}

export function chooseDesktop(spec: FetchSpec, entry: CatalogEntry): FetchSpec {
  return {
    ...spec,
    desktop: { kind: spec.desktop.kind, label: entry.label, slug: entry.slug },
    displayServer: spec.displayServer ?? entry.displayServer,
  };
}

export function hasUtil(spec: FetchSpec, slug: string): boolean {
  return spec.utils.items.some((u) => u.slug === slug);
}

export function toggleUtil(spec: FetchSpec, item: UtilItem): FetchSpec {
  const items = hasUtil(spec, item.slug)
    ? spec.utils.items.filter((u) => u.slug !== item.slug)
    : [...spec.utils.items, item];
  return { ...spec, utils: { items } };
}

export function forkSpec(spec: FetchSpec): FetchSpec {
  return {
    ...spec,
    title: `fork of ${spec.title}`,
    handle: "",
    displayName: "",
    dotfilesUrl: undefined,
    screenshots: undefined,
    source: { kind: "manual" },
  };
}

export function prepareForPublish(spec: FetchSpec): FetchSpec {
  const handle = spec.handle.trim();
  return {
    ...spec,
    title: spec.title.trim(),
    handle,
    displayName: spec.displayName.trim() || handle,
    dotfilesUrl: spec.dotfilesUrl?.trim() ? spec.dotfilesUrl.trim() : undefined,
    screenshots: spec.screenshots?.filter((s) => s.url.trim()),
  };
}

export function publishIssues(spec: FetchSpec): string[] {
  const result = safeParseFetchSpec(spec);
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => {
    const path = issue.path.map(String).join(".") || "spec";
    return `${path}: ${issue.message}`;
  });
}

const draftSpecSchema = fetchSpecSchema.extend({
  title: z.string(),
  displayName: z.string(),
  handle: z.string(),
  desktop: z.object({
    kind: z.enum(DESKTOP_KINDS),
    label: z.string(),
    slug: z.string(),
  }),
});

export function parseDraftSpec(input: unknown): FetchSpec {
  return draftSpecSchema.parse(input);
}

const draftSchema = z.object({
  id: z.string().optional(),
  spec: draftSpecSchema,
  savedAt: z.string(),
});

export type Draft = { id?: string; spec: FetchSpec; savedAt: string };

export const DRAFT_KEY = "sharefetch.draft";

export function readDraft(storage: Pick<Storage, "getItem">): Draft | null {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeDraft(
  storage: Pick<Storage, "setItem">,
  draft: Omit<Draft, "savedAt">,
): Draft {
  const full: Draft = { ...draft, savedAt: new Date().toISOString() };
  storage.setItem(DRAFT_KEY, JSON.stringify(full));
  return full;
}

export function clearDraft(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(DRAFT_KEY);
}
