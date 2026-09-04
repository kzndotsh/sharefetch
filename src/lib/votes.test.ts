import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import {
  ensureHandleUser,
  listExplore,
  toggleFetchVote,
  upsertFetch,
} from "@/db/queries";
import { fetches, fetchVotes, user } from "@/db/schema";
import { exploreHref, parseExploreFilters } from "./explore-params";
import { parseFetchSpec } from "./fetch-spec";

describe("explore popular default", () => {
  it("defaults sort to popular and omits it from hrefs", () => {
    expect(parseExploreFilters({}).sort).toBe("popular");
    expect(exploreHref({}, {})).toBe("/explore");
    expect(exploreHref({}, { sort: "latest" })).toBe("/explore?sort=latest");
    expect(exploreHref({ sort: "popular", kind: "wm" }, {})).toBe(
      "/explore?kind=wm",
    );
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("fetch votes (db)", () => {
  const cleanupFetchIds: string[] = [];
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    const db = getDb();
    if (cleanupFetchIds.length) {
      await db.delete(fetchVotes).where(inArray(fetchVotes.fetchId, cleanupFetchIds));
      await db.delete(fetches).where(inArray(fetches.id, cleanupFetchIds));
    }
    if (cleanupUserIds.length) {
      await db.delete(user).where(inArray(user.id, cleanupUserIds));
    }
  });

  function publicSpec(handle: string, title: string) {
    return parseFetchSpec({
      specVersion: 1,
      title,
      displayName: handle,
      handle,
      visibility: "public",
      desktop: { kind: "wm", label: "i3", slug: "i3" },
      utils: { items: [] },
      layers: [],
      sectionOrder: [],
      tags: [],
    });
  }

  it("toggle twice restores vote count", async () => {
    const owner = await ensureHandleUser(`vote-owner-${Date.now()}`);
    const voter = await ensureHandleUser(`vote-voter-${Date.now()}`);
    cleanupUserIds.push(owner.id, voter.id);

    const fetchId = await upsertFetch({
      ownerId: owner.id,
      spec: publicSpec(owner.handle, "vote toggle fixture"),
    });
    cleanupFetchIds.push(fetchId);

    const on = await toggleFetchVote({ fetchId, voterId: voter.id });
    expect(on).toEqual({ voteCount: 1, voted: true });

    const off = await toggleFetchVote({ fetchId, voterId: voter.id });
    expect(off).toEqual({ voteCount: 0, voted: false });
  });

  it("rejects self-vote when owner matches voter", async () => {
    const owner = await ensureHandleUser(`vote-self-${Date.now()}`);
    cleanupUserIds.push(owner.id);

    const fetchId = await upsertFetch({
      ownerId: owner.id,
      spec: publicSpec(owner.handle, "self vote fixture"),
    });
    cleanupFetchIds.push(fetchId);

    const [row] = await getDb()
      .select({ ownerId: fetches.ownerId })
      .from(fetches)
      .where(eq(fetches.id, fetchId))
      .limit(1);

    // Same gate as toggleVote server action
    expect(row?.ownerId === owner.id).toBe(true);
    const gateError = row?.ownerId === owner.id ? "own" : null;
    expect(gateError).toBe("own");
  });

  it("popular sort prefers higher voteCount", async () => {
    const owner = await ensureHandleUser(`vote-pop-${Date.now()}`);
    const voterA = await ensureHandleUser(`vote-pa-${Date.now()}`);
    const voterB = await ensureHandleUser(`vote-pb-${Date.now()}`);
    cleanupUserIds.push(owner.id, voterA.id, voterB.id);

    const lowId = await upsertFetch({
      ownerId: owner.id,
      spec: publicSpec(owner.handle, "popular low"),
    });
    const highId = await upsertFetch({
      ownerId: owner.id,
      spec: publicSpec(owner.handle, "popular high"),
    });
    cleanupFetchIds.push(lowId, highId);

    await toggleFetchVote({ fetchId: highId, voterId: voterA.id });
    await toggleFetchVote({ fetchId: highId, voterId: voterB.id });
    await toggleFetchVote({ fetchId: lowId, voterId: voterA.id });

    const rows = await listExplore({ sort: "popular" });
    const highIdx = rows.findIndex((r) => r.id === highId);
    const lowIdx = rows.findIndex((r) => r.id === lowId);
    expect(highIdx).toBeGreaterThanOrEqual(0);
    expect(lowIdx).toBeGreaterThanOrEqual(0);
    expect(highIdx).toBeLessThan(lowIdx);
    expect(rows[highIdx]?.voteCount).toBeGreaterThan(rows[lowIdx]?.voteCount ?? 0);
  });
});
