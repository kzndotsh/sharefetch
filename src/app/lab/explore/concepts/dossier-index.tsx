"use client";

import Link from "next/link";
import { useState } from "react";
import { KindCue } from "@/components/kind-cue";
import { Verified } from "@/components/verified";
import {
  DESKTOP_LAYOUTS,
  layoutLabel,
  type DesktopLayout,
} from "@/lib/catalogs";
import { exploreHref } from "@/lib/explore-params";
import {
  DESKTOP_KINDS,
  desktopKindCue,
  type DesktopKind,
} from "@/lib/fetch-spec";
import { isoDate } from "@/lib/format";
import type { ConceptProps } from "../types";

const LIMIT = 12;

export function DossierIndex({ rows }: ConceptProps) {
  const [peekId, setPeekId] = useState<string | null>(null);
  const list = rows.slice(0, LIMIT);
  const peek = list.find((r) => r.id === peekId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[12rem_1fr]">
      <aside className="printout p-3 flex flex-col gap-3 h-fit">
        <p className="chrome text-[10px] tracking-[0.12em] uppercase text-muted">
          Facets
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="label">Kind</span>
          {DESKTOP_KINDS.map((kind) => (
            <Link
              key={kind}
              href={exploreHref({}, { kind })}
              className="chrome text-xs border border-transparent px-2 py-1.5 hover:border-border flex items-center gap-2"
            >
              <span className="kind-cue">{desktopKindCue(kind)}</span>
              {kind}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="label">Layout</span>
          {DESKTOP_LAYOUTS.map((layout) => (
            <Link
              key={layout}
              href={exploreHref({}, { layout })}
              className="chrome text-xs border border-transparent px-2 py-1.5 hover:border-border"
            >
              {layoutLabel(layout)}
            </Link>
          ))}
        </div>
        <details className="chrome text-xs border-t border-border pt-2">
          <summary className="cursor-pointer text-muted">More filters</summary>
          <p className="pt-2 text-muted">
            Distro, colorscheme, and utils open on{" "}
            <Link href="/explore" className="text-fg underline">
              /explore
            </Link>
            .
          </p>
        </details>
      </aside>

      <div className="flex flex-col gap-3 min-w-0">
        <div className="printout overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border chrome text-muted tracking-[0.08em] uppercase">
                <th className="px-3 py-2 text-left font-normal">Title</th>
                <th className="px-3 py-2 text-left font-normal">Handle</th>
                <th className="px-3 py-2 text-left font-normal">Desktop</th>
                <th className="px-3 py-2 text-left font-normal">Distro</th>
                <th className="px-3 py-2 text-left font-normal">Layout</th>
                <th className="px-3 py-2 text-left font-normal">Verified</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-bg/80"
                  onMouseEnter={() => setPeekId(row.id)}
                  onFocus={() => setPeekId(row.id)}
                >
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/f/${row.id}`}
                      className="font-medium hover:text-accent truncate block max-w-[14rem]"
                    >
                      {row.spec.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted">@{row.handle}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="truncate max-w-[8rem]">
                        {row.spec.desktop.label}
                      </span>
                      {row.desktopKind ? (
                        <KindCue kind={row.desktopKind as DesktopKind} />
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted truncate max-w-[7rem]">
                    {row.spec.distro?.label ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.layout
                      ? layoutLabel(row.layout as DesktopLayout)
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted whitespace-nowrap">
                    {isoDate(row.lastVerifiedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {peek ? (
          <article className="printout p-4 flex flex-col gap-2 max-w-xl">
            <p className="chrome text-[10px] tracking-[0.12em] uppercase text-muted">
              Peek
            </p>
            <Link
              href={`/f/${peek.id}`}
              className="font-medium hover:text-accent"
            >
              {peek.spec.title}
            </Link>
            <p className="text-xs text-muted">
              {peek.spec.desktop.label}
              {peek.spec.distro ? ` · ${peek.spec.distro.label}` : ""}
              {peek.spec.colorscheme ? ` · ${peek.spec.colorscheme.label}` : ""}
            </p>
            <Verified at={peek.lastVerifiedAt} />
          </article>
        ) : (
          <p className="text-xs text-muted chrome">
            Hover a row to peek the stack.
          </p>
        )}
      </div>
    </div>
  );
}
