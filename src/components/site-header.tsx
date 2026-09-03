import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border chrome">
      <div className="max-w-6xl mx-auto px-5 h-12 flex items-center justify-between gap-6">
        <Link href="/" className="font-mono text-sm tracking-[0.18em] uppercase">
          <span className="inline-block w-2 h-2 bg-accent mr-2 align-middle" />
          sharefetch
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-muted hover:text-fg">
            Home
          </Link>
          <Link href="/explore" className="text-muted hover:text-fg">
            Explore
          </Link>
          <Link href="/new" className="btn btn-primary">
            Create fetch
          </Link>
        </nav>
      </div>
    </header>
  );
}
