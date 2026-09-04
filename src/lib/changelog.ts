import type { FetchSpec } from "./fetch-spec";

export function summarizeMutation(
  prev: FetchSpec | null,
  next: FetchSpec,
): string {
  if (!prev) {
    return "created";
  }
  const parts: string[] = [];
  if (prev.desktop.slug !== next.desktop.slug || prev.desktop.kind !== next.desktop.kind) {
    parts.push(`desktop → ${next.desktop.label} (${next.desktop.kind})`);
  }
  if (prev.distro?.slug !== next.distro?.slug) {
    parts.push(`distro → ${next.distro?.label ?? "none"}`);
  }
  if (prev.colorscheme?.slug !== next.colorscheme?.slug) {
    parts.push(`colorscheme → ${next.colorscheme?.label ?? "none"}`);
  }
  if (JSON.stringify(prev.utils.items) !== JSON.stringify(next.utils.items)) {
    parts.push("utils");
  }
  if (prev.title !== next.title) {
    parts.push("title");
  }
  if (prev.visibility !== next.visibility) {
    parts.push(`visibility → ${next.visibility}`);
  }
  return parts.length ? parts.join(", ") : "re-verified";
}

export function mergeIncomingSpec(
  current: FetchSpec,
  incoming: FetchSpec,
  replaceSectionOrder: boolean,
): FetchSpec {
  return {
    ...incoming,
    sectionOrder: replaceSectionOrder
      ? incoming.sectionOrder
      : current.sectionOrder,
  };
}
