import { freshness } from "@/lib/format";

export function Verified({
  at,
  className = "",
}: {
  at: Date | string;
  className?: string;
}) {
  const { label, stale } = freshness(at);
  return (
    <span
      className={`text-xs text-muted ${stale ? "stale" : ""} ${className}`}
      title={stale ? "Not re-verified in over 90 days" : undefined}
    >
      {label}
      {stale ? " · stale" : ""}
    </span>
  );
}
