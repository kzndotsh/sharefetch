import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db";
import { fetchChangelog, fetches, fetchUtils, fetchVotes, tools, user } from "@/db/schema";
import { summarizeMutation } from "@/lib/changelog";
import type { FetchSpec, PublishedFetchSpec } from "@/lib/fetch-spec";
import { hydrateFetchSpec, parseFetchSpec } from "@/lib/fetch-spec";
import { resolveDesktopLayout } from "@/lib/catalogs";

export type ExploreFilters = {
  q?: string;
  desktop?: string;
  kind?: string;
  distro?: string;
  colorscheme?: string;
  util?: string;
  displayServer?: string;
  layout?: string;
  sort?: "latest" | "random" | "popular";
};

function withHydratedSpec<T extends { spec: FetchSpec }>(row: T): T {
  return { ...row, spec: hydrateFetchSpec(row.spec) };
}

export function denormalize(spec: PublishedFetchSpec) {
  return {
    title: spec.title,
    displayName: spec.displayName,
    handle: spec.handle,
    visibility: spec.visibility,
    desktopKind: spec.desktop.kind,
    desktopSlug: spec.desktop.slug,
    distroSlug: spec.distro?.slug ?? null,
    colorschemeSlug: spec.colorscheme?.slug ?? null,
    displayServer: spec.displayServer ?? null,
    layout:
      resolveDesktopLayout({
        desktopSlug: spec.desktop.slug,
        wmSlug: spec.wm?.slug,
      }) ?? null,
  };
}

export async function upsertFetch(input: {
  id?: string;
  ownerId: string;
  spec: FetchSpec;
  previous?: FetchSpec | null;
}) {
  const db = getDb();
  const spec = parseFetchSpec(input.spec);
  const id = input.id ?? nanoid();
  const fields = denormalize(spec);
  const now = new Date();
  const existing = input.id
    ? (
        await db.select().from(fetches).where(eq(fetches.id, id)).limit(1)
      )[0]
    : undefined;

  if (existing) {
    await db
      .update(fetches)
      .set({
        spec,
        ...fields,
        updatedAt: now,
        lastVerifiedAt: now,
      })
      .where(eq(fetches.id, id));
    await db.delete(fetchUtils).where(eq(fetchUtils.fetchId, id));
  } else {
    await db.insert(fetches).values({
      id,
      ownerId: input.ownerId,
      spec,
      ...fields,
      createdAt: now,
      updatedAt: now,
      lastVerifiedAt: now,
    });
  }

  if (spec.utils.items.length) {
    await db.insert(fetchUtils).values(
      spec.utils.items.map((item) => ({
        fetchId: id,
        slug: item.slug,
        role: item.role ?? null,
      })),
    );
  }

  await db.insert(fetchChangelog).values({
    id: nanoid(),
    fetchId: id,
    summary: summarizeMutation(
      input.previous ?? (existing ? hydrateFetchSpec(existing.spec) : null),
      spec,
    ),
    createdAt: now,
  });

  await refreshToolCounts();
  return id;
}

export async function refreshToolCounts() {
  const db = getDb();
  const rows = await db
    .select({
      slug: fetchUtils.slug,
      count: sql<number>`count(*)::int`,
    })
    .from(fetchUtils)
    .groupBy(fetchUtils.slug);
  for (const row of rows) {
    await db
      .update(tools)
      .set({ usageCount: row.count })
      .where(eq(tools.slug, row.slug));
  }
}

export async function getPublicFetch(id: string) {
  const db = getDb();
  const [row] = await db.select().from(fetches).where(eq(fetches.id, id)).limit(1);
  if (!row) {
    return null;
  }
  if (row.visibility === "private") {
    return null;
  }
  return withHydratedSpec(row);
}

export async function listExplore(filters: ExploreFilters) {
  const db = getDb();
  const where = await exploreWhere(filters);
  if (!where) {
    return [];
  }

  const sort = filters.sort ?? "popular";
  if (sort === "random") {
    return db
      .select()
      .from(fetches)
      .where(where)
      .orderBy(sql`random()`)
      .limit(48)
      .then((rows) => rows.map(withHydratedSpec));
  }
  if (sort === "latest") {
    return db
      .select()
      .from(fetches)
      .where(where)
      .orderBy(desc(fetches.lastVerifiedAt))
      .limit(48)
      .then((rows) => rows.map(withHydratedSpec));
  }
  return db
    .select()
    .from(fetches)
    .where(where)
    .orderBy(desc(fetches.voteCount), desc(fetches.lastVerifiedAt))
    .limit(48)
    .then((rows) => rows.map(withHydratedSpec));
}

export async function countExplore(filters: ExploreFilters): Promise<number> {
  const db = getDb();
  const where = await exploreWhere(filters);
  if (!where) {
    return 0;
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fetches)
    .where(where);
  return row?.count ?? 0;
}

export async function countPublicFetches(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fetches)
    .where(eq(fetches.visibility, "public"));
  return row?.count ?? 0;
}

async function exploreWhere(filters: ExploreFilters) {
  const db = getDb();
  const clauses = [eq(fetches.visibility, "public")];
  if (filters.desktop) {
    clauses.push(eq(fetches.desktopSlug, filters.desktop));
  }
  if (filters.kind) {
    clauses.push(eq(fetches.desktopKind, filters.kind));
  }
  if (filters.distro) {
    clauses.push(eq(fetches.distroSlug, filters.distro));
  }
  if (filters.colorscheme) {
    clauses.push(eq(fetches.colorschemeSlug, filters.colorscheme));
  }
  if (filters.displayServer) {
    clauses.push(eq(fetches.displayServer, filters.displayServer));
  }
  if (filters.layout) {
    clauses.push(eq(fetches.layout, filters.layout));
  }
  if (filters.q) {
    const q = `%${filters.q}%`;
    clauses.push(or(ilike(fetches.title, q), ilike(fetches.handle, q))!);
  }

  if (filters.util) {
    const utilRows = await db
      .select({ fetchId: fetchUtils.fetchId })
      .from(fetchUtils)
      .where(eq(fetchUtils.slug, filters.util));
    const ids = utilRows.map((r) => r.fetchId);
    if (ids.length === 0) {
      return null;
    }
    return and(...clauses, inArray(fetches.id, ids));
  }

  return and(...clauses);
}

export async function facetCounts() {
  const db = getDb();
  const publicOnly = eq(fetches.visibility, "public");
  const desktop = await db
    .select({
      slug: fetches.desktopSlug,
      kind: fetches.desktopKind,
      count: sql<number>`count(*)::int`,
    })
    .from(fetches)
    .where(publicOnly)
    .groupBy(fetches.desktopSlug, fetches.desktopKind);
  const distro = await db
    .select({
      slug: fetches.distroSlug,
      count: sql<number>`count(*)::int`,
    })
    .from(fetches)
    .where(publicOnly)
    .groupBy(fetches.distroSlug);
  const colorscheme = await db
    .select({
      slug: fetches.colorschemeSlug,
      count: sql<number>`count(*)::int`,
    })
    .from(fetches)
    .where(publicOnly)
    .groupBy(fetches.colorschemeSlug);
  const utils = await db
    .select({
      slug: fetchUtils.slug,
      count: sql<number>`count(*)::int`,
    })
    .from(fetchUtils)
    .innerJoin(fetches, eq(fetches.id, fetchUtils.fetchId))
    .where(publicOnly)
    .groupBy(fetchUtils.slug);
  const layout = await db
    .select({
      slug: fetches.layout,
      count: sql<number>`count(*)::int`,
    })
    .from(fetches)
    .where(publicOnly)
    .groupBy(fetches.layout);
  return { desktop, distro, colorscheme, utils, layout };
}

export async function listByHandle(handle: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(fetches)
    .where(and(eq(fetches.handle, handle), eq(fetches.visibility, "public")))
    .orderBy(desc(fetches.updatedAt));
  return rows.map(withHydratedSpec);
}

export async function latestPublic(limit = 8) {
  const db = getDb();
  const rows = await db
    .select()
    .from(fetches)
    .where(eq(fetches.visibility, "public"))
    .orderBy(desc(fetches.lastVerifiedAt))
    .limit(limit);
  return rows.map(withHydratedSpec);
}

export async function changelogFor(fetchId: string) {
  const db = getDb();
  return db
    .select()
    .from(fetchChangelog)
    .where(eq(fetchChangelog.fetchId, fetchId))
    .orderBy(desc(fetchChangelog.createdAt));
}

export async function getUserByHandle(handle: string) {
  const db = getDb();
  const [row] = await db.select().from(user).where(eq(user.handle, handle)).limit(1);
  return row;
}

export async function ensureHandleUser(handle: string, name?: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.handle, handle))
    .limit(1);
  if (existing) {
    return existing;
  }
  const id = nanoid();
  const now = new Date();
  const [created] = await db
    .insert(user)
    .values({
      id,
      handle,
      name: name ?? handle,
      email: `${id}@guest.sharefetch.local`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return created;
}

export async function toggleFetchVote(input: {
  fetchId: string;
  voterId: string;
}): Promise<{ voteCount: number; voted: boolean }> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(fetchVotes)
      .where(
        and(
          eq(fetchVotes.fetchId, input.fetchId),
          eq(fetchVotes.voterId, input.voterId),
        ),
      )
      .limit(1);

    if (existing) {
      await tx
        .delete(fetchVotes)
        .where(
          and(
            eq(fetchVotes.fetchId, input.fetchId),
            eq(fetchVotes.voterId, input.voterId),
          ),
        );
      await tx
        .update(fetches)
        .set({
          voteCount: sql`GREATEST(0, ${fetches.voteCount} - 1)`,
        })
        .where(eq(fetches.id, input.fetchId));
    } else {
      await tx.insert(fetchVotes).values({
        fetchId: input.fetchId,
        voterId: input.voterId,
        createdAt: new Date(),
      });
      await tx
        .update(fetches)
        .set({
          voteCount: sql`${fetches.voteCount} + 1`,
        })
        .where(eq(fetches.id, input.fetchId));
    }

    const [row] = await tx
      .select({ voteCount: fetches.voteCount })
      .from(fetches)
      .where(eq(fetches.id, input.fetchId))
      .limit(1);
    return {
      voteCount: row?.voteCount ?? 0,
      voted: !existing,
    };
  });
}

export async function votesForVoter(
  voterId: string,
  fetchIds: string[],
): Promise<Set<string>> {
  if (fetchIds.length === 0) {
    return new Set();
  }
  const db = getDb();
  const rows = await db
    .select({ fetchId: fetchVotes.fetchId })
    .from(fetchVotes)
    .where(
      and(
        eq(fetchVotes.voterId, voterId),
        inArray(fetchVotes.fetchId, fetchIds),
      ),
    );
  return new Set(rows.map((r) => r.fetchId));
}

export async function hasVoted(fetchId: string, voterId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ fetchId: fetchVotes.fetchId })
    .from(fetchVotes)
    .where(
      and(eq(fetchVotes.fetchId, fetchId), eq(fetchVotes.voterId, voterId)),
    )
    .limit(1);
  return Boolean(row);
}
