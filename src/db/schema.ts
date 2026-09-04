import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { FetchSpec } from "@/lib/fetch-spec";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  handle: text("handle").notNull().unique(),
  bioUrl: text("bio_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_userId_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const fetches = pgTable(
  "fetches",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    spec: jsonb("spec").$type<FetchSpec>().notNull(),
    title: text("title").notNull(),
    displayName: text("display_name").notNull(),
    handle: text("handle").notNull(),
    visibility: text("visibility").notNull(),
    desktopKind: text("desktop_kind").notNull(),
    desktopSlug: text("desktop_slug").notNull(),
    distroSlug: text("distro_slug"),
    colorschemeSlug: text("colorscheme_slug"),
    displayServer: text("display_server"),
    layout: text("layout"),
    voteCount: integer("vote_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastVerifiedAt: timestamp("last_verified_at").notNull().defaultNow(),
  },
  (t) => [
    index("fetches_desktop_slug_idx").on(t.desktopSlug),
    index("fetches_desktop_kind_idx").on(t.desktopKind),
    index("fetches_distro_slug_idx").on(t.distroSlug),
    index("fetches_colorscheme_slug_idx").on(t.colorschemeSlug),
    index("fetches_display_server_idx").on(t.displayServer),
    index("fetches_layout_idx").on(t.layout),
    index("fetches_vote_count_idx").on(t.voteCount),
    index("fetches_last_verified_idx").on(t.lastVerifiedAt),
    index("fetches_handle_idx").on(t.handle),
    index("fetches_visibility_idx").on(t.visibility),
  ],
);

export const fetchVotes = pgTable(
  "fetch_votes",
  {
    fetchId: text("fetch_id")
      .notNull()
      .references(() => fetches.id, { onDelete: "cascade" }),
    voterId: text("voter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.fetchId, t.voterId] }),
    index("fetch_votes_voter_idx").on(t.voterId),
  ],
);

export const fetchUtils = pgTable(
  "fetch_utils",
  {
    fetchId: text("fetch_id")
      .notNull()
      .references(() => fetches.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    role: text("role"),
  },
  (t) => [
    primaryKey({ columns: [t.fetchId, t.slug] }),
    index("fetch_utils_slug_idx").on(t.slug),
  ],
);

export const fetchChangelog = pgTable(
  "fetch_changelog",
  {
    id: text("id").primaryKey(),
    fetchId: text("fetch_id")
      .notNull()
      .references(() => fetches.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("fetch_changelog_fetch_idx").on(t.fetchId)],
);

export const tools = pgTable("tools", {
  slug: text("slug").primaryKey(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  role: text("role"),
  usageCount: integer("usage_count").notNull().default(0),
});
