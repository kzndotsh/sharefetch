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

function resolveTool(slug: string): Resolved {
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
      category: "colorscheme",
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
  props: PageProps<"/tools/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: resolveTool(slug).label };
}

export default async function ToolPage(props: PageProps<"/tools/[slug]">) {
  const { slug } = await props.params;
  const tool = resolveTool(slug);
  const rows = await listExplore({ ...tool.filter, sort: "latest" });
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
          {tool.category}
        </p>
        <h1 className="text-2xl font-medium flex items-center gap-3">
          {tool.label}
          {tool.kind ? <KindCue kind={tool.kind} /> : null}
        </h1>
        <p className="text-muted text-sm">
          {rows.length} public {rows.length === 1 ? "fetch uses" : "fetches use"} {tool.label}.{" "}
          <Link href={exploreHref({}, tool.filter)} className="hover:text-fg underline">
            Filter in explore
          </Link>
        </p>
      </header>
      <div className="rule pt-4">
        <FetchGrid rows={rows} empty={`Nobody has published a fetch with ${tool.label} yet.`} />
      </div>
    </div>
  );
}
