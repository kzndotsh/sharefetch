import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { GithubButton, SignOutButton } from "./github-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const githubEnabled = Boolean(process.env.GITHUB_CLIENT_ID);

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">account</p>
        <h1 className="text-2xl font-medium">Sign in</h1>
      </header>

      {session ? (
        <div className="printout p-4 flex flex-col gap-3 text-sm">
          <p>
            Signed in as <span className="font-medium">{session.user.name}</span>.
          </p>
          <div className="flex gap-2">
            <Link href="/new" className="btn btn-primary">
              Create fetch
            </Link>
            <SignOutButton />
          </div>
        </div>
      ) : (
        <div className="printout p-4 flex flex-col gap-4 text-sm">
          <p className="text-muted">
            You do not need an account to publish. The builder issues a guest
            cookie on first publish, and that cookie owns your fetches on this
            browser. Sign in to keep ownership across devices.
          </p>
          {githubEnabled ? (
            <GithubButton />
          ) : (
            <p className="text-xs text-muted border border-border p-3">
              GitHub sign-in is not configured on this instance. You can still
              publish as a guest from the builder.
            </p>
          )}
          <Link href="/new" className="text-xs text-muted hover:text-fg underline">
            Continue as guest
          </Link>
        </div>
      )}
    </div>
  );
}
