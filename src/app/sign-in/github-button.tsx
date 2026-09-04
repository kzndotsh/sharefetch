"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GithubButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signIn.social({ provider: "github", callbackURL: "/new" });
      }}
    >
      {pending ? "Redirecting to GitHub" : "Continue with GitHub"}
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        await authClient.signOut();
        window.location.assign("/");
      }}
    >
      Sign out
    </button>
  );
}
