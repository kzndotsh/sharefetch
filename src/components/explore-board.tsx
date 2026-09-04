import Link from "next/link";
import { ChipLink } from "@/components/chip-link";
import {
  ExploreFilterSearch,
  type ActiveExplorePill,
  type ExploreFilterOption,
} from "@/components/explore-filter-search";
import { VoteButton } from "@/components/vote-button";
import type { FetchRow } from "@/db/rows";
import type { ExploreFilters } from "@/db/queries";
import {
  DESKTOP_LAYOUTS,
  findColorscheme,
  findDistro,
  findUtil,
  layoutLabel,
  lookupDesktop,
  type DesktopLayout,
} from "@/lib/catalogs";
import { exploreHref } from "@/lib/explore-params";
import {
  DESKTOP_KINDS,
  DISPLAY_SERVERS,
  desktopKindCue,
} from "@/lib/fetch-spec";

type Counted = { slug: string | null; count: number };
type DesktopCounted = { slug: string | null; kind: string; count: number };

function sorted<T extends Counted>(rows: T[]): (T & { slug: string })[] {
  return rows
    .filter((r): r is T & { slug: string } => Boolean(r.slug))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

function buildFilterOptions(facets: {
  desktop: DesktopCounted[];
  distro: Counted[];
  colorscheme: Counted[];
  utils: Counted[];
  layout: Counted[];
}): ExploreFilterOption[] {
  const kindCounts = new Map<string, number>();
  for (const d of facets.desktop) {
    kindCounts.set(d.kind, (kindCounts.get(d.kind) ?? 0) + d.count);
  }

  const options: ExploreFilterOption[] = [];

  for (const kind of DESKTOP_KINDS) {
    options.push({
      key: "kind",
      value: kind,
      label: desktopKindCue(kind),
      group: "Kind",
      count: kindCounts.get(kind) ?? 0,
    });
  }

  for (const layout of DESKTOP_LAYOUTS) {
    options.push({
      key: "layout",
      value: layout,
      label: layoutLabel(layout),
      group: "Layout",
      count: facets.layout.find((r) => r.slug === layout)?.count ?? 0,
    });
  }

  for (const d of sorted(facets.desktop)) {
    const kind = DESKTOP_KINDS.find((k) => k === d.kind);
    options.push({
      key: "desktop",
      value: d.slug,
      label: lookupDesktop(d.slug)?.entry.label ?? d.slug,
      group: kind === "compositor" ? "comp" : kind ? desktopKindCue(kind) : "Desktop",
      count: d.count,
    });
  }

  for (const d of sorted(facets.distro)) {
    options.push({
      key: "distro",
      value: d.slug,
      label: findDistro(d.slug)?.label ?? d.slug,
      group: "Distro",
      count: d.count,
    });
  }

  for (const c of sorted(facets.colorscheme)) {
    options.push({
      key: "colorscheme",
      value: c.slug,
      label: findColorscheme(c.slug)?.label ?? c.slug,
      group: "Theme",
      count: c.count,
    });
  }

  for (const u of sorted(facets.utils)) {
    options.push({
      key: "util",
      value: u.slug,
      label: findUtil(u.slug)?.label ?? u.slug,
      group: "Util",
      count: u.count,
    });
  }

  for (const server of DISPLAY_SERVERS) {
    if (server === "other") {
      continue;
    }
    options.push({
      key: "displayServer",
      value: server,
      label: server,
      group: "Display",
      count: 0,
    });
  }

  return options.sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

function buildActivePills(filters: ExploreFilters): ActiveExplorePill[] {
  const pills: ActiveExplorePill[] = [];
  if (filters.q) {
    pills.push({ key: "q", value: filters.q, label: `“${filters.q}”` });
  }
  if (filters.desktop) {
    pills.push({
      key: "desktop",
      value: filters.desktop,
      label: lookupDesktop(filters.desktop)?.entry.label ?? filters.desktop,
    });
  }
  if (filters.layout) {
    pills.push({
      key: "layout",
      value: filters.layout,
      label: layoutLabel(filters.layout as DesktopLayout),
    });
  }
  if (filters.kind) {
    pills.push({
      key: "kind",
      value: filters.kind,
      label: desktopKindCue(filters.kind as (typeof DESKTOP_KINDS)[number]),
    });
  }
  if (filters.distro) {
    pills.push({
      key: "distro",
      value: filters.distro,
      label: findDistro(filters.distro)?.label ?? filters.distro,
    });
  }
  if (filters.colorscheme) {
    pills.push({
      key: "colorscheme",
      value: filters.colorscheme,
      label:
        findColorscheme(filters.colorscheme)?.label ?? filters.colorscheme,
    });
  }
  if (filters.util) {
    pills.push({
      key: "util",
      value: filters.util,
      label: findUtil(filters.util)?.label ?? filters.util,
    });
  }
  if (filters.displayServer) {
    pills.push({
      key: "displayServer",
      value: filters.displayServer,
      label: filters.displayServer,
    });
  }
  return pills;
}

export function ExploreBoard({
  rows,
  facets,
  filters,
  votedIds,
  actorId,
  matched,
  total,
}: {
  rows: FetchRow[];
  facets: {
    desktop: DesktopCounted[];
    distro: Counted[];
    colorscheme: Counted[];
    utils: Counted[];
    layout: Counted[];
  };
  filters: ExploreFilters;
  votedIds: Set<string>;
  actorId: string | null;
  matched: number;
  total: number;
}) {
  const sort = filters.sort ?? "popular";
  const options = buildFilterOptions(facets);
  const activePills = buildActivePills(filters);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap gap-1 chrome text-xs tracking-[0.1em] uppercase">
            <ChipLink
              href={exploreHref(filters, { sort: "popular" })}
              active={sort === "popular"}
            >
              Popular
            </ChipLink>
            <ChipLink
              href={exploreHref(filters, { sort: "latest" })}
              active={sort === "latest"}
            >
              Latest
            </ChipLink>
            <ChipLink
              href={exploreHref(filters, { sort: "random" })}
              active={sort === "random"}
            >
              Random
            </ChipLink>
          </div>
          <span className="chrome text-xs text-muted tabular-nums">
            {matched} {matched === 1 ? "fetch" : "fetches"} out of {total}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted text-sm py-8">
            {hasActiveFilter(filters)
              ? "No fetches match these filters."
              : "Nothing published yet."}
          </p>
        ) : (
          <ol className="flex flex-col">
            {rows.map((row, index) => {
              const headline = row.spec.headline?.trim() || null;

              return (
                <li
                  key={row.id}
                  className="grid grid-cols-[2.5rem_6.5rem_1fr] sm:grid-cols-[2.75rem_8.5rem_1fr_auto] gap-3 sm:gap-4 border-b border-border py-4 items-start"
                >
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <VoteButton
                      fetchId={row.id}
                      voteCount={row.voteCount}
                      voted={votedIds.has(row.id)}
                      isOwner={actorId !== null && actorId === row.ownerId}
                    />
                    <span className="chrome text-[10px] text-muted tabular-nums">
                      #{index + 1}
                    </span>
                  </div>

                  <Link
                    href={`/f/${row.id}`}
                    className="printout block overflow-hidden aspect-[520/268] hover:border-accent"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/embed/${row.id}.svg?v=${row.updatedAt.getTime()}`}
                      alt=""
                      width={520}
                      height={268}
                      className="h-full w-full object-cover object-left-top"
                    />
                  </Link>

                  <div className="min-w-0 flex flex-col gap-1.5">
                    <Link
                      href={`/u/${row.handle}`}
                      className="text-xs text-muted shrink-0 hover:text-fg w-fit"
                    >
                      @{row.handle}
                    </Link>
                    <Link
                      href={`/f/${row.id}`}
                      className="font-medium hover:text-accent truncate"
                    >
                      {row.spec.title}
                    </Link>
                    {headline ? (
                      <p className="text-xs text-muted line-clamp-2">{headline}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {row.desktopSlug ? (
                        <ChipLink
                          compact
                          href={exploreHref(filters, {
                            desktop: row.desktopSlug,
                          })}
                          active={filters.desktop === row.desktopSlug}
                        >
                          {lookupDesktop(row.desktopSlug)?.entry.label ??
                            row.desktopSlug}
                        </ChipLink>
                      ) : null}
                      {row.spec.wm &&
                      row.spec.wm.slug !== row.desktopSlug ? (
                        <ChipLink
                          compact
                          href={exploreHref(filters, {
                            desktop: row.spec.wm.slug,
                          })}
                          active={filters.desktop === row.spec.wm.slug}
                        >
                          {row.spec.wm.label}
                        </ChipLink>
                      ) : null}
                      {row.layout ? (
                        <ChipLink
                          compact
                          href={exploreHref(filters, { layout: row.layout })}
                          active={filters.layout === row.layout}
                        >
                          {layoutLabel(row.layout as DesktopLayout)}
                        </ChipLink>
                      ) : null}
                      {row.distroSlug ? (
                        <ChipLink
                          compact
                          href={exploreHref(filters, { distro: row.distroSlug })}
                          active={filters.distro === row.distroSlug}
                        >
                          {findDistro(row.distroSlug)?.label ?? row.distroSlug}
                        </ChipLink>
                      ) : null}
                      {row.colorschemeSlug ? (
                        <ChipLink
                          compact
                          href={exploreHref(filters, {
                            colorscheme: row.colorschemeSlug,
                          })}
                          active={filters.colorscheme === row.colorschemeSlug}
                        >
                          {findColorscheme(row.colorschemeSlug)?.label ??
                            row.colorschemeSlug}
                        </ChipLink>
                      ) : null}
                      {row.displayServer ? (
                        <ChipLink
                          compact
                          href={exploreHref(filters, {
                            displayServer: row.displayServer,
                          })}
                          active={filters.displayServer === row.displayServer}
                        >
                          {row.displayServer}
                        </ChipLink>
                      ) : null}
                      {row.spec.utils.items.map((util) => (
                        <ChipLink
                          key={util.slug}
                          compact
                          href={exploreHref(filters, { util: util.slug })}
                          active={filters.util === util.slug}
                        >
                          {util.label}
                        </ChipLink>
                      ))}
                    </div>
                  </div>

                  <Link
                    href={`/f/${row.id}`}
                    className="hidden sm:inline-flex btn self-center shrink-0"
                  >
                    View
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <aside className="flex flex-col gap-4 h-fit lg:sticky lg:top-4 text-sm">
        <ExploreFilterSearch
          filters={filters}
          options={options}
          activePills={activePills}
        />
      </aside>
    </div>
  );
}

function hasActiveFilter(filters: ExploreFilters): boolean {
  return Object.entries(filters).some(
    ([key, value]) => value && !(key === "sort" && value === "popular"),
  );
}
