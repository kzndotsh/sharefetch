import type { Metadata } from "next";
import Link from "next/link";
import { facetCounts, listExplore, votesForVoter } from "@/db/queries";
import { currentActorId } from "@/lib/actor";
import { DossierIndex } from "./concepts/dossier-index";
import { FacetMatrix } from "./concepts/facet-matrix";
import { LaunchBoard } from "./concepts/launch-board";
import { SvgRiver } from "./concepts/svg-river";
import { TerminalQuery } from "./concepts/terminal-query";
import { TraitOrbit } from "./concepts/trait-orbit";

export const metadata: Metadata = { title: "Explore lab" };

const CONCEPTS = [
  {
    id: "terminal",
    num: "01",
    title: "Terminal query",
    blurb: "Explore as a shell prompt — tokens rewrite the command, results print as stdout.",
  },
  {
    id: "matrix",
    num: "02",
    title: "Facet matrix",
    blurb: "Kind × layout heat grid. Click a cell to open production Explore with both filters.",
  },
  {
    id: "river",
    num: "03",
    title: "SVG river",
    blurb: "The product is the card — horizontal live embeds first, printout grid second.",
  },
  {
    id: "dossier",
    num: "04",
    title: "Dossier index",
    blurb: "Dense file-index list for scanning. Hover a row to peek the stack.",
  },
  {
    id: "orbit",
    num: "05",
    title: "Trait orbit",
    blurb: "Classification-first cloud — start from kind, layout, display, desktop, distro.",
  },
  {
    id: "board",
    num: "06",
    title: "Launch board",
    blurb:
      "Ranked upvote list with live voteCount — same mechanics as production Explore.",
  },
] as const;

export default async function LabExplorePage() {
  const [rows, facets, actorId] = await Promise.all([
    listExplore({ sort: "popular" }),
    facetCounts(),
    currentActorId(),
  ]);
  const votedIds = actorId
    ? await votesForVoter(
        actorId,
        rows.map((r) => r.id),
      )
    : new Set<string>();

  return (
    <div className="flex flex-col gap-0 pb-16">
      <header className="border-b border-border px-5 py-6 flex flex-col gap-3 max-w-6xl mx-auto w-full">
        <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
          Lab · explore concepts
        </p>
        <h1 className="text-2xl font-medium">Explore metaphors</h1>
        <p className="text-sm text-muted max-w-2xl">
          Disposable experiments on live public fetches. Production{" "}
          <Link href="/explore" className="text-fg underline">
            /explore
          </Link>{" "}
          is unchanged — pick a direction from these, then redesign for real.
        </p>
      </header>

      <nav
        className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-sm px-5 py-2"
        aria-label="Concept jump"
      >
        <div className="max-w-6xl mx-auto flex flex-wrap gap-2 chrome text-xs tracking-[0.08em] uppercase">
          {CONCEPTS.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="border border-border px-2.5 py-1.5 hover:border-accent hover:text-accent"
            >
              {c.num} {c.title}
            </a>
          ))}
        </div>
      </nav>

      <ConceptSection {...CONCEPTS[0]}>
        <div className="max-w-6xl mx-auto w-full px-5">
          <TerminalQuery rows={rows} facets={facets} />
        </div>
      </ConceptSection>

      <ConceptSection {...CONCEPTS[1]}>
        <div className="max-w-6xl mx-auto w-full px-5">
          <FacetMatrix rows={rows} facets={facets} />
        </div>
      </ConceptSection>

      <ConceptSection {...CONCEPTS[2]} flush>
        <SvgRiver rows={rows} facets={facets} />
      </ConceptSection>

      <ConceptSection {...CONCEPTS[3]}>
        <div className="max-w-6xl mx-auto w-full px-5">
          <DossierIndex rows={rows} facets={facets} />
        </div>
      </ConceptSection>

      <ConceptSection {...CONCEPTS[4]}>
        <div className="max-w-6xl mx-auto w-full px-5">
          <TraitOrbit rows={rows} facets={facets} />
        </div>
      </ConceptSection>

      <ConceptSection {...CONCEPTS[5]}>
        <div className="max-w-6xl mx-auto w-full px-5">
          <LaunchBoard
            rows={rows}
            facets={facets}
            votedIds={votedIds}
            actorId={actorId}
          />
        </div>
      </ConceptSection>

      <p className="chrome text-xs text-muted text-center px-5 pt-10">
        Lab concepts · production Explore is the launch board with real votes.
      </p>
    </div>
  );
}

function ConceptSection({
  id,
  num,
  title,
  blurb,
  children,
  flush = false,
}: {
  id: string;
  num: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-14 border-b border-border py-10 flex flex-col gap-6"
    >
      <div className={`flex flex-col gap-1 ${flush ? "px-5 max-w-6xl mx-auto w-full" : "px-5 max-w-6xl mx-auto w-full"}`}>
        <p className="chrome text-xs tracking-[0.18em] uppercase text-accent">
          Concept {num}
        </p>
        <h2 className="text-xl font-medium">{title}</h2>
        <p className="text-sm text-muted max-w-2xl">{blurb}</p>
      </div>
      {children}
    </section>
  );
}
