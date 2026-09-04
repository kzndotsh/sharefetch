import "dotenv/config";
import { getDb } from "@/db";
import { fetches, fetchChangelog, fetchUtils, tools, user } from "@/db/schema";
import { upsertFetch } from "@/db/queries";
import {
  COLORSCHEMES,
  DESKTOP_COMPOSITOR,
  DESKTOP_DE,
  DISTROS,
  UTILS,
  catalogForKind,
} from "@/lib/catalogs";
import {
  DEFAULT_SECTION_ORDER,
  parseFetchSpec,
  type FetchSpec,
} from "@/lib/fetch-spec";

function f(
  id: string,
  ownerHandle: string,
  spec: Omit<FetchSpec, "specVersion" | "sectionOrder" | "utils" | "layers" | "tags" | "visibility"> &
    Partial<FetchSpec>,
): { id: string; handle: string; spec: FetchSpec } {
  return {
    id,
    handle: ownerHandle,
    spec: parseFetchSpec({
      specVersion: 1,
      visibility: "public",
      utils: { items: [] },
      layers: [],
      sectionOrder: [...DEFAULT_SECTION_ORDER],
      tags: [],
      handle: ownerHandle,
      displayName: ownerHandle,
      ...spec,
    }),
  };
}

const SEED = [
  f("seed-hypr-arch", "moth", {
    title: "Minimal Hyprland with floating dock",
    desktop: { kind: "compositor", label: "Hyprland", slug: "hyprland" },
    displayServer: "wayland",
    distro: { label: "Arch Linux", slug: "arch-linux" },
    colorscheme: { label: "Catppuccin", slug: "catppuccin" },
    utils: {
      items: [
        { label: "kitty", slug: "kitty", role: "terminal" },
        { label: "Waybar", slug: "waybar", role: "bar" },
        { label: "Rofi", slug: "rofi", role: "launcher" },
        { label: "Neovim", slug: "neovim", role: "editor" },
      ],
    },
    dotfilesUrl: "https://github.com/example/hypr-dots",
    decisions: [
      {
        subject: "Hyprland",
        reason: "Wanted per-window rounding without a full DE.",
      },
    ],
  }),
  f("seed-sway-fedora", "nori", {
    title: "Sway as the session, not a WM under GNOME",
    desktop: { kind: "compositor", label: "Sway", slug: "sway" },
    displayServer: "wayland",
    distro: { label: "Fedora", slug: "fedora" },
    colorscheme: { label: "Gruvbox", slug: "gruvbox" },
    utils: {
      items: [
        { label: "foot", slug: "foot", role: "terminal" },
        { label: "Waybar", slug: "waybar", role: "bar" },
        { label: "Fuzzel", slug: "fuzzel", role: "launcher" },
      ],
    },
  }),
  f("seed-niri-nix", "pixel", {
    title: "Niri scrollable tiling on NixOS",
    desktop: { kind: "compositor", label: "Niri", slug: "niri" },
    displayServer: "wayland",
    distro: { label: "NixOS", slug: "nixos" },
    colorscheme: { label: "Nord", slug: "nord" },
    utils: {
      items: [
        { label: "Alacritty", slug: "alacritty", role: "terminal" },
        { label: "EWW", slug: "eww", role: "bar" },
      ],
    },
  }),
  f("seed-river-void", "voider", {
    title: "River on Void, tiny and mean",
    desktop: { kind: "compositor", label: "River", slug: "river" },
    displayServer: "wayland",
    distro: { label: "Void Linux", slug: "void-linux" },
    colorscheme: { label: "Everforest", slug: "everforest" },
    utils: { items: [{ label: "foot", slug: "foot", role: "terminal" }] },
  }),
  f("seed-i3-picom", "moth", {
    title: "i3 + picom, still X11 on purpose",
    desktop: { kind: "wm", label: "i3", slug: "i3" },
    compositor: { label: "picom", slug: "picom" },
    displayServer: "x11",
    distro: { label: "Debian", slug: "debian" },
    colorscheme: { label: "Tokyo Night", slug: "tokyo-night" },
    utils: {
      items: [
        { label: "kitty", slug: "kitty", role: "terminal" },
        { label: "Polybar", slug: "polybar", role: "bar" },
        { label: "picom", slug: "picom", role: "compositor" },
        { label: "Rofi", slug: "rofi", role: "launcher" },
      ],
    },
  }),
  f("seed-bspwm", "nori", {
    title: "bspwm binary tree, no DE in sight",
    desktop: { kind: "wm", label: "bspwm", slug: "bspwm" },
    compositor: { label: "picom", slug: "picom" },
    displayServer: "x11",
    distro: { label: "Arch Linux", slug: "arch-linux" },
    colorscheme: { label: "Dracula", slug: "dracula" },
    utils: {
      items: [
        { label: "Alacritty", slug: "alacritty", role: "terminal" },
        { label: "Polybar", slug: "polybar", role: "bar" },
      ],
    },
  }),
  f("seed-dwm", "voider", {
    title: "dwm, patched once, never again",
    desktop: { kind: "wm", label: "dwm", slug: "dwm" },
    displayServer: "x11",
    distro: { label: "Gentoo", slug: "gentoo" },
    colorscheme: { label: "One Dark", slug: "onedark" },
    utils: { items: [{ label: "st", slug: "st", role: "terminal" }] },
  }),
  f("seed-awesome", "pixel", {
    title: "AwesomeWM lua all the way down",
    desktop: { kind: "wm", label: "Awesome", slug: "awesome" },
    displayServer: "x11",
    distro: { label: "Ubuntu", slug: "ubuntu" },
    colorscheme: { label: "Nord", slug: "nord" },
    utils: {
      items: [{ label: "WezTerm", slug: "wezterm", role: "terminal" }],
    },
  }),
  f("seed-qtile", "nori", {
    title: "Qtile configured in Python",
    desktop: { kind: "wm", label: "Qtile", slug: "qtile" },
    displayServer: "x11",
    distro: { label: "Fedora", slug: "fedora" },
    colorscheme: { label: "Kanagawa", slug: "kanagawa" },
    utils: { items: [{ label: "kitty", slug: "kitty", role: "terminal" }] },
  }),
  f("seed-yabai", "yabaicat", {
    title: "yabai tiling on macOS",
    desktop: { kind: "wm", label: "yabai", slug: "yabai" },
    displayServer: "quartz",
    distro: { label: "macOS", slug: "macos" },
    colorscheme: { label: "Catppuccin", slug: "catppuccin" },
    utils: {
      items: [
        { label: "Ghostty", slug: "ghostty", role: "terminal" },
        { label: "Neovim", slug: "neovim", role: "editor" },
      ],
    },
  }),
  f("seed-aerospace", "yabaicat", {
    title: "AeroSpace instead of yabai this month",
    desktop: { kind: "wm", label: "AeroSpace", slug: "aerospace" },
    displayServer: "quartz",
    distro: { label: "macOS", slug: "macos" },
    colorscheme: { label: "Rosé Pine", slug: "rose-pine" },
    utils: { items: [{ label: "WezTerm", slug: "wezterm", role: "terminal" }] },
  }),
  f("seed-gnome", "gnomeling", {
    title: "GNOME is a DE, not a window manager",
    desktop: { kind: "de", label: "GNOME", slug: "gnome" },
    de: { label: "GNOME", slug: "gnome" },
    wm: { label: "Mutter", slug: "mutter" },
    displayServer: "wayland",
    distro: { label: "Fedora", slug: "fedora" },
    colorscheme: { label: "Adwaita", slug: "adwaita" },
    utils: {
      items: [
        { label: "Nautilus", slug: "nautilus", role: "filemanager" },
        { label: "Firefox", slug: "firefox", role: "browser" },
      ],
    },
  }),
  f("seed-plasma", "plasmafox", {
    title: "KDE Plasma with KWin named on purpose",
    desktop: { kind: "de", label: "KDE Plasma", slug: "kde-plasma" },
    de: { label: "KDE Plasma", slug: "kde-plasma" },
    wm: { label: "KWin", slug: "kwin" },
    displayServer: "wayland",
    distro: { label: "openSUSE", slug: "opensuse" },
    colorscheme: { label: "Breeze", slug: "breeze" },
    utils: {
      items: [
        { label: "Konsole", slug: "konsole", role: "terminal" },
        { label: "Dolphin", slug: "dolphin", role: "filemanager" },
      ],
    },
  }),
  f("seed-xfce", "gnomeling", {
    title: "XFCE still pays the X11 tax",
    desktop: { kind: "de", label: "XFCE", slug: "xfce" },
    de: { label: "XFCE", slug: "xfce" },
    displayServer: "x11",
    distro: { label: "Debian", slug: "debian" },
    colorscheme: { label: "Gruvbox", slug: "gruvbox" },
    utils: {
      items: [
        { label: "Thunar", slug: "thunar", role: "filemanager" },
        { label: "kitty", slug: "kitty", role: "terminal" },
      ],
    },
  }),
  f("seed-cinnamon", "plasmafox", {
    title: "Cinnamon on Ubuntu, stacking and proud",
    desktop: { kind: "de", label: "Cinnamon", slug: "cinnamon" },
    de: { label: "Cinnamon", slug: "cinnamon" },
    displayServer: "x11",
    distro: { label: "Ubuntu", slug: "ubuntu" },
    colorscheme: { label: "Mint-Y", slug: "mint-y" },
    utils: { items: [{ label: "Firefox", slug: "firefox", role: "browser" }] },
  }),
  f("seed-cosmic", "pixel", {
    title: "COSMIC DE, still not a compositor-as-session",
    desktop: { kind: "de", label: "COSMIC", slug: "cosmic" },
    de: { label: "COSMIC", slug: "cosmic" },
    displayServer: "wayland",
    distro: { label: "Fedora", slug: "fedora" },
    colorscheme: { label: "COSMIC", slug: "cosmic" },
    utils: { items: [{ label: "cosmic-term", slug: "cosmic-term", role: "terminal" }] },
  }),
  f("seed-hypr-nix", "moth", {
    title: "Hyprland declared in Nix",
    desktop: { kind: "compositor", label: "Hyprland", slug: "hyprland" },
    displayServer: "wayland",
    distro: { label: "NixOS", slug: "nixos" },
    colorscheme: { label: "pywal", slug: "pywal" },
    utils: {
      items: [
        { label: "kitty", slug: "kitty", role: "terminal" },
        { label: "Waybar", slug: "waybar", role: "bar" },
        { label: "Mako", slug: "mako", role: "notifier" },
      ],
    },
  }),
  f("seed-herbst", "voider", {
    title: "herbstluftwm manual tiling",
    desktop: { kind: "wm", label: "herbstluftwm", slug: "herbstluftwm" },
    displayServer: "x11",
    distro: { label: "Arch Linux", slug: "arch-linux" },
    colorscheme: { label: "Gruvbox", slug: "gruvbox" },
    utils: { items: [{ label: "Polybar", slug: "polybar", role: "bar" }] },
  }),
  f("seed-wayfire", "nori", {
    title: "Wayfire wobbly windows, compositor session",
    desktop: { kind: "compositor", label: "Wayfire", slug: "wayfire" },
    displayServer: "wayland",
    distro: { label: "Alpine", slug: "alpine" },
    colorscheme: { label: "Tokyo Night", slug: "tokyo-night" },
    utils: { items: [{ label: "foot", slug: "foot", role: "terminal" }] },
  }),
  f("seed-openbox", "gnomeling", {
    title: "Openbox stacking WM, not a DE",
    desktop: { kind: "wm", label: "Openbox", slug: "openbox" },
    displayServer: "x11",
    distro: { label: "Void Linux", slug: "void-linux" },
    colorscheme: { label: "Nord", slug: "nord" },
    utils: { items: [{ label: "Tint2", slug: "tint2", role: "bar" }] },
  }),
];

async function seed() {
  const db = getDb();
  await db.delete(fetchChangelog);
  await db.delete(fetchUtils);
  await db.delete(fetches);
  await db.delete(tools);
  await db.delete(user);

  const toolRows = [
    ...catalogForKind("wm").map((e) => ({
      slug: e.slug,
      label: e.label,
      category: "desktop_wm",
      role: null as string | null,
    })),
    ...DESKTOP_DE.map((e) => ({
      slug: e.slug,
      label: e.label,
      category: "desktop_de",
      role: null,
    })),
    ...DESKTOP_COMPOSITOR.map((e) => ({
      slug: e.slug,
      label: e.label,
      category: "desktop_compositor",
      role: null,
    })),
    ...DISTROS.map((e) => ({
      slug: e.slug,
      label: e.label,
      category: "distro",
      role: null,
    })),
    ...COLORSCHEMES.map((e) => ({
      slug: e.slug,
      label: e.label,
      category: "colorscheme",
      role: null,
    })),
    ...UTILS.map((e) => ({
      slug: e.slug,
      label: e.label,
      category: "util",
      role: e.role,
    })),
  ];
  const seen = new Set<string>();
  const uniqueTools = toolRows.filter((t) => {
    if (seen.has(t.slug)) {
      return false;
    }
    seen.add(t.slug);
    return true;
  });
  await db.insert(tools).values(uniqueTools.map((t) => ({ ...t, usageCount: 0 })));

  const handles = [...new Set(SEED.map((s) => s.handle))];
  const now = new Date();
  const users = handles.map((handle) => ({
    id: `user-${handle}`,
    handle,
    name: handle,
    email: `${handle}@seed.sharefetch.local`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  }));
  await db.insert(user).values(users);

  for (const row of SEED) {
    await upsertFetch({
      id: row.id,
      ownerId: `user-${row.handle}`,
      spec: row.spec,
      previous: null,
    });
  }
  console.log(`seeded ${SEED.length} fetches`);
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
