"use client";

import { useClipboardFlash } from "@/components/use-clipboard-flash";

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
  const { copied, copy } = useClipboardFlash();

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      title={title}
      onClick={() => {
        void copy(text);
      }}
    >
      {copied ? "copied" : label}
    </button>
  );
}
