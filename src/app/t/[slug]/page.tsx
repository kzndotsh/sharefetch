import type { Metadata } from "next";
import Link from "next/link";
import { FetchGrid } from "@/components/fetch-card";
import { KindCue } from "@/components/kind-cue";
import { listExplore, type ExploreFilters } from "@/db/queries";
import {
  findColorscheme,
  findDistro,
  findUtil,
  lookupDesktop,
} from "@/lib/catalogs";
import { exploreHref } from "@/lib/explore-params";
import type { DesktopKind } from "@/lib/fetch-spec";

type Resolved = {
  label: string;
  category: string;
  kind?: DesktopKind;
  filter: Partial<ExploreFilters>;
};

function resolveTopic(slug: string): Resolved {
  const desktop = lookupDesktop(slug);
  if (desktop) {
    return {
      label: desktop.entry.label,
      category: "desktop",
      kind: desktop.kind,
      filter: { desktop: slug },
    };
  }
  const distro = findDistro(slug);
  if (distro) {
    return { label: distro.label, category: "distro", filter: { distro: slug } };
  }
  const colorscheme = findColorscheme(slug);
  if (colorscheme) {
    return {
      label: colorscheme.label,
      category: "theme",
      filter: { colorscheme: slug },
    };
  }
  const util = findUtil(slug);
  return {
    label: util?.label ?? slug,
    category: util ? util.role : "util",
    filter: { util: slug },
  };
}

export async function generateMetadata(
  props: PageProps<"/t/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: resolveTopic(slug).label };
}

export default async function TopicPage(props: PageProps<"/t/[slug]">) {
  const { slug } = await props.params;
  const topic = resolveTopic(slug);
  const rows = await listExplore({ ...topic.filter, sort: "latest" });
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
          {topic.category}
        </p>
        <h1 className="text-2xl font-medium flex items-center gap-3">
          {topic.label}
          {topic.kind ? <KindCue kind={topic.kind} /> : null}
        </h1>
        <p className="text-muted text-sm">
          {rows.length} public{" "}
          {rows.length === 1 ? "fetch uses" : "fetches use"} {topic.label}.{" "}
          <Link
            href={exploreHref({}, topic.filter)}
            className="hover:text-fg underline"
          >
            Filter in explore
          </Link>
        </p>
      </header>
      <div className="rule pt-4">
        <FetchGrid
          rows={rows}
          empty={`Nobody has published a fetch with ${topic.label} yet.`}
        />
      </div>
    </div>
  );
}
