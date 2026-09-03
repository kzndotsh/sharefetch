"use client";

import { useEffect, useState } from "react";

const RESET_MS = 1400;

export function CopyButton({
  text,
  label,
  className = "btn",
  disabled = false,
  title,
}: {
  text: string;
  label: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      title={title}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "copied" : label}
    </button>
  );
}
