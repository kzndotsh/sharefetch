import type { FetchRow } from "@/db/rows";
import type { facetCounts } from "@/db/queries";

export type LabFacets = Awaited<ReturnType<typeof facetCounts>>;
export type LabRows = FetchRow[];

export type ConceptProps = {
  rows: LabRows;
  facets: LabFacets;
};
