import type { EmbedThemeId } from "./embed-query";

export function embedSvgUrl(
  origin: string,
  id: string,
  theme: EmbedThemeId,
  updatedAt: Date | string,
): string {
  const version = Math.floor(new Date(updatedAt).getTime() / 1000);
  return `${origin}/embed/${id}.svg?theme=${theme}&v=${version}`;
}

export function embedMarkdown(
  origin: string,
  id: string,
  theme: EmbedThemeId,
  updatedAt: Date | string,
): string {
  return `![fetch](${embedSvgUrl(origin, id, theme, updatedAt)})`;
}
