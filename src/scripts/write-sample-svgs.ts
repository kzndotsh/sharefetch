import { mkdirSync, writeFileSync } from "node:fs";
import { parseEmbedQuery } from "../lib/embed-query";
import { parseFetchSpec } from "../lib/fetch-spec";
import { renderFetchSvg } from "../lib/svg";

const gnome = parseFetchSpec({
  specVersion: 1,
  title: "GNOME is a DE, not a window manager",
  displayName: "gnomeling",
  handle: "gnomeling",
  visibility: "public",
  desktop: { kind: "de", label: "GNOME", slug: "gnome" },
  displayServer: "wayland",
  distro: { label: "Fedora", slug: "fedora" },
  colorscheme: { label: "Adwaita", slug: "adwaita" },
  utils: {
    items: [
      { label: "Nautilus", slug: "nautilus", role: "filemanager" },
      { label: "Firefox", slug: "firefox", role: "browser" },
    ],
  },
  layers: [],
  sectionOrder: [],
  tags: [],
});

const hypr = parseFetchSpec({
  specVersion: 1,
  title: "Minimal Hyprland with floating dock",
  displayName: "moth",
  handle: "moth",
  visibility: "public",
  desktop: { kind: "compositor", label: "Hyprland", slug: "hyprland" },
  displayServer: "wayland",
  distro: { label: "Arch Linux", slug: "arch-linux" },
  colorscheme: { label: "Catppuccin", slug: "catppuccin" },
  utils: {
    items: [
      { label: "kitty", slug: "kitty", role: "terminal" },
      { label: "Waybar", slug: "waybar", role: "bar" },
    ],
  },
  layers: [],
  sectionOrder: [],
  tags: [],
});

mkdirSync("docs", { recursive: true });
writeFileSync(
  "docs/embed-de.svg",
  renderFetchSvg(gnome, parseEmbedQuery(new URLSearchParams("theme=light")), {
    lastVerifiedAt: "2026-09-02",
  }),
);
writeFileSync(
  "docs/embed-compositor.svg",
  renderFetchSvg(hypr, parseEmbedQuery(new URLSearchParams("theme=dark")), {
    lastVerifiedAt: "2026-09-02",
  }),
);
