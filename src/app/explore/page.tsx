import type { Metadata } from "next";
import { ChipLink } from "@/components/chip-link";
import { FetchGrid } from "@/components/fetch-card";
import { facetCounts, listExplore } from "@/db/queries";
import {
  findColorscheme,
  findDistro,
  findUtil,
  lookupDesktop,
} from "@/lib/catalogs";
import {
  exploreHref,
  parseExploreFilters,
  toggleHref,
} from "@/lib/explore-params";
import {
  DESKTOP_KINDS,
  DISPLAY_SERVERS,
  desktopKindCue,
  type DesktopKind,
} from "@/lib/fetch-spec";

export const metadata: Metadata = { title: "Explore" };

type Counted = { slug: string | null; count: number };

function sorted<T extends Counted>(rows: T[]): (T & { slug: string })[] {
  return rows
    .filter((r): r is T & { slug: string } => Boolean(r.slug))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

function kindLabel(kind: DesktopKind): string {
  switch (kind) {
    case "de":
      return "Desktop environment";
    case "wm":
      return "Window manager";
    case "compositor":
      return "Compositor session";
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export default async function ExplorePage(props: PageProps<"/explore">) {
  const filters = parseExploreFilters(await props.searchParams);
  const [rows, facets] = await Promise.all([listExplore(filters), facetCounts()]);

  const kindCounts = new Map<string, number>();
  for (const d of facets.desktop) {
    kindCounts.set(d.kind, (kindCounts.get(d.kind) ?? 0) + d.count);
  }
  const desktops = sorted(facets.desktop).filter(
    (d) => !filters.kind || d.kind === filters.kind,
  );

  function kindFacet() {
    return (
      <Facet title="Kind">
        {DESKTOP_KINDS.map((kind) => {
          const t = toggleHref(filters, "kind", kind);
          return (
            <ChipLink key={kind} href={t.href} active={t.active} count={kindCounts.get(kind) ?? 0}>
              {desktopKindCue(kind)}
              <span className="text-muted">{kindLabel(kind).toLowerCase()}</span>
            </ChipLink>
          );
        })}
      </Facet>
    );
  }

  function extraFacets() {
    return (
      <>
      <Facet title="Desktop">
        {desktops.map((d) => {
          const t = toggleHref(filters, "desktop", d.slug);
          const kind = DESKTOP_KINDS.find((k) => k === d.kind);
          return (
            <ChipLink key={`${d.slug}-${d.kind}`} href={t.href} active={t.active} count={d.count}>
              {lookupDesktop(d.slug)?.entry.label ?? d.slug}
              {kind ? <span className="kind-cue">{desktopKindCue(kind)}</span> : null}
            </ChipLink>
          );
        })}
      </Facet>
      <Facet title="Display server">
        {DISPLAY_SERVERS.map((server) => {
          const t = toggleHref(filters, "displayServer", server);
          return (
            <ChipLink key={server} href={t.href} active={t.active}>
              {server}
            </ChipLink>
          );
        })}
      </Facet>
      <Facet title="Distro">
        {sorted(facets.distro).map((d) => {
          const t = toggleHref(filters, "distro", d.slug);
          return (
            <ChipLink key={d.slug} href={t.href} active={t.active} count={d.count}>
              {findDistro(d.slug)?.label ?? d.slug}
            </ChipLink>
          );
        })}
      </Facet>
      <Facet title="Colorscheme">
        {sorted(facets.colorscheme).map((c) => {
          const t = toggleHref(filters, "colorscheme", c.slug);
          return (
            <ChipLink key={c.slug} href={t.href} active={t.active} count={c.count}>
              {findColorscheme(c.slug)?.label ?? c.slug}
            </ChipLink>
          );
        })}
      </Facet>
      <Facet title="Utils">
        {sorted(facets.utils).map((u) => {
          const t = toggleHref(filters, "util", u.slug);
          return (
            <ChipLink key={u.slug} href={t.href} active={t.active} count={u.count}>
              {findUtil(u.slug)?.label ?? u.slug}
            </ChipLink>
          );
        })}
      </Facet>
      </>
    );
  }

  const searchForm = (
    <form action="/explore" className="flex flex-col gap-2">
      {Object.entries(filters).map(([key, value]) =>
        key !== "q" && value && !(key === "sort" && value === "latest") ? (
          <input key={key} type="hidden" name={key} value={value} />
        ) : null,
      )}
      <label className="label" htmlFor="q">
        Search title or handle
      </label>
      <div className="flex gap-2">
        <input
          id="q"
          name="q"
          className="field"
          defaultValue={filters.q ?? ""}
          placeholder="hyprland, moth, minimal"
        />
        <button type="submit" className="btn shrink-0">
          Search
        </button>
      </div>
    </form>
  );

  const results = (
    <section className="flex flex-col gap-4 min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
      <div className="flex items-center justify-between gap-4 rule pt-4 chrome text-xs">
        <span className="text-muted">
          {rows.length} public {rows.length === 1 ? "fetch" : "fetches"}
          {hasActiveFilter(filters) ? (
            <>
              {" · "}
              <a href="/explore" className="hover:text-fg underline">
                clear filters
              </a>
            </>
          ) : null}
        </span>
        <span className="flex gap-2">
          <ChipLink href={exploreHref(filters, { sort: "latest" })} active={filters.sort !== "random"}>
            latest
          </ChipLink>
          <ChipLink href={exploreHref(filters, { sort: "random" })} active={filters.sort === "random"}>
            random
          </ChipLink>
        </span>
      </div>
      <FetchGrid
        rows={rows}
        empty={
          hasActiveFilter(filters)
            ? "No fetches match these filters."
            : "Nothing published yet."
        }
      />
    </section>
  );

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start">
      <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">{searchForm}</div>
      <div className="lg:hidden">{kindFacet()}</div>
      {results}
      <details className="lg:hidden">
        <summary className="chrome text-xs tracking-[0.12em] uppercase text-muted cursor-pointer">
          More filters
        </summary>
        <div className="flex flex-col gap-6 text-sm pt-4">{extraFacets()}</div>
      </details>
      <aside className="hidden lg:flex flex-col gap-6 text-sm lg:col-start-1 lg:row-start-2">
        {kindFacet()}
        {extraFacets()}
      </aside>
    </div>
  );
}

function hasActiveFilter(filters: ReturnType<typeof parseExploreFilters>): boolean {
  return Object.entries(filters).some(
    ([key, value]) => value && !(key === "sort" && value === "latest"),
  );
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="label">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
