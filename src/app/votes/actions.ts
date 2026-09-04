"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { toggleFetchVote } from "@/db/queries";
import { fetches } from "@/db/schema";
import { ensureVoterGuest } from "@/lib/actor";

export type ToggleVoteResult =
  | { ok: true; voteCount: number; voted: boolean }
  | { ok: false; error: "not_found" | "own" | "private" };

export async function toggleVote(fetchId: string): Promise<ToggleVoteResult> {
  const voterId = await ensureVoterGuest();
  const [row] = await getDb()
    .select({
      id: fetches.id,
      ownerId: fetches.ownerId,
      visibility: fetches.visibility,
    })
    .from(fetches)
    .where(eq(fetches.id, fetchId))
    .limit(1);

  if (!row) {
    return { ok: false, error: "not_found" };
  }
  if (row.visibility === "private") {
    return { ok: false, error: "private" };
  }
  if (row.ownerId === voterId) {
    return { ok: false, error: "own" };
  }

  const result = await toggleFetchVote({ fetchId, voterId });
  revalidatePath("/explore");
  revalidatePath(`/f/${fetchId}`);
  revalidatePath("/lab/explore");
  return { ok: true, ...result };
}
