import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { ensureHandleUser } from "@/db/queries";
import { auth } from "./auth";
import { guestUserId, setGuestCookie } from "./guest";

export async function currentActorId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    return session.user.id;
  }
  return guestUserId();
}

/** Session user, existing guest, or a newly minted anonymous voter guest. */
export async function ensureVoterGuest(): Promise<string> {
  const existing = await currentActorId();
  if (existing) {
    return existing;
  }
  const created = await ensureHandleUser(`v-${nanoid(8)}`);
  await setGuestCookie(created.id);
  return created.id;
}

export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
