import type { Metadata } from "next";
import { ExploreBoard } from "@/components/explore-board";
import {
  countExplore,
  countPublicFetches,
  facetCounts,
  listExplore,
  votesForVoter,
} from "@/db/queries";
import { currentActorId } from "@/lib/actor";
import { parseExploreFilters } from "@/lib/explore-params";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage(props: PageProps<"/explore">) {
  const filters = parseExploreFilters(await props.searchParams);
  const [rows, facets, actorId, matched, total] = await Promise.all([
    listExplore(filters),
    facetCounts(),
    currentActorId(),
    countExplore(filters),
    countPublicFetches(),
  ]);
  const votedIds = actorId
    ? await votesForVoter(
        actorId,
        rows.map((r) => r.id),
      )
    : new Set<string>();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
          Explore
        </p>
        <h1 className="text-2xl font-medium">Public fetches</h1>
        <p className="text-sm text-muted max-w-4xl">
          Upvote stacks you like. Filter from the search rail — desktop, layout, distro, and more.
        </p>
      </header>
      <ExploreBoard
        rows={rows}
        facets={facets}
        filters={filters}
        votedIds={votedIds}
        actorId={actorId}
        matched={matched}
        total={total}
      />
    </div>
  );
}
