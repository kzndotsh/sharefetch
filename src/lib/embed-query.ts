import { z } from "zod";

export const EMBED_THEMES = [
  "default",
  "dark",
  "light",
  "tokyonight",
  "gruvbox",
  "nord",
  "catppuccin",
] as const;

export type EmbedThemeId = (typeof EMBED_THEMES)[number];

export type EmbedTheme = {
  background: string;
  foreground: string;
  accent: string;
  muted: string;
  border: string;
};

export const THEME_MAP: Record<EmbedThemeId, EmbedTheme> = {
  default: {
    background: "#14110f",
    foreground: "#ece6d8",
    accent: "#c45c26",
    muted: "#8a8376",
    border: "#3a342c",
  },
  dark: {
    background: "#0e1014",
    foreground: "#e6edf3",
    accent: "#7aa2f7",
    muted: "#7d8590",
    border: "#2d333b",
  },
  light: {
    background: "#f4efe4",
    foreground: "#1c1916",
    accent: "#a33b15",
    muted: "#6b645a",
    border: "#d4cbb8",
  },
  tokyonight: {
    background: "#1a1b26",
    foreground: "#c0caf5",
    accent: "#7aa2f7",
    muted: "#565f89",
    border: "#3b4261",
  },
  gruvbox: {
    background: "#1d2021",
    foreground: "#ebdbb2",
    accent: "#fe8019",
    muted: "#928374",
    border: "#3c3836",
  },
  nord: {
    background: "#2e3440",
    foreground: "#eceff4",
    accent: "#88c0d0",
    muted: "#7b88a1",
    border: "#4c566a",
  },
  catppuccin: {
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    accent: "#cba6f7",
    muted: "#6c7086",
    border: "#313244",
  },
};

export const embedQuerySchema = z.object({
  theme: z.enum(EMBED_THEMES).optional().default("default"),
  hide: z.string().optional(),
  show_icons: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => v === "true" || v === "1"),
  layout: z.enum(["compact", "full"]).optional().default("full"),
  v: z.string().optional(),
});

export type EmbedQuery = z.infer<typeof embedQuerySchema>;

export function parseEmbedQuery(searchParams: URLSearchParams): EmbedQuery {
  return embedQuerySchema.parse({
    theme: searchParams.get("theme") ?? undefined,
    hide: searchParams.get("hide") ?? undefined,
    show_icons: searchParams.get("show_icons") ?? undefined,
    layout: searchParams.get("layout") ?? undefined,
    v: searchParams.get("v") ?? undefined,
  });
}

export function hiddenSet(hide: string | undefined): Set<string> {
  if (!hide) {
    return new Set();
  }
  return new Set(
    hide
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}
