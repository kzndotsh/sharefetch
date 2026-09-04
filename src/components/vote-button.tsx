"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleVote } from "@/app/actions/vote";

export function VoteButton({
  fetchId,
  voteCount,
  voted,
  isOwner,
}: {
  fetchId: string;
  voteCount: number;
  voted: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState(voteCount);
  const [active, setActive] = useState(voted);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        className="vote-btn flex flex-col items-center border border-border bg-paper rounded-[var(--radius)] px-1.5 py-1.5 min-w-[2.5rem] hover:border-accent hover:text-accent disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-fg"
        data-active={active}
        disabled={isOwner || pending}
        title={
          isOwner
            ? "You cannot vote on your own fetch"
            : active
              ? "Remove upvote"
              : "Upvote"
        }
        aria-label={
          isOwner
            ? "Cannot vote on your own fetch"
            : active
              ? `Remove upvote, ${count} votes`
              : `Upvote, ${count} votes`
        }
        aria-pressed={active}
        onClick={() => {
          if (isOwner) {
            return;
          }
          setError(null);
          const prevCount = count;
          const prevActive = active;
          setActive(!active);
          setCount(active ? Math.max(0, count - 1) : count + 1);
          startTransition(async () => {
            const result = await toggleVote(fetchId);
            if (!result.ok) {
              setActive(prevActive);
              setCount(prevCount);
              setError(
                result.error === "own"
                  ? "Own fetch"
                  : result.error === "private"
                    ? "Private"
                    : "Not found",
              );
              return;
            }
            setActive(result.voted);
            setCount(result.voteCount);
            router.refresh();
          });
        }}
      >
        <span aria-hidden="true" className="text-[10px] leading-none">
          ▲
        </span>
        <span className="chrome text-xs tabular-nums pt-0.5">{count}</span>
      </button>
      {error ? (
        <span className="chrome text-[9px] text-accent">{error}</span>
      ) : null}
    </div>
  );
}
