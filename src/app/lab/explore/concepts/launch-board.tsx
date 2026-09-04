"use client";

import Link from "next/link";
import { ChipLink } from "@/components/chip-link";
import { VoteButton } from "@/components/vote-button";
import {
  DESKTOP_LAYOUTS,
  findColorscheme,
  findDistro,
  layoutLabel,
  lookupDesktop,
  type DesktopLayout,
} from "@/lib/catalogs";
import { exploreHref } from "@/lib/explore-params";
import {
  DESKTOP_KINDS,
  desktopKindCue,
} from "@/lib/fetch-spec";
import type { ConceptProps } from "../types";

const LIMIT = 12;

export function LaunchBoard({
  rows,
  facets,
  votedIds = new Set(),
  actorId = null,
}: ConceptProps & {
  votedIds?: Set<string>;
  actorId?: string | null;
}) {
  const ranked = [...rows]
    .sort(
      (a, b) =>
        b.voteCount - a.voteCount ||
        b.lastVerifiedAt.getTime() - a.lastVerifiedAt.getTime(),
    )
    .slice(0, LIMIT);

  const topics = facets.desktop
    .filter((d): d is { slug: string; kind: string; count: number } =>
      Boolean(d.slug),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
      <div className="flex flex-col gap-0 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 mb-1">
          <div className="flex gap-1 chrome text-xs tracking-[0.1em] uppercase">
            <ChipLink href="/explore" active>
              Popular
            </ChipLink>
            <ChipLink href="/explore?sort=latest" active={false}>
              Latest
            </ChipLink>
          </div>
          <p className="chrome text-[10px] tracking-[0.12em] uppercase text-muted">
            Live votes · see production Explore
          </p>
        </div>

        <ol className="flex flex-col">
          {ranked.map((row, index) => {
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
                        href={exploreHref({}, { desktop: row.desktopSlug })}
                        active={false}
                      >
                        {lookupDesktop(row.desktopSlug)?.entry.label ??
                          row.desktopSlug}
                      </ChipLink>
                    ) : null}
                    {row.spec.wm && row.spec.wm.slug !== row.desktopSlug ? (
                      <ChipLink
                        compact
                        href={exploreHref({}, { desktop: row.spec.wm.slug })}
                        active={false}
                      >
                        {row.spec.wm.label}
                      </ChipLink>
                    ) : null}
                    {row.layout ? (
                      <ChipLink
                        compact
                        href={exploreHref({}, { layout: row.layout })}
                        active={false}
                      >
                        {layoutLabel(row.layout as DesktopLayout)}
                      </ChipLink>
                    ) : null}
                    {row.distroSlug ? (
                      <ChipLink
                        compact
                        href={exploreHref({}, { distro: row.distroSlug })}
                        active={false}
                      >
                        {findDistro(row.distroSlug)?.label ?? row.distroSlug}
                      </ChipLink>
                    ) : null}
                    {row.colorschemeSlug ? (
                      <ChipLink
                        compact
                        href={exploreHref({}, {
                          colorscheme: row.colorschemeSlug,
                        })}
                        active={false}
                      >
                        {findColorscheme(row.colorschemeSlug)?.label ??
                          row.colorschemeSlug}
                      </ChipLink>
                    ) : null}
                    {row.displayServer ? (
                      <ChipLink
                        compact
                        href={exploreHref({}, {
                          displayServer: row.displayServer,
                        })}
                        active={false}
                      >
                        {row.displayServer}
                      </ChipLink>
                    ) : null}
                    {row.spec.utils.items.map((util) => (
                      <ChipLink
                        key={util.slug}
                        compact
                        href={exploreHref({}, { util: util.slug })}
                        active={false}
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
      </div>

      <aside className="flex flex-col gap-4 h-fit lg:sticky lg:top-16">
        <div className="printout p-4 flex flex-col gap-3">
          <p className="chrome text-[10px] tracking-[0.12em] uppercase text-muted">
            Topics
          </p>
          <div className="flex flex-col gap-1">
            {DESKTOP_KINDS.map((kind) => (
              <Link
                key={kind}
                href={exploreHref({}, { kind })}
                className="chrome text-xs flex items-center justify-between gap-2 border border-transparent px-2 py-1.5 hover:border-border"
              >
                <span className="flex items-center gap-2">
                  <span className="kind-cue">{desktopKindCue(kind)}</span>
                  {kind}
                </span>
                <span className="text-muted tabular-nums">
                  {facets.desktop
                    .filter((d) => d.kind === kind)
                    .reduce((sum, d) => sum + d.count, 0)}
                </span>
              </Link>
            ))}
          </div>
          <div className="border-t border-border pt-3 flex flex-col gap-1">
            <p className="chrome text-[10px] tracking-[0.12em] uppercase text-muted pb-1">
              Layout
            </p>
            {DESKTOP_LAYOUTS.map((layout) => {
              const counted = facets.layout.find((r) => r.slug === layout);
              return (
                <Link
                  key={layout}
                  href={exploreHref({}, { layout })}
                  className="chrome text-xs flex items-center justify-between gap-2 border border-transparent px-2 py-1.5 hover:border-border"
                >
                  <span>{layoutLabel(layout)}</span>
                  <span className="text-muted tabular-nums">
                    {counted?.count ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-border pt-3 flex flex-col gap-1">
            <p className="chrome text-[10px] tracking-[0.12em] uppercase text-muted pb-1">
              Top desktops
            </p>
            {topics.map((d) => (
              <Link
                key={`${d.slug}-${d.kind}`}
                href={exploreHref({}, { desktop: d.slug, kind: d.kind })}
                className="chrome text-xs flex items-center justify-between gap-2 border border-transparent px-2 py-1.5 hover:border-border"
              >
                <span className="truncate">
                  {lookupDesktop(d.slug)?.entry.label ?? d.slug}
                </span>
                <span className="text-muted tabular-nums shrink-0">{d.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
