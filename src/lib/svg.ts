import {
  desktopKindCue,
  type FetchSpec,
} from "./fetch-spec";
import {
  hiddenSet,
  THEME_MAP,
  type EmbedQuery,
  type EmbedTheme,
} from "./embed-query";

const ROW_STEP = 28;
const BODY_TOP = 78;
const FOOTER_PAD = 36;
const MAX_LINES_FULL = 10;
const MAX_LINES_COMPACT = 4;
const KEY_MAX = 14;
const VALUE_MAX = 42;

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

function text(
  x: number,
  y: number,
  value: string,
  attrs: string,
): string {
  return `<text x="${x}" y="${y}" ${attrs}>${escapeXml(value)}</text>`;
}

function row(
  y: number,
  key: string,
  value: string,
  theme: EmbedTheme,
  width: number,
): string {
  return [
    text(28, y, key, `fill="${theme.muted}" font-size="12" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"`),
    text(
      148,
      y,
      value,
      `fill="${theme.foreground}" font-size="12" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"`,
    ),
    `<line x1="28" y1="${y + 10}" x2="${width - 28}" y2="${y + 10}" stroke="${theme.border}" stroke-width="1"/>`,
  ].join("");
}

export function renderFetchSvg(
  spec: FetchSpec,
  query: EmbedQuery,
  meta: { lastVerifiedAt?: Date | string | null },
): string {
  const theme = THEME_MAP[query.theme];
  const hide = hiddenSet(query.hide);
  const compact = query.layout === "compact";
  const width = 520;
  const utils = spec.utils.items
    .slice(0, compact ? 4 : 8)
    .map((u) => u.label)
    .join(" · ");
  const kindCue = spec.desktop.kind ? desktopKindCue(spec.desktop.kind) : "";
  const desktopLine = [spec.desktop.label, kindCue].filter(Boolean).join("  ");
  const verifiedLabel = meta.lastVerifiedAt
    ? `verified ${new Date(meta.lastVerifiedAt).toISOString().slice(0, 10)}`
    : "unverified";
  const handle = spec.handle.trim();
  const displayName = spec.displayName.trim();
  const byline =
    displayName && displayName !== handle
      ? `${displayName} · @${handle}`
      : handle
        ? `@${handle}`
        : "";

  const lines: { key: string; value: string; id: string }[] = [];
  if (!hide.has("desktop") && desktopLine) {
    lines.push({ key: "desktop", value: desktopLine, id: "desktop" });
  }
  if (spec.distro && !hide.has("distro")) {
    lines.push({ key: "distro", value: spec.distro.label, id: "distro" });
  }
  if (spec.colorscheme && !hide.has("colorscheme")) {
    lines.push({
      key: "colors",
      value: spec.colorscheme.label,
      id: "colorscheme",
    });
  }
  if (utils && !hide.has("utils")) {
    lines.push({ key: "utils", value: utils, id: "utils" });
  }
  if (!compact && spec.displayServer && !hide.has("display")) {
    lines.push({
      key: "display",
      value: spec.displayServer,
      id: "display",
    });
  }
  if (!hide.has("layers")) {
    for (const item of spec.layers) {
      const label = item.label.trim();
      const value = (item.value ?? "").trim();
      if (!label && !value) {
        continue;
      }
      lines.push({
        key: truncate(label || "detail", KEY_MAX).toLowerCase(),
        value: truncate(value || label, VALUE_MAX),
        id: `layer-${item.key || label || value}`,
      });
    }
  }

  const maxLines = compact ? MAX_LINES_COMPACT : MAX_LINES_FULL;
  const shown = lines.slice(0, maxLines);
  const height = Math.max(
    compact ? 168 : 200,
    BODY_TOP + Math.max(shown.length, 1) * ROW_STEP + FOOTER_PAD,
  );

  const body = shown
    .map((line, i) => row(BODY_TOP + i * ROW_STEP, line.key, line.value, theme, width))
    .join("");

  const icon = query.show_icons
    ? `<rect x="28" y="22" width="10" height="10" fill="${theme.accent}"/>`
    : "";

  const footer = byline ? `${byline}  ${verifiedLabel}` : verifiedLabel;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(spec.title)}">
  <title>${escapeXml(spec.title)}</title>
  <rect width="${width}" height="${height}" fill="${theme.background}"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="${theme.border}"/>
  ${icon}
  ${text(query.show_icons ? 46 : 28, 32, "sharefetch", `fill="${theme.muted}" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" letter-spacing="0.18em"`)}
  ${text(28, 56, spec.title, `fill="${theme.foreground}" font-size="16" font-weight="600" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"`)}
  ${body}
  ${text(28, height - 18, footer, `fill="${theme.muted}" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"`)}
  <rect x="${width - 18}" y="18" width="6" height="6" fill="${theme.accent}"/>
</svg>`;
}
