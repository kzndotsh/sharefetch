import type { Metadata } from "next";
import Link from "next/link";
import { listPublicUsers } from "@/db/queries";
import { isoDate } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const users = await listPublicUsers();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
          Users
        </p>
        <h1 className="text-2xl font-medium">People with public fetches</h1>
        <p className="text-sm text-muted max-w-3xl">
          {users.length} {users.length === 1 ? "handle" : "handles"} on the
          board.
        </p>
      </header>

      {users.length === 0 ? (
        <p className="text-sm text-muted">No public users yet.</p>
      ) : (
        <ul className="flex flex-col border-t border-border">
          {users.map((user) => {
            const name = user.displayName?.trim() || user.handle;
            const showName = name !== user.handle;
            return (
              <li key={user.handle} className="border-b border-border">
                <Link
                  href={`/u/${user.handle}`}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-1 py-3 items-baseline hover:text-accent"
                >
                  <span className="min-w-0 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                    <span className="font-medium truncate">@{user.handle}</span>
                    {showName ? (
                      <span className="text-xs text-muted truncate">{name}</span>
                    ) : null}
                  </span>
                  <span className="chrome text-xs text-muted tabular-nums shrink-0">
                    {user.fetchCount}{" "}
                    {user.fetchCount === 1 ? "fetch" : "fetches"}
                  </span>
                  <span className="hidden sm:inline chrome text-xs text-muted tabular-nums shrink-0">
                    {user.lastVerifiedAt ? isoDate(user.lastVerifiedAt) : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
