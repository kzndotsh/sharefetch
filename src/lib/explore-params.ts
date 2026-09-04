import type { ExploreFilters } from "@/db/queries";
import { DESKTOP_KINDS, DISPLAY_SERVERS } from "./fetch-spec";

export type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() ? v.trim() : undefined;
}

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((a) => a === value);
}

export function parseExploreFilters(params: SearchParams): ExploreFilters {
  return {
    q: single(params.q),
    desktop: single(params.desktop),
    kind: oneOf(single(params.kind), DESKTOP_KINDS),
    distro: single(params.distro),
    colorscheme: single(params.colorscheme),
    util: single(params.util),
    displayServer: oneOf(single(params.displayServer), DISPLAY_SERVERS),
    sort: oneOf(single(params.sort), ["latest", "random"] as const) ?? "latest",
  };
}

export function exploreHref(
  filters: ExploreFilters,
  patch: Partial<ExploreFilters>,
): string {
  const merged: ExploreFilters = { ...filters, ...patch };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value && !(key === "sort" && value === "latest")) {
      query.set(key, value);
    }
  }
  const qs = query.toString();
  return qs ? `/explore?${qs}` : "/explore";
}

export function toggleHref<K extends keyof ExploreFilters>(
  filters: ExploreFilters,
  key: K,
  value: NonNullable<ExploreFilters[K]>,
): { href: string; active: boolean } {
  const active = filters[key] === value;
  return {
    href: exploreHref(filters, { [key]: active ? undefined : value }),
    active,
  };
}
