"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentActorId } from "@/lib/actor";
import { auth } from "@/lib/auth";
import { mergeIncomingSpec } from "@/lib/changelog";
import { parseFetchSpec, type FetchSpec } from "@/lib/fetch-spec";
import { guestUserId, setGuestCookie } from "@/lib/guest";
import { parseFetchPaste } from "@/lib/paste";
import { ensureHandleUser, upsertFetch } from "@/db/queries";
import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { fetches } from "@/db/schema";

async function requireOwner(handle: string): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    return session.user.id;
  }
  const existingGuest = await guestUserId();
  if (existingGuest) {
    return existingGuest;
  }
  const created = await ensureHandleUser(handle);
  await setGuestCookie(created.id);
  return created.id;
}

export async function publishFetch(input: {
  id?: string;
  spec: unknown;
  replaceSectionOrder?: boolean;
}) {
  const spec = parseFetchSpec(input.spec);
  const ownerId = await requireOwner(spec.handle);
  const previousRow = input.id
    ? (await getDb().select().from(fetches).where(eq(fetches.id, input.id)).limit(1))[0]
    : undefined;
  if (previousRow && previousRow.ownerId !== ownerId) {
    throw new Error("not owner");
  }
  const merged =
    previousRow && !input.replaceSectionOrder
      ? mergeIncomingSpec(previousRow.spec, spec, false)
      : spec;
  const id = await upsertFetch({
    id: input.id,
    ownerId,
    spec: merged,
    previous: previousRow?.spec ?? null,
  });
  redirect(`/f/${id}`);
}

export async function reverifyFetch(id: string) {
  const ownerId = await currentActorId();
  const [row] = await getDb().select().from(fetches).where(eq(fetches.id, id)).limit(1);
  if (!row || row.ownerId !== ownerId) {
    throw new Error("not owner");
  }
  await upsertFetch({
    id,
    ownerId: row.ownerId,
    spec: row.spec,
    previous: row.spec,
  });
  redirect(`/f/${id}`);
}

export async function pasteIntoSpec(raw: string, handle: string): Promise<FetchSpec> {
  return parseFetchPaste(raw, handle);
}
