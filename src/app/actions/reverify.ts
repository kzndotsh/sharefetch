"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { upsertFetch } from "@/db/queries";
import { fetches } from "@/db/schema";
import { currentActorId } from "@/lib/actor";
import { hydrateFetchSpec } from "@/lib/fetch-spec";

export async function reverifyFetch(id: string) {
  const ownerId = await currentActorId();
  const [row] = await getDb()
    .select()
    .from(fetches)
    .where(eq(fetches.id, id))
    .limit(1);
  if (!row || row.ownerId !== ownerId) {
    throw new Error("not owner");
  }
  const spec = hydrateFetchSpec(row.spec);
  await upsertFetch({
    id,
    ownerId: row.ownerId,
    spec,
    previous: spec,
  });
  redirect(`/f/${id}`);
}
