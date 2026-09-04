"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import type { ConceptProps } from "../types";

const LIMIT = 10;

export function TerminalQuery({ rows }: ConceptProps) {
  const [kind, setKind] = useState<DesktopKind | "">("");
  const [layout, setLayout] = useState<DesktopLayout | "">("");

  const filtered = useMemo(() => {
    return rows
      .filter((row) => (kind ? row.desktopKind === kind : true))
      .filter((row) => (layout ? row.layout === layout : true))
      .slice(0, LIMIT);
  }, [rows, kind, layout]);

  const tokens = [
    kind ? `kind=${kind}` : null,
    layout ? `layout=${layout}` : null,
  ].filter(Boolean);

  const prompt =
    tokens.length > 0
      ? `sharefetch explore ▸ ${tokens.join(" ")}`
      : "sharefetch explore ▸";

  const exploreLink = exploreHref(
    {},
    {
      kind: kind || undefined,
      layout: layout || undefined,
    },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="printout overflow-hidden">
        <div className="border-b border-border bg-bg px-4 py-3 font-mono text-sm">
          <span className="text-accent">{prompt}</span>
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-accent align-middle" />
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3 chrome text-xs">
          <span className="text-muted tracking-[0.12em] uppercase self-center">
            kind
          </span>
          {DESKTOP_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className="chip"
              data-active={kind === k}
              onClick={() => setKind((prev) => (prev === k ? "" : k))}
            >
              {desktopKindCue(k)}
            </button>
          ))}
          <span className="text-muted tracking-[0.12em] uppercase self-center ml-2">
            layout
          </span>
          {DESKTOP_LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              className="chip"
              data-active={layout === l}
              onClick={() => setLayout((prev) => (prev === l ? "" : l))}
            >
              {layoutLabel(l)}
            </button>
          ))}
          <Link href={exploreLink} className="btn ml-auto">
            Run on /explore
          </Link>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">
              # no matches — adjust tokens
            </p>
          ) : (
            filtered.map((row) => (
              <div
                key={row.id}
                className="grid gap-2 px-4 py-3 font-mono text-xs sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0 flex flex-col gap-1">
                  <Link
                    href={`/f/${row.id}`}
                    className="truncate font-medium hover:text-accent"
                  >
                    {row.spec.title}
                  </Link>
                  <p className="text-muted truncate">
                    @{row.handle}
                    {" · "}
                    {row.spec.desktop.label}
                    {row.desktopKind ? (
                      <>
                        {" "}
                        <KindCue kind={row.desktopKind as DesktopKind} />
                      </>
                    ) : null}
                    {row.layout ? ` · ${layoutLabel(row.layout as DesktopLayout)}` : ""}
                  </p>
                </div>
                <Verified at={row.lastVerifiedAt} className="justify-self-end" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
