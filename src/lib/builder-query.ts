import {
  findDistro,
  findUtil,
  lookupDesktop,
} from "./catalogs";
import {
  DESKTOP_KINDS,
  emptyFetchSpec,
  type DesktopKind,
  type DisplayServer,
  type FetchSpec,
} from "./fetch-spec";
import { reconcileDesktopStack } from "./stack-compat";

const CLAIM_KEYS = ["k", "desk", "distro", "ds", "title", "handle", "utils"] as const;

export type ClaimQuery = {
  k?: DesktopKind;
  desk?: string;
  distro?: string;
  ds?: DisplayServer;
  title?: string;
  handle?: string;
  utils?: string[];
};

export function hasClaimQuery(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): boolean {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  return CLAIM_KEYS.some((key) => Boolean(get(key)));
}

export function parseClaimQuery(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): ClaimQuery {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };

  const kRaw = get("k");
  const k = DESKTOP_KINDS.find((kind) => kind === kRaw);
  const utilsRaw = get("utils");
  const utils = utilsRaw
    ? [...new Set(utilsRaw.split(",").map((s) => s.trim()).filter(Boolean))]
    : undefined;

  const dsRaw = get("ds");
  const ds =
    dsRaw === "wayland" || dsRaw === "x11" || dsRaw === "quartz" || dsRaw === "other"
      ? dsRaw
      : undefined;

  return {
    k,
    desk: get("desk") || undefined,
    distro: get("distro") || undefined,
    ds,
    title: get("title") || undefined,
    handle: get("handle") || undefined,
    utils: utils?.length ? utils : undefined,
  };
}

export function claimQueryToSpec(claim: ClaimQuery, base?: FetchSpec): FetchSpec {
  let spec = base ? { ...base } : emptyFetchSpec();

  if (claim.title !== undefined) {
    spec = { ...spec, title: claim.title };
  }
  if (claim.handle !== undefined) {
    spec = {
      ...spec,
      handle: claim.handle,
      displayName: spec.displayName || claim.handle,
    };
  }

  if (claim.k) {
    spec = {
      ...spec,
      desktop: { kind: claim.k, label: "", slug: "" },
    };
  }

  if (claim.desk) {
    const looked = lookupDesktop(claim.desk);
    if (looked) {
      spec = {
        ...spec,
        desktop: {
          kind: claim.k ?? looked.kind,
          label: looked.entry.label,
          slug: looked.entry.slug,
        },
        displayServer: claim.ds ?? looked.entry.displayServer ?? spec.displayServer,
      };
    } else {
      spec = {
        ...spec,
        desktop: {
          kind: claim.k ?? spec.desktop.kind,
          label: claim.desk,
          slug: claim.desk,
        },
      };
    }
  }

  if (claim.distro) {
    const distro = findDistro(claim.distro);
    spec = {
      ...spec,
      distro: distro
        ? { label: distro.label, slug: distro.slug }
        : { label: claim.distro, slug: claim.distro },
    };
  }

  if (claim.ds) {
    spec = { ...spec, displayServer: claim.ds };
  }

  if (claim.utils?.length) {
    const items = claim.utils.map((slug) => {
      const known = findUtil(slug);
      return known
        ? { label: known.label, slug: known.slug, role: known.role }
        : { label: slug, slug, role: "other" as const };
    });
    spec = { ...spec, utils: { items } };
  }

  return reconcileDesktopStack(spec).spec;
}

export function serializeClaimQuery(spec: FetchSpec): URLSearchParams {
  const params = new URLSearchParams();
  if (spec.desktop.kind) {
    params.set("k", spec.desktop.kind);
  }
  if (spec.desktop.slug) {
    params.set("desk", spec.desktop.slug);
  }
  if (spec.distro?.slug) {
    params.set("distro", spec.distro.slug);
  }
  if (spec.displayServer) {
    params.set("ds", spec.displayServer);
  }
  if (spec.title.trim()) {
    params.set("title", spec.title.trim());
  }
  if (spec.handle.trim()) {
    params.set("handle", spec.handle.trim());
  }
  if (spec.utils.items.length) {
    params.set(
      "utils",
      spec.utils.items.map((u) => u.slug).join(","),
    );
  }
  return params;
}

export function builderSharePath(spec: FetchSpec): string {
  const params = serializeClaimQuery(spec);
  const query = params.toString();
  return query ? `/new?${query}` : `/new`;
}

export function builderShareUrl(origin: string, spec: FetchSpec): string {
  const path = builderSharePath(spec);
  if (!origin) {
    return path;
  }
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function builderShareMarkdown(origin: string, spec: FetchSpec): string {
  const url = builderShareUrl(origin, spec);
  const label = spec.title.trim() || "Untitled fetch";
  return `[${label}](${url})`;
}
