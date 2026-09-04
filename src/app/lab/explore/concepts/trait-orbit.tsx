import Link from "next/link";
import { ChipLink } from "@/components/chip-link";
import { KindCue } from "@/components/kind-cue";
import { Verified } from "@/components/verified";
import {
  DESKTOP_LAYOUTS,
  findDistro,
  layoutLabel,
  lookupDesktop,
  type DesktopLayout,
} from "@/lib/catalogs";
import { exploreHref } from "@/lib/explore-params";
import {
  DESKTOP_KINDS,
  DISPLAY_SERVERS,
  desktopKindCue,
  type DesktopKind,
} from "@/lib/fetch-spec";
import type { ConceptProps } from "../types";

const LIMIT = 8;

export function TraitOrbit({ rows, facets }: ConceptProps) {
  const desktops = facets.desktop
    .filter((d): d is { slug: string; kind: string; count: number } =>
      Boolean(d.slug),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const distros = facets.distro
    .filter((d): d is { slug: string; count: number } => Boolean(d.slug))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <form
        action="/explore"
        className="mx-auto w-full max-w-xl flex flex-col gap-2"
      >
        <label className="label text-center" htmlFor="lab-orbit-q">
          Search title or handle
        </label>
        <div className="flex gap-2">
          <input
            id="lab-orbit-q"
            name="q"
            className="field"
            placeholder="hyprland, moth, niri…"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Search
          </button>
        </div>
      </form>

      <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
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
        {DISPLAY_SERVERS.filter((s) => s !== "other").map((server) => (
          <ChipLink
            key={server}
            href={exploreHref({}, { displayServer: server })}
            active={false}
          >
            {server === "wayland"
              ? "Wayland"
              : server === "x11"
                ? "X11"
                : server === "quartz"
                  ? "Quartz"
                  : server}
          </ChipLink>
        ))}
        {DESKTOP_LAYOUTS.map((layout) => {
          const counted = facets.layout.find((row) => row.slug === layout);
          return (
            <ChipLink
              key={layout}
              href={exploreHref({}, { layout })}
              active={false}
              count={counted?.count ?? 0}
            >
              {layoutLabel(layout)}
            </ChipLink>
          );
        })}
        {desktops.map((d) => (
          <ChipLink
            key={`${d.slug}-${d.kind}`}
            href={exploreHref({}, { desktop: d.slug, kind: d.kind })}
            active={false}
            count={d.count}
          >
            {lookupDesktop(d.slug)?.entry.label ?? d.slug}
          </ChipLink>
        ))}
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-5xl mx-auto w-full">
        {rows.slice(0, LIMIT).map((row) => (
          <article key={row.id} className="printout p-4 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {row.desktopKind ? (
                <span className="chip" data-active="false">
                  <KindCue kind={row.desktopKind as DesktopKind} />
                </span>
              ) : null}
              {row.displayServer ? (
                <span className="chip">{row.displayServer}</span>
              ) : null}
              {row.layout ? (
                <span className="chip">
                  {layoutLabel(row.layout as DesktopLayout)}
                </span>
              ) : null}
            </div>
            <Link
              href={`/f/${row.id}`}
              className="font-medium hover:text-accent truncate"
            >
              {row.spec.title}
            </Link>
            <p className="text-xs text-muted truncate">
              @{row.handle}
              {" · "}
              {row.spec.desktop.label}
              {row.spec.distro ? ` · ${row.spec.distro.label}` : ""}
            </p>
            <Verified at={row.lastVerifiedAt} />
          </article>
        ))}
      </div>
    </div>
  );
}
