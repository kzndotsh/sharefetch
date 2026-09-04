import Link from "next/link";

export function ChipLink({
  href,
  active,
  children,
  count,
  compact = false,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  count?: number;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={compact ? "topic-chip" : "chip"}
      data-active={active}
    >
      {children}
      {count !== undefined ? <span className="chip-count">{count}</span> : null}
    </Link>
  );
}
