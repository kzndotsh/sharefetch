import {
  COLORSCHEMES,
  DESKTOP_COMPOSITOR,
  DISTROS,
  findColorscheme,
  findUtil,
  lookupDesktop,
} from "./catalogs";
import {
  DEFAULT_SECTION_ORDER,
  type DisplayServer,
  type FetchSpec,
  type LayerItem,
  type UtilItem,
  type UtilRole,
} from "./fetch-spec";
import { reconcileDesktopStack } from "./stack-compat";
import { labeledFrom } from "./slug";
import { hashRaw } from "./traits";

/** Rice-focused module set for paste / builder copy. */
export const FASTFETCH_PASTE_COMMAND =
  "fastfetch -s os:host:wm:de:terminal:shell:theme:icons:font:cursor:packages:display --format json";

type FastfetchModule = {
  type?: unknown;
  result?: unknown;
  error?: unknown;
};

function moduleType(entry: FastfetchModule): string {
  return typeof entry.type === "string" ? entry.type.trim().toLowerCase() : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function findModule(
  modules: FastfetchModule[],
  type: string,
): FastfetchModule | undefined {
  return modules.find((m) => moduleType(m) === type.toLowerCase());
}

function resultOf(entry: FastfetchModule | undefined): unknown {
  if (!entry || entry.error != null) {
    return undefined;
  }
  return entry.result;
}

function utilFromName(value: string, role: UtilRole): UtilItem | null {
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

function pushUtil(utils: UtilItem[], item: UtilItem | null) {
  if (!item) {
    return;
  }
  if (utils.some((u) => u.slug === item.slug)) {
    return;
  }
  utils.push(item);
}

function pushLayer(items: LayerItem[], item: LayerItem) {
  if (items.some((existing) => existing.key === item.key)) {
    return;
  }
  items.push(item);
}

/** Match catalog colorscheme from freeform theme/cursor strings. */
export function matchColorscheme(raw: string): { label: string; slug: string } | undefined {
  const cleaned = raw.replace(/\s*\[.*?\]\s*/g, "").trim();
  if (!cleaned) {
    return undefined;
  }
  const direct = labeledFrom(cleaned);
  const known = findColorscheme(direct.slug);
  if (known) {
    return { label: known.label, slug: known.slug };
  }
  const compact = cleaned.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const scheme of COLORSCHEMES) {
    const needle = scheme.slug.replace(/-/g, "");
    if (compact.includes(needle)) {
      return { label: scheme.label, slug: scheme.slug };
    }
  }
  return undefined;
}

function protocolToDisplayServer(protocol: string | undefined): DisplayServer | undefined {
  if (!protocol) {
    return undefined;
  }
  const lower = protocol.toLowerCase();
  if (lower.includes("wayland")) {
    return "wayland";
  }
  if (lower.includes("x11") || lower.includes("xorg")) {
    return "x11";
  }
  if (lower.includes("quartz") || lower.includes("aqua")) {
    return "quartz";
  }
  return undefined;
}

function formatBytes(bytes: number): string {
  const gib = bytes / (1024 ** 3);
  if (gib >= 1) {
    return `${gib.toFixed(2)} GiB`;
  }
  const mib = bytes / (1024 ** 2);
  return `${mib.toFixed(0)} MiB`;
}

function formatRefresh(rate: number | undefined): string {
  if (rate == null) {
    return "";
  }
  const rounded = Math.round(rate * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function isCompositorName(name: string): boolean {
  const slug = labeledFrom(name).slug;
  if (DESKTOP_COMPOSITOR.some((e) => e.slug === slug)) {
    return true;
  }
  const looked = lookupDesktop(slug);
  return looked?.kind === "compositor";
}

function resolveDistro(osResult: Record<string, unknown>): {
  label: string;
  slug: string;
} | undefined {
  const id = asString(osResult.id);
  const pretty = asString(osResult.prettyName) ?? asString(osResult.name);
  const raw = id ?? pretty;
  if (!raw) {
    return undefined;
  }
  const labeled = labeledFrom(raw);
  const known = DISTROS.find((d) => d.slug === labeled.slug);
  if (known) {
    return { label: known.label, slug: known.slug };
  }
  if (pretty) {
    const fromPretty = labeledFrom(pretty.replace(/\s+\d.*/, ""));
    const knownPretty = DISTROS.find((d) => d.slug === fromPretty.slug);
    if (knownPretty) {
      return { label: knownPretty.label, slug: knownPretty.slug };
    }
    return fromPretty.slug ? fromPretty : undefined;
  }
  return labeled.slug ? labeled : undefined;
}

/**
 * Map a fastfetch `--format json` array into a FetchSpec.
 * Unknown / low-value modules are ignored (not mirrored as top-level fields).
 */
export function parseFastfetchJson(
  modules: unknown,
  handle: string,
  rawForHash?: string,
): FetchSpec {
  if (!Array.isArray(modules)) {
    throw new Error("fastfetch JSON must be an array of modules");
  }
  const list = modules as FastfetchModule[];
  const hashSource = rawForHash ?? JSON.stringify(modules);

  const os = asRecord(resultOf(findModule(list, "os")));
  const wm = asRecord(resultOf(findModule(list, "wm")));
  const de = asRecord(resultOf(findModule(list, "de")));
  const terminal = asRecord(resultOf(findModule(list, "terminal")));
  const shell = asRecord(resultOf(findModule(list, "shell")));
  const editor = asRecord(resultOf(findModule(list, "editor")));
  const theme = asRecord(resultOf(findModule(list, "theme")));
  const wmTheme = asRecord(resultOf(findModule(list, "wmtheme")));
  const icons = asRecord(resultOf(findModule(list, "icons")));
  const font = asRecord(resultOf(findModule(list, "font")));
  const cursor = asRecord(resultOf(findModule(list, "cursor")));
  const terminalFont = asRecord(resultOf(findModule(list, "terminalfont")));
  const packages = asRecord(resultOf(findModule(list, "packages")));
  const kernel = asRecord(resultOf(findModule(list, "kernel")));
  const cpu = asRecord(resultOf(findModule(list, "cpu")));
  const memory = asRecord(resultOf(findModule(list, "memory")));
  const host = asRecord(resultOf(findModule(list, "host")));
  const displayRaw = resultOf(findModule(list, "display"));
  const gpuRaw = resultOf(findModule(list, "gpu"));

  const dePretty = de
    ? asString(de.prettyName) ?? asString(de.processName) ?? asString(de.name)
    : undefined;
  const wmPretty = wm
    ? asString(wm.prettyName) ?? asString(wm.processName)
    : undefined;
  const wmProcess = wm ? asString(wm.processName) : undefined;
  const protocol = wm ? asString(wm.protocolName) : undefined;

  let desktopKind: FetchSpec["desktop"]["kind"] = "wm";
  let desktopLabel = "unknown";
  let desktopSlug = "unknown";
  let nestedWm: { label: string; slug: string } | undefined;
  let nestedDe: { label: string; slug: string } | undefined;

  if (dePretty) {
    const deLabeled = labeledFrom(dePretty);
    const looked = lookupDesktop(deLabeled.slug);
    desktopKind = "de";
    desktopLabel = looked?.entry.label ?? deLabeled.label;
    desktopSlug = looked?.entry.slug ?? deLabeled.slug;
    nestedDe = { label: desktopLabel, slug: desktopSlug };
    if (wmPretty && !isCompositorName(wmPretty)) {
      nestedWm = labeledFrom(wmPretty);
    }
  } else if (wmPretty || wmProcess) {
    const name = wmPretty ?? wmProcess!;
    const labeled = labeledFrom(name);
    const looked = lookupDesktop(labeled.slug);
    desktopKind =
      looked?.kind ??
      (isCompositorName(name) ? "compositor" : "wm");
    desktopLabel = looked?.entry.label ?? labeled.label;
    desktopSlug = looked?.entry.slug ?? labeled.slug;
  }

  const utils: UtilItem[] = [];
  const termName =
    asString(terminal?.prettyName) ?? asString(terminal?.processName);
  if (termName && termName.toLowerCase() !== "cursor") {
    pushUtil(utils, utilFromName(termName, "terminal"));
  } else if (termName) {
    // IDE-embedded terminal — still record if cataloged, else skip noise
    const u = utilFromName(termName, "terminal");
    if (u && findUtil(u.slug)) {
      pushUtil(utils, u);
    }
  }
  const shellName = asString(shell?.prettyName) ?? asString(shell?.processName);
  if (shellName) {
    pushUtil(utils, utilFromName(shellName, "shell"));
  }
  const editorName = asString(editor?.name) ?? asString(editor?.exe);
  if (editorName) {
    pushUtil(utils, utilFromName(editorName, "editor"));
  }

  const system: LayerItem[] = [];
  const hardware: LayerItem[] = [];
  const aesthetic: LayerItem[] = [];
  const desktopLayers: LayerItem[] = [];
  const shellLayers: LayerItem[] = [];

  if (os) {
    const version = asString(os.prettyName) ?? asString(os.version);
    if (version) {
      pushLayer(system, { key: "os", label: "OS", value: version });
    }
  }
  if (kernel) {
    const release = asString(kernel.release);
    const name = asString(kernel.name);
    pushLayer(system, {
      key: "kernel",
      label: "Kernel",
      value: [name, release].filter(Boolean).join(" "),
    });
  }
  if (packages) {
    const all = asNumber(packages.all);
    if (all != null) {
      pushLayer(system, {
        key: "packages",
        label: "Packages",
        value: String(all),
      });
    }
  }
  if (host) {
    const family = asString(host.family) ?? asString(host.name);
    const version = asString(host.version);
    const hostValue = [family, version].filter(Boolean).join(" ");
    if (hostValue) {
      pushLayer(system, { key: "host", label: "Host", value: hostValue });
    }
  }

  if (wm && asString(wm.version)) {
    pushLayer(desktopLayers, {
      key: "wm-version",
      label: "WM version",
      value: asString(wm.version),
    });
  }
  if (protocol) {
    pushLayer(desktopLayers, {
      key: "protocol",
      label: "Protocol",
      value: protocol,
    });
  }

  if (Array.isArray(displayRaw) && displayRaw.length) {
    const displays = displayRaw
      .map((d) => asRecord(d))
      .filter((d): d is Record<string, unknown> => Boolean(d));
    const primary =
      displays.find((d) => d.primary === true) ?? displays[0];
    if (primary) {
      const output = asRecord(primary.output);
      const width = asNumber(output?.width);
      const height = asNumber(output?.height);
      const refresh = asNumber(output?.refreshRate);
      if (width && height) {
        const hz = formatRefresh(refresh);
        pushLayer(desktopLayers, {
          key: "display",
          label: "Display",
          value: hz ? `${width}x${height} @ ${hz}Hz` : `${width}x${height}`,
        });
      }
    }
  }

  if (cpu) {
    const cpuName = asString(cpu.cpu);
    if (cpuName) {
      pushLayer(hardware, { key: "cpu", label: "CPU", value: cpuName });
    }
  }
  if (Array.isArray(gpuRaw)) {
    const names = gpuRaw
      .map((g) => asRecord(g))
      .map((g) => (g ? asString(g.name) : undefined))
      .filter((n): n is string => Boolean(n));
    if (names.length) {
      pushLayer(hardware, {
        key: "gpu",
        label: "GPU",
        value: names.join(", "),
      });
    }
  }
  if (memory) {
    const total = asNumber(memory.total);
    if (total != null) {
      pushLayer(hardware, {
        key: "ram",
        label: "Memory",
        value: formatBytes(total),
      });
    }
  }

  if (shell) {
    const version = asString(shell.version);
    if (shellName && version) {
      pushLayer(shellLayers, {
        key: "shell",
        label: "Shell",
        value: `${shellName} ${version}`,
      });
    }
  }

  const themeCandidates = [
    asString(theme?.theme1),
    asString(theme?.theme2),
    asString(wmTheme?.theme),
    asString(wmTheme?.name),
  ].filter((v): v is string => Boolean(v));
  for (const candidate of themeCandidates) {
    pushLayer(aesthetic, { key: "theme", label: "Theme", value: candidate });
  }
  if (icons) {
    const iconValue = asString(icons.icons1) ?? asString(icons.icons2);
    if (iconValue) {
      pushLayer(aesthetic, { key: "icons", label: "Icons", value: iconValue });
    }
  }
  if (font) {
    let fontValue = asString(font.display);
    if (!fontValue && Array.isArray(font.fonts)) {
      const hit = font.fonts.find(
        (f): f is string => typeof f === "string" && Boolean(f.trim()),
      );
      fontValue = hit?.trim();
    }
    if (fontValue) {
      pushLayer(aesthetic, { key: "font", label: "Font", value: fontValue });
    }
  }
  if (cursor) {
    const cursorTheme = asString(cursor.theme);
    if (cursorTheme) {
      const size = asString(cursor.size);
      pushLayer(aesthetic, {
        key: "cursor",
        label: "Cursor",
        value: size ? `${cursorTheme} (${size})` : cursorTheme,
      });
    }
  }
  if (terminalFont) {
    const tf =
      asString(terminalFont.font) ??
      asString(terminalFont.name) ??
      asString(terminalFont.display);
    if (tf) {
      pushLayer(aesthetic, {
        key: "terminal-font",
        label: "Terminal font",
        value: tf,
      });
    }
  }

  let colorscheme: { label: string; slug: string } | undefined;
  for (const candidate of [
    ...themeCandidates,
    asString(cursor?.theme),
  ]) {
    if (!candidate) {
      continue;
    }
    colorscheme = matchColorscheme(candidate);
    if (colorscheme) {
      break;
    }
  }

  const distro = os ? resolveDistro(os) : undefined;
  const title =
    desktopSlug !== "unknown"
      ? `${desktopLabel} fetch`
      : distro
        ? `${distro.label} fetch`
        : "Untitled fetch";

  const spec: FetchSpec = {
    specVersion: 1,
    title,
    displayName: handle,
    handle,
    visibility: "public",
    desktop: {
      kind: desktopKind,
      label: desktopLabel,
      slug: desktopSlug,
    },
    wm: nestedWm,
    de: nestedDe,
    displayServer: protocolToDisplayServer(protocol),
    distro,
    colorscheme,
    utils: { items: utils },
    layers: [
      ...system,
      ...desktopLayers,
      ...shellLayers,
      ...hardware,
      ...aesthetic,
    ],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    tags: [],
    source: { kind: "cli", rawHash: hashRaw(hashSource) },
  };

  if (!spec.displayServer) {
    const looked = lookupDesktop(spec.desktop.slug);
    if (looked?.entry.displayServer) {
      spec.displayServer = looked.entry.displayServer;
    }
  }

  return reconcileDesktopStack(spec).spec;
}

export function looksLikeFastfetchJson(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[")) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
}
