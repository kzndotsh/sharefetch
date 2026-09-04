import Link from "next/link";
import { FetchCard } from "@/components/fetch-card";
import { DESKTOP_LAYOUTS, layoutLabel } from "@/lib/catalogs";
import { exploreHref } from "@/lib/explore-params";
import {
  DESKTOP_KINDS,
  desktopKindCue,
  type DesktopKind,
} from "@/lib/fetch-spec";
import type { ConceptProps } from "../types";

const LIMIT = 6;

export function FacetMatrix({ rows }: ConceptProps) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.desktopKind || !row.layout) {
      continue;
    }
    const key = `${row.desktopKind}|${row.layout}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sample = rows.slice(0, LIMIT);

  return (
    <div className="flex flex-col gap-6">
      <div className="printout overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border chrome">
              <th className="px-3 py-2 text-left text-muted font-normal tracking-[0.12em] uppercase">
                Kind / Layout
              </th>
              {DESKTOP_LAYOUTS.map((layout) => (
                <th
                  key={layout}
                  className="px-3 py-2 text-center text-muted font-normal tracking-[0.08em] uppercase"
                >
                  {layoutLabel(layout)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DESKTOP_KINDS.map((kind) => (
              <tr key={kind} className="border-b border-border last:border-0">
                <th className="px-3 py-3 text-left font-medium chrome">
                  <span className="kind-cue mr-2">{desktopKindCue(kind)}</span>
                  {kindLabel(kind)}
                </th>
                {DESKTOP_LAYOUTS.map((layout) => {
                  const n = counts.get(`${kind}|${layout}`) ?? 0;
                  const href = exploreHref({}, { kind, layout });
                  return (
                    <td key={layout} className="px-2 py-2 text-center">
                      <Link
                        href={href}
                        className={`inline-flex min-w-10 items-center justify-center border px-2 py-1.5 chrome text-sm transition-colors ${
                          n > 0
                            ? "border-accent/40 text-fg hover:border-accent hover:text-accent"
                            : "border-border text-muted hover:border-muted"
                        }`}
                        style={
                          n > 0
                            ? {
                                backgroundColor: `color-mix(in srgb, var(--accent) ${Math.min(n * 12, 40)}%, var(--bg))`,
                              }
                            : undefined
                        }
                      >
                        {n}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sample.map((row) => (
          <FetchCard key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

function kindLabel(kind: DesktopKind): string {
  switch (kind) {
    case "de":
      return "Desktop environment";
    case "wm":
      return "Window manager";
    case "compositor":
      return "Compositor";
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}
