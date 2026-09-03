import Link from "next/link";

export function ChipLink({
  href,
  active,
  children,
  count,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <Link href={href} className="chip" data-active={active}>
      {children}
      {count !== undefined ? <span className="chip-count">{count}</span> : null}
    </Link>
  );
}
