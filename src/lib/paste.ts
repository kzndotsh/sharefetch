import { COLORSCHEMES, DISTROS, findUtil, lookupDesktop } from "./catalogs";
import {
  DEFAULT_SECTION_ORDER,
  type FetchSpec,
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

export function parseFetchPaste(raw: string, handle: string): FetchSpec {
  const rows = parseLines(raw);
  const de = first(rows, ["de", "desktop environment", "desktop"]);
  const wm = first(rows, ["wm", "window manager"]);
  const desktop = resolveDesktopFromLabels({ de, wm });
  const distroRaw = first(rows, ["os", "distro", "host"]);
  const themeRaw = first(rows, ["theme", "wm theme", "gtk theme"]);
  const terminalRaw = first(rows, ["terminal"]);
  const shellRaw = first(rows, ["shell"]);
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

  let colorscheme = themeRaw ? labeledFrom(themeRaw) : undefined;
  if (colorscheme) {
    const known = COLORSCHEMES.find((c) => c.slug === colorscheme!.slug);
    if (known) {
      colorscheme = known;
    } else if (!COLORSCHEMES.some((c) => themeRaw!.toLowerCase().includes(c.slug))) {
      colorscheme = undefined;
    }
  }

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
    layers: {
      system: [
        ...(kernel
          ? [{ key: "kernel", label: "Kernel", value: kernel }]
          : []),
      ],
      hardware: [
        ...(cpu ? [{ key: "cpu", label: "CPU", value: cpu }] : []),
        ...(gpu ? [{ key: "gpu", label: "GPU", value: gpu }] : []),
        ...(memory ? [{ key: "ram", label: "Memory", value: memory }] : []),
      ],
    },
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
