import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border chrome">
      <div className="max-w-6xl mx-auto px-5 h-12 flex items-center justify-between gap-6">
        <Link href="/" className="font-mono text-sm tracking-[0.18em] uppercase">
          <span className="inline-block w-2 h-2 rounded-[2px] bg-accent mr-2 align-middle" />
          sharefetch
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="nav-link nav-home hover:text-fg text-muted">
            Home
          </Link>
          <Link href="/explore" className="nav-link nav-explore hover:text-fg text-muted">
            Explore
          </Link>
          <Link href="/sign-in" className="nav-link nav-signin hover:text-fg text-muted">
            Sign in
          </Link>
          <Link href="/new" className="btn btn-primary create-fetch-cta">
            Create fetch
          </Link>
        </nav>
      </div>
    </header>
  );
}
