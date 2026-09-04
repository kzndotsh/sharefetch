import Link from "next/link";
import { ChipLink } from "@/components/chip-link";
import { FetchCard } from "@/components/fetch-card";
import {
  findColorscheme,
  findDistro,
  lookupDesktop,
} from "@/lib/catalogs";
import { exploreHref } from "@/lib/explore-params";
import { DESKTOP_KINDS, desktopKindCue } from "@/lib/fetch-spec";
import type { ConceptProps } from "../types";

const LIMIT = 12;

export function SvgRiver({ rows, facets }: ConceptProps) {
  const river = rows.slice(0, LIMIT);
  const distros = facets.distro
    .filter((d): d is { slug: string; count: number } => Boolean(d.slug))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const colors = facets.colorscheme
    .filter((c): c is { slug: string; count: number } => Boolean(c.slug))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 border-y border-border bg-bg/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="chrome text-[10px] tracking-[0.12em] uppercase text-muted mr-1">
            Kind
          </span>
          {DESKTOP_KINDS.map((kind) => (
            <ChipLink
              key={kind}
              href={exploreHref({}, { kind })}
              active={false}
              count={facets.desktop
                .filter((d) => d.kind === kind)
                .reduce((sum, d) => sum + d.count, 0)}
            >
              {desktopKindCue(kind)}
            </ChipLink>
          ))}
          <span className="chrome text-[10px] tracking-[0.12em] uppercase text-muted ml-2 mr-1">
            Distro
          </span>
          {distros.map((d) => (
            <ChipLink
              key={d.slug}
              href={exploreHref({}, { distro: d.slug })}
              active={false}
              count={d.count}
            >
              {findDistro(d.slug)?.label ?? d.slug}
            </ChipLink>
          ))}
          <span className="chrome text-[10px] tracking-[0.12em] uppercase text-muted ml-2 mr-1">
            Colors
          </span>
          {colors.map((c) => (
            <ChipLink
              key={c.slug}
              href={exploreHref({}, { colorscheme: c.slug })}
              active={false}
              count={c.count}
            >
              {findColorscheme(c.slug)?.label ?? c.slug}
            </ChipLink>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto px-5 pb-2">
        <div className="flex gap-4 w-max">
          {river.map((row) => (
            <Link
              key={row.id}
              href={`/f/${row.id}`}
              className="printout block w-[min(520px,80vw)] shrink-0 p-3 hover:border-accent transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/embed/${row.id}.svg?v=${row.updatedAt.getTime()}`}
                alt={row.spec.title}
                width={520}
                height={268}
                className="w-full h-auto"
              />
              <p className="chrome text-[10px] tracking-[0.12em] uppercase text-muted pt-2 truncate">
                {row.spec.title}
                {" · "}
                @{row.handle}
                {" · "}
                {lookupDesktop(row.desktopSlug)?.entry.label ?? row.desktopSlug}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.slice(0, 6).map((row) => (
          <FetchCard key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}
