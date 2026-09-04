import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { facetCounts } from "@/db/queries";
import {
  findColorscheme,
  findDistro,
  findUtil,
  lookupDesktop,
} from "@/lib/catalogs";
import { DESKTOP_KINDS, desktopKindCue } from "@/lib/fetch-spec";

export const metadata: Metadata = { title: "Topics" };

type TopicItem = {
  slug: string;
  label: string;
  count: number;
};

function sortedItems(items: TopicItem[]): TopicItem[] {
  return [...items].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

export default async function TopicsPage() {
  const facets = await facetCounts();

  const desktopsByKind = new Map<string, TopicItem[]>();
  for (const kind of DESKTOP_KINDS) {
    desktopsByKind.set(kind, []);
  }
  for (const row of facets.desktop) {
    if (!row.slug) {
      continue;
    }
    const list = desktopsByKind.get(row.kind);
    if (!list) {
      continue;
    }
    list.push({
      slug: row.slug,
      label: lookupDesktop(row.slug)?.entry.label ?? row.slug,
      count: row.count,
    });
  }

  const distros = sortedItems(
    facets.distro
      .filter((r): r is { slug: string; count: number } => Boolean(r.slug))
      .map((r) => ({
        slug: r.slug,
        label: findDistro(r.slug)?.label ?? r.slug,
        count: r.count,
      })),
  );

  const themes = sortedItems(
    facets.colorscheme
      .filter((r): r is { slug: string; count: number } => Boolean(r.slug))
      .map((r) => ({
        slug: r.slug,
        label: findColorscheme(r.slug)?.label ?? r.slug,
        count: r.count,
      })),
  );

  const utils = sortedItems(
    facets.utils
      .filter((r): r is { slug: string; count: number } => Boolean(r.slug))
      .map((r) => ({
        slug: r.slug,
        label: findUtil(r.slug)?.label ?? r.slug,
        count: r.count,
      })),
  );

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
          Topics
        </p>
        <h1 className="text-2xl font-medium">Catalog used on public fetches</h1>
        <p className="text-sm text-muted max-w-3xl">
          Desktops, distros, themes, and utils. Open a topic to see matching
          fetches, or jump into Explore with that filter.
        </p>
      </header>

      <TopicSection title="Desktop">
        {DESKTOP_KINDS.map((kind) => {
          const items = sortedItems(desktopsByKind.get(kind) ?? []);
          if (items.length === 0) {
            return null;
          }
          return (
            <TopicGroup
              key={kind}
              title={kind === "compositor" ? "comp" : desktopKindCue(kind)}
              items={items}
            />
          );
        })}
      </TopicSection>

      <TopicSection title="Distro">
        <TopicGroup items={distros} />
      </TopicSection>

      <TopicSection title="Theme">
        <TopicGroup items={themes} />
      </TopicSection>

      <TopicSection title="Utils">
        <TopicGroup items={utils} />
      </TopicSection>
    </div>
  );
}

function TopicSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="chrome text-xs tracking-[0.12em] uppercase text-muted border-b border-border pb-2">
        {title}
      </h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function TopicGroup({
  title,
  items,
}: {
  title?: string;
  items: TopicItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">Nothing published in this group yet.</p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {title ? (
        <p className="chrome text-[10px] tracking-[0.1em] uppercase text-muted">
          {title}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/t/${item.slug}`}
              className="topic-chip"
              data-active="false"
            >
              <span>{item.label}</span>
              <span className="tabular-nums opacity-70">{item.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
