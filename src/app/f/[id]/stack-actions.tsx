"use client";

import { useRouter } from "next/navigation";
import { forkSpec, writeDraft } from "@/lib/builder";
import type { FetchSpec } from "@/lib/fetch-spec";

export function StackActions({
  id,
  spec,
  isOwner,
}: {
  id: string;
  spec: FetchSpec;
  isOwner: boolean;
}) {
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => {
          writeDraft(window.localStorage, { spec: forkSpec(spec) });
          router.push("/new");
        }}
      >
        Fork
      </button>
      {isOwner ? (
        <button
          type="button"
          className="btn"
          onClick={() => {
            writeDraft(window.localStorage, { id, spec });
            router.push(`/new?id=${encodeURIComponent(id)}`);
          }}
        >
          Edit
        </button>
      ) : null}
    </>
  );
}
