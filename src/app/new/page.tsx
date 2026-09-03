import type { Metadata } from "next";
import { getPublicFetch } from "@/db/queries";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "Create fetch" };

export default async function NewPage(props: PageProps<"/new">) {
  const { id } = await props.searchParams;
  const editId = Array.isArray(id) ? id[0] : id;
  const row = editId ? await getPublicFetch(editId) : null;
  return (
    <Builder
      key={editId ?? "new"}
      editId={editId || undefined}
      existing={row ? { id: row.id, spec: row.spec } : null}
    />
  );
}
