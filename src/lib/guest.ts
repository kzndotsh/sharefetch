import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "sharefetch_guest";

function secret(): string {
  return process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-sharefetch-secret-change-me";
}

export function signGuest(userId: string): string {
  const hmac = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${hmac}`;
}

export function verifyGuest(token: string | undefined): string | null {
  if (!token) {
    return null;
  }
  const [userId, hmac] = token.split(".");
  if (!userId || !hmac) {
    return null;
  }
  const expected = createHmac("sha256", secret()).update(userId).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  return userId;
}

export async function guestUserId(): Promise<string | null> {
  const jar = await cookies();
  return verifyGuest(jar.get(COOKIE)?.value);
}

export async function setGuestCookie(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, signGuest(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
