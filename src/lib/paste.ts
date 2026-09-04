import { COLORSCHEMES, DISTROS, findUtil, lookupDesktop } from "./catalogs";
import {
  looksLikeFastfetchJson,
  matchColorscheme,
  parseFastfetchJson,
} from "./fastfetch-json";
import {
  DEFAULT_SECTION_ORDER,
  type FetchSpec,
  type LayerItem,
  type UtilItem,
  type UtilRole,
} from "./fetch-spec";
import { labeledFrom } from "./slug";
import { deriveDisplayServer, hashRaw, resolveDesktopFromLabels } from "./traits";

type Kv = { key: string; value: string };

function parseLines(raw: string): Kv[] {
  const rows: Kv[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const stripped = trimmed.replace(/^[^\w]+/, "");
    const match = stripped.match(/^([^:]+):\s*(.+)$/);
    if (!match) {
      continue;
    }
    rows.push({ key: match[1].trim().toLowerCase(), value: match[2].trim() });
  }
  return rows;
}

function first(rows: Kv[], names: string[]): string | undefined {
  for (const name of names) {
    const hit = rows.find((r) => r.key === name || r.key.endsWith(name));
    if (hit?.value && hit.value !== "null") {
      return hit.value;
    }
  }
  return undefined;
}

function utilFrom(value: string, role: UtilRole): UtilItem | null {
  const item = labeledFrom(value);
  if (!item.slug) {
    return null;
  }
  const catalog = findUtil(item.slug);
  return {
    label: catalog?.label ?? item.label,
    slug: item.slug,
    role: catalog?.role ?? role,
  };
}

function pushLayer(items: LayerItem[], item: LayerItem) {
  if (items.some((existing) => existing.key === item.key)) {
    return;
  }
  items.push(item);
}

function parseFetchPasteText(raw: string, handle: string): FetchSpec {
  const rows = parseLines(raw);
  const de = first(rows, ["de", "desktop environment", "desktop"]);
  const wm = first(rows, ["wm", "window manager"]);
  const desktop = resolveDesktopFromLabels({ de, wm });
  const distroRaw = first(rows, ["os", "distro", "host"]);
  const themeRaw = first(rows, [
    "theme",
    "wm theme",
    "wmtheme",
    "gtk theme",
  ]);
  const iconsRaw = first(rows, ["icons", "icon theme"]);
  const fontRaw = first(rows, ["font", "fonts"]);
  const cursorRaw = first(rows, ["cursor", "cursor theme"]);
  const terminalFontRaw = first(rows, ["terminal font", "terminalfont"]);
  const packagesRaw = first(rows, ["packages", "package"]);
  const displayRaw = first(rows, ["display", "resolution", "monitor"]);
  const terminalRaw = first(rows, ["terminal"]);
  const shellRaw = first(rows, ["shell"]);
  const editorRaw = first(rows, ["editor"]);
  const kernel = first(rows, ["kernel"]);
  const cpu = first(rows, ["cpu"]);
  const gpu = first(rows, ["gpu"]);
  const memory = first(rows, ["memory", "ram"]);
  const titleRaw = first(rows, ["title"]) ?? `${desktop.label} fetch`;

  const utils: UtilItem[] = [];
  if (terminalRaw) {
    const u = utilFrom(terminalRaw, "terminal");
    if (u) {
      utils.push(u);
    }
  }
  if (shellRaw) {
    const u = utilFrom(shellRaw.replace(/\s.*$/, ""), "shell");
    if (u) {
      utils.push(u);
    }
  }
  if (editorRaw) {
    const u = utilFrom(editorRaw.replace(/\s.*$/, ""), "editor");
    if (u) {
      utils.push(u);
    }
  }

  const compositorRaw = first(rows, ["compositor"]);
  const compositor =
    compositorRaw && desktop.kind !== "compositor"
      ? labeledFrom(compositorRaw)
      : undefined;

  const distro = distroRaw
    ? labeledFrom(distroRaw.replace(/\s+\d.*/, "").replace(/\s+x86.*/, ""))
    : undefined;
  const distroCanon = distro
    ? DISTROS.find((d) => d.slug === distro.slug) ?? distro
    : undefined;

  let colorscheme =
    (themeRaw ? matchColorscheme(themeRaw) : undefined) ??
    (cursorRaw ? matchColorscheme(cursorRaw) : undefined);
  if (!colorscheme && themeRaw) {
    const labeled = labeledFrom(themeRaw);
    const known = COLORSCHEMES.find((c) => c.slug === labeled.slug);
    if (known) {
      colorscheme = known;
    }
  }

  const system: LayerItem[] = [
    ...(kernel ? [{ key: "kernel", label: "Kernel", value: kernel }] : []),
    ...(packagesRaw
      ? [{ key: "packages", label: "Packages", value: packagesRaw }]
      : []),
  ];
  const hardware: LayerItem[] = [
    ...(cpu ? [{ key: "cpu", label: "CPU", value: cpu }] : []),
    ...(gpu ? [{ key: "gpu", label: "GPU", value: gpu }] : []),
    ...(memory ? [{ key: "ram", label: "Memory", value: memory }] : []),
  ];
  const extras: LayerItem[] = [];
  if (themeRaw) {
    pushLayer(extras, { key: "theme", label: "Theme", value: themeRaw });
  }
  if (iconsRaw) {
    pushLayer(extras, { key: "icons", label: "Icons", value: iconsRaw });
  }
  if (fontRaw) {
    pushLayer(extras, { key: "font", label: "Font", value: fontRaw });
  }
  if (cursorRaw) {
    pushLayer(extras, { key: "cursor", label: "Cursor", value: cursorRaw });
  }
  if (terminalFontRaw) {
    pushLayer(extras, {
      key: "terminal-font",
      label: "Terminal font",
      value: terminalFontRaw,
    });
  }
  if (displayRaw) {
    pushLayer(extras, {
      key: "display",
      label: "Display",
      value: displayRaw,
    });
  }

  const layers = [...system, ...hardware, ...extras];

  const spec: FetchSpec = {
    specVersion: 1,
    title: titleRaw,
    displayName: handle,
    handle,
    visibility: "public",
    desktop: {
      kind: desktop.kind,
      label: desktop.label,
      slug: desktop.slug,
    },
    wm: desktop.wm,
    de: desktop.de,
    compositor,
    distro: distroCanon,
    colorscheme,
    utils: { items: utils },
    layers,
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    tags: [],
    source: { kind: "paste", rawHash: hashRaw(raw) },
  };

  spec.displayServer = deriveDisplayServer(spec);
  const catalogDesktop = lookupDesktop(spec.desktop.slug);
  if (catalogDesktop?.entry.displayServer) {
    spec.displayServer = catalogDesktop.entry.displayServer;
  }
  return spec;
}

export function parseFetchPaste(raw: string, handle: string): FetchSpec {
  const trimmed = raw.trim();
  if (looksLikeFastfetchJson(trimmed)) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return parseFastfetchJson(parsed, handle, trimmed);
    } catch {
      // Malformed JSON that looked like an array — fall through to text.
    }
  }
  return parseFetchPasteText(raw, handle);
}

export { FASTFETCH_PASTE_COMMAND } from "./fastfetch-json";
