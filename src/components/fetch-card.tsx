import Link from "next/link";
import type { FetchRow } from "@/db/rows";
import { KindCue } from "./kind-cue";
import { Verified } from "./verified";

export function FetchCard({ row }: { row: FetchRow }) {
  const spec = row.spec;
  const utils = spec.utils.items.slice(0, 4).map((u) => u.label);
  return (
    <article className="printout p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <Link
          href={`/f/${row.id}`}
          className="font-medium truncate hover:text-accent"
        >
          {spec.title}
        </Link>
        <Link href={`/u/${row.handle}`} className="text-xs text-muted shrink-0">
          @{row.handle}
        </Link>
      </div>
      <dl className="text-xs">
        <div className="printout-row">
          <dt className="text-muted">desktop</dt>
          <dd className="flex items-center gap-2 min-w-0">
            <span className="truncate">{spec.desktop.label}</span>
            <KindCue kind={spec.desktop.kind} />
          </dd>
        </div>
        {spec.distro ? (
          <div className="printout-row">
            <dt className="text-muted">distro</dt>
            <dd className="truncate">{spec.distro.label}</dd>
          </div>
        ) : null}
        {spec.colorscheme ? (
          <div className="printout-row">
            <dt className="text-muted">colors</dt>
            <dd className="truncate">{spec.colorscheme.label}</dd>
          </div>
        ) : null}
        {utils.length ? (
          <div className="printout-row">
            <dt className="text-muted">utils</dt>
            <dd className="truncate">{utils.join(" · ")}</dd>
          </div>
        ) : null}
      </dl>
      <Verified at={row.lastVerifiedAt} />
    </article>
  );
}

export function FetchGrid({
  rows,
  empty,
}: {
  rows: FetchRow[];
  empty: string;
}) {
  if (!rows.length) {
    return <p className="text-muted text-sm py-8">{empty}</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <FetchCard key={row.id} row={row} />
      ))}
    </div>
  );
}
