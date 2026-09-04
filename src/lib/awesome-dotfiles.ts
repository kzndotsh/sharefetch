import { lookupDesktop } from "./catalogs";
import {
  DEFAULT_SECTION_ORDER,
  type FetchSpec,
  type UtilItem,
} from "./fetch-spec";
import { labeledFrom } from "./slug";
import { deriveDisplayServer, hashRaw } from "./traits";

export type AwesomeDotfilesRow = {
  title?: string;
  wm?: string;
  distro?: string;
  colorscheme?: string;
  utils_used?: string[] | string;
  github_url?: string;
  screenshots?: string[] | { url: string; alt?: string }[];
};

function asUtils(raw: string[] | string | undefined): UtilItem[] {
  if (!raw) {
    return [];
  }
  const parts = Array.isArray(raw) ? raw : raw.split(/[,/]/);
  return parts
    .map((p) => labeledFrom(p))
    .filter((p) => p.slug)
    .map((p) => ({ label: p.label, slug: p.slug, role: undefined }));
}

export function mapAwesomeDotfiles(
  row: AwesomeDotfilesRow,
  handle: string,
): FetchSpec {
  const wmRaw = row.wm?.trim() ?? "";
  const desktopLabel = labeledFrom(wmRaw || "unknown");
  const looked = lookupDesktop(desktopLabel.slug);
  const kind = looked?.kind ?? "wm";
  const label = looked?.entry.label ?? desktopLabel.label;
  const slug = desktopLabel.slug || "unknown";

  const screenshots = Array.isArray(row.screenshots)
    ? row.screenshots.map((s) =>
        typeof s === "string" ? { url: s } : { url: s.url, alt: s.alt },
      )
    : undefined;

  const spec: FetchSpec = {
    specVersion: 1,
    title: row.title?.trim() || `${label} setup`,
    displayName: handle,
    handle,
    visibility: "public",
    desktop: { kind, label, slug },
    distro: row.distro ? labeledFrom(row.distro) : undefined,
    colorscheme: row.colorscheme ? labeledFrom(row.colorscheme) : undefined,
    utils: { items: asUtils(row.utils_used) },
    dotfilesUrl: row.github_url,
    screenshots,
    layers: {},
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    tags: [],
    source: {
      kind: "import",
      rawHash: hashRaw(JSON.stringify(row)),
    },
  };

  if (kind === "de") {
    spec.de = { label, slug };
  }
  spec.displayServer = deriveDisplayServer(spec);
  return spec;
}
