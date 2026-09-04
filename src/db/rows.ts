import type { fetchChangelog, fetches } from "./schema";

export type FetchRow = typeof fetches.$inferSelect;
export type ChangelogRow = typeof fetchChangelog.$inferSelect;
