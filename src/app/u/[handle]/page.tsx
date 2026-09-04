import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FetchGrid } from "@/components/fetch-card";
import { getUserByHandle, listByHandle } from "@/db/queries";

export async function generateMetadata(
  props: PageProps<"/u/[handle]">,
): Promise<Metadata> {
  const { handle } = await props.params;
  return { title: `@${handle}` };
}

export default async function UserPage(props: PageProps<"/u/[handle]">) {
  const { handle } = await props.params;
  const [account, rows] = await Promise.all([
    getUserByHandle(handle),
    listByHandle(handle),
  ]);
  if (!account && rows.length === 0) {
    notFound();
  }
  const displayName = account?.name ?? rows[0]?.displayName ?? handle;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">user</p>
        <h1 className="text-2xl font-medium">@{handle}</h1>
        {displayName !== handle ? <p className="text-muted">{displayName}</p> : null}
        {account?.bioUrl ? (
          <a href={account.bioUrl} rel="noreferrer" className="text-xs text-muted hover:text-fg break-all">
            {account.bioUrl}
          </a>
        ) : null}
      </header>
      <div className="rule pt-4">
        <FetchGrid rows={rows} empty="No public fetches from this handle yet." />
      </div>
    </div>
  );
}
