import type { DesktopKind, DisplayServer, UtilRole } from "./fetch-spec";

export type CatalogEntry = {
  slug: string;
  label: string;
  displayServer?: DisplayServer;
};

export type UtilCatalogEntry = CatalogEntry & {
  role: UtilRole;
};

export const DESKTOP_WM: CatalogEntry[] = [
  { slug: "i3", label: "i3", displayServer: "x11" },
  { slug: "bspwm", label: "bspwm", displayServer: "x11" },
  { slug: "dwm", label: "dwm", displayServer: "x11" },
  { slug: "awesome", label: "Awesome", displayServer: "x11" },
  { slug: "xmonad", label: "xmonad", displayServer: "x11" },
  { slug: "qtile", label: "Qtile", displayServer: "x11" },
  { slug: "herbstluftwm", label: "herbstluftwm", displayServer: "x11" },
  { slug: "openbox", label: "Openbox", displayServer: "x11" },
  { slug: "yabai", label: "yabai", displayServer: "quartz" },
  { slug: "aerospace", label: "AeroSpace", displayServer: "quartz" },
  { slug: "amethyst", label: "Amethyst", displayServer: "quartz" },
];

export const DESKTOP_DE: CatalogEntry[] = [
  { slug: "gnome", label: "GNOME", displayServer: "wayland" },
  { slug: "kde-plasma", label: "KDE Plasma", displayServer: "wayland" },
  { slug: "xfce", label: "XFCE", displayServer: "x11" },
  { slug: "cinnamon", label: "Cinnamon", displayServer: "x11" },
  { slug: "mate", label: "MATE", displayServer: "x11" },
  { slug: "lxqt", label: "LXQt", displayServer: "x11" },
  { slug: "budgie", label: "Budgie", displayServer: "x11" },
  { slug: "cosmic", label: "COSMIC", displayServer: "wayland" },
];

export const DESKTOP_COMPOSITOR: CatalogEntry[] = [
  { slug: "hyprland", label: "Hyprland", displayServer: "wayland" },
  { slug: "sway", label: "Sway", displayServer: "wayland" },
  { slug: "niri", label: "Niri", displayServer: "wayland" },
  { slug: "river", label: "River", displayServer: "wayland" },
  { slug: "wayfire", label: "Wayfire", displayServer: "wayland" },
];

export const DISTROS: CatalogEntry[] = [
  { slug: "arch-linux", label: "Arch Linux" },
  { slug: "nixos", label: "NixOS" },
  { slug: "fedora", label: "Fedora" },
  { slug: "debian", label: "Debian" },
  { slug: "ubuntu", label: "Ubuntu" },
  { slug: "void-linux", label: "Void Linux" },
  { slug: "gentoo", label: "Gentoo" },
  { slug: "alpine", label: "Alpine" },
  { slug: "opensuse", label: "openSUSE" },
  { slug: "macos", label: "macOS" },
];

export const COLORSCHEMES: CatalogEntry[] = [
  { slug: "catppuccin", label: "Catppuccin" },
  { slug: "gruvbox", label: "Gruvbox" },
  { slug: "nord", label: "Nord" },
  { slug: "tokyo-night", label: "Tokyo Night" },
  { slug: "everforest", label: "Everforest" },
  { slug: "dracula", label: "Dracula" },
  { slug: "rose-pine", label: "Rosé Pine" },
  { slug: "kanagawa", label: "Kanagawa" },
  { slug: "onedark", label: "One Dark" },
  { slug: "pywal", label: "pywal" },
];

export const UTILS: UtilCatalogEntry[] = [
  { slug: "kitty", label: "kitty", role: "terminal" },
  { slug: "wezterm", label: "WezTerm", role: "terminal" },
  { slug: "alacritty", label: "Alacritty", role: "terminal" },
  { slug: "foot", label: "foot", role: "terminal" },
  { slug: "ghostty", label: "Ghostty", role: "terminal" },
  { slug: "waybar", label: "Waybar", role: "bar" },
  { slug: "polybar", label: "Polybar", role: "bar" },
  { slug: "eww", label: "EWW", role: "bar" },
  { slug: "rofi", label: "Rofi", role: "launcher" },
  { slug: "wofi", label: "Wofi", role: "launcher" },
  { slug: "fuzzel", label: "Fuzzel", role: "launcher" },
  { slug: "zsh", label: "zsh", role: "shell" },
  { slug: "fish", label: "fish", role: "shell" },
  { slug: "bash", label: "bash", role: "shell" },
  { slug: "nushell", label: "Nushell", role: "shell" },
  { slug: "neovim", label: "Neovim", role: "editor" },
  { slug: "vim", label: "Vim", role: "editor" },
  { slug: "dunst", label: "Dunst", role: "notifier" },
  { slug: "mako", label: "Mako", role: "notifier" },
  { slug: "thunar", label: "Thunar", role: "filemanager" },
  { slug: "dolphin", label: "Dolphin", role: "filemanager" },
  { slug: "nautilus", label: "Nautilus", role: "filemanager" },
  { slug: "yazi", label: "Yazi", role: "filemanager" },
  { slug: "firefox", label: "Firefox", role: "browser" },
  { slug: "zen-browser", label: "Zen Browser", role: "browser" },
  { slug: "picom", label: "picom", role: "compositor" },
  { slug: "starship", label: "Starship", role: "other" },
  { slug: "tmux", label: "tmux", role: "other" },
];

const UNIQUE_WM = uniqueBySlug(DESKTOP_WM);
export { UNIQUE_WM as DESKTOP_WM_UNIQUE };

function uniqueBySlug(items: CatalogEntry[]): CatalogEntry[] {
  const seen = new Set<string>();
  const out: CatalogEntry[] = [];
  for (const item of items) {
    if (seen.has(item.slug)) {
      continue;
    }
    seen.add(item.slug);
    out.push(item);
  }
  return out;
}

export function catalogForKind(kind: DesktopKind): CatalogEntry[] {
  switch (kind) {
    case "wm":
      return uniqueBySlug(DESKTOP_WM);
    case "de":
      return DESKTOP_DE;
    case "compositor":
      return DESKTOP_COMPOSITOR;
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export function lookupDesktop(slug: string): {
  kind: DesktopKind;
  entry: CatalogEntry;
} | null {
  const compositor = DESKTOP_COMPOSITOR.find((e) => e.slug === slug);
  if (compositor) {
    return { kind: "compositor", entry: compositor };
  }
  const de = DESKTOP_DE.find((e) => e.slug === slug);
  if (de) {
    return { kind: "de", entry: de };
  }
  const wm = uniqueBySlug(DESKTOP_WM).find((e) => e.slug === slug);
  if (wm) {
    return { kind: "wm", entry: wm };
  }
  return null;
}

export function classifyDesktopSlug(slug: string): DesktopKind | null {
  return lookupDesktop(slug)?.kind ?? null;
}

export function defaultDisplayServer(
  kind: DesktopKind,
  slug: string,
): DisplayServer | undefined {
  const list = catalogForKind(kind);
  return list.find((e) => e.slug === slug)?.displayServer;
}

export function findUtil(slug: string): UtilCatalogEntry | undefined {
  return UTILS.find((u) => u.slug === slug);
}

export function findDistro(slug: string): CatalogEntry | undefined {
  return DISTROS.find((d) => d.slug === slug);
}

export function findColorscheme(slug: string): CatalogEntry | undefined {
  return COLORSCHEMES.find((c) => c.slug === slug);
}
