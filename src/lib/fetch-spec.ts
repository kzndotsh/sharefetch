import { z } from "zod";

export const DESKTOP_KINDS = ["wm", "de", "compositor"] as const;
export type DesktopKind = (typeof DESKTOP_KINDS)[number];

export const VISIBILITIES = ["public", "unlisted", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const DISPLAY_SERVERS = ["wayland", "x11", "quartz", "other"] as const;
export type DisplayServer = (typeof DISPLAY_SERVERS)[number];

export const UTIL_ROLES = [
  "terminal",
  "bar",
  "launcher",
  "shell",
  "editor",
  "notifier",
  "filemanager",
  "browser",
  "compositor",
  "other",
] as const;
export type UtilRole = (typeof UTIL_ROLES)[number];

export const SOURCE_KINDS = ["manual", "paste", "json", "cli", "import"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const LAYER_KEYS = [
  "system",
  "desktop",
  "shell",
  "hardware",
  "toolchain",
  "aesthetic",
] as const;
export type LayerKey = (typeof LAYER_KEYS)[number];

const labeledSchema = z.object({
  label: z.string().min(1),
  slug: z.string().min(1),
});

export const utilItemSchema = labeledSchema.extend({
  role: z.enum(UTIL_ROLES).optional(),
});

export const layerItemSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().optional(),
  toolSlug: z.string().optional(),
  note: z.string().optional(),
});

export const layerItemsSchema = z.array(layerItemSchema);

export const fetchSpecSchema = z.looseObject({
  specVersion: z.literal(1),
  title: z.string().min(1),
  displayName: z.string().min(1),
  handle: z.string().min(1),
  headline: z.string().optional(),
  visibility: z.enum(VISIBILITIES),
  desktop: z.object({
    kind: z.enum(DESKTOP_KINDS),
    label: z.string().min(1),
    slug: z.string().min(1),
  }),
  wm: labeledSchema.optional(),
  de: labeledSchema.optional(),
  displayServer: z.enum(DISPLAY_SERVERS).optional(),
  compositor: labeledSchema.optional(),
  distro: labeledSchema.optional(),
  colorscheme: labeledSchema.optional(),
  utils: z.object({
    items: z.array(utilItemSchema),
  }),
  dotfilesUrl: z.string().url().optional().or(z.literal("")),
  screenshots: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
      }),
    )
    .optional(),
  layers: z.object({
    system: layerItemsSchema.optional(),
    desktop: layerItemsSchema.optional(),
    shell: layerItemsSchema.optional(),
    hardware: layerItemsSchema.optional(),
    toolchain: layerItemsSchema.optional(),
    aesthetic: layerItemsSchema.optional(),
  }),
  sectionOrder: z.array(z.string()),
  tags: z.array(z.string()),
  colors: z
    .object({
      background: z.string().optional(),
      foreground: z.string().optional(),
      accent: z.string().optional(),
      muted: z.string().optional(),
    })
    .optional(),
  theme: z.string().optional(),
  decisions: z
    .array(
      z.object({
        subject: z.string(),
        reason: z.string(),
      }),
    )
    .optional(),
  source: z
    .object({
      kind: z.enum(SOURCE_KINDS),
      rawHash: z.string().optional(),
    })
    .optional(),
});

export type FetchSpec = z.infer<typeof fetchSpecSchema>;
export type LayerItem = z.infer<typeof layerItemSchema>;
export type UtilItem = z.infer<typeof utilItemSchema>;

export const DEFAULT_SECTION_ORDER = [
  "title",
  "desktop",
  "displayServer",
  "detail",
  "distro",
  "colorscheme",
  "utils",
  "layers",
  "colors",
  "decisions",
  "visibility",
  "dotfilesUrl",
  "screenshots",
];

export function emptyFetchSpec(): FetchSpec {
  return {
    specVersion: 1,
    title: "",
    displayName: "",
    handle: "",
    visibility: "public",
    desktop: { kind: "compositor", label: "", slug: "" },
    utils: { items: [] },
    layers: {},
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    tags: [],
    source: { kind: "manual" },
  };
}

export function parseFetchSpec(input: unknown): FetchSpec {
  return fetchSpecSchema.parse(input);
}

export function safeParseFetchSpec(input: unknown) {
  return fetchSpecSchema.safeParse(input);
}

export function fetchSpecJsonSchema() {
  return z.toJSONSchema(fetchSpecSchema);
}

export function desktopKindCue(kind: DesktopKind): string {
  switch (kind) {
    case "wm":
      return "WM";
    case "de":
      return "DE";
    case "compositor":
      return "compositor";
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}
