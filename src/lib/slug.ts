const SYNONYMS: Record<string, string> = {
  hypr: "hyprland",
  hyprland: "hyprland",
  sway: "sway",
  niri: "niri",
  river: "river",
  wayfire: "wayfire",
  i3: "i3",
  "i3-gaps": "i3",
  i3gaps: "i3",
  bspwm: "bspwm",
  dwm: "dwm",
  awesome: "awesome",
  awesomewm: "awesome",
  xmonad: "xmonad",
  qtile: "qtile",
  herbstluftwm: "herbstluftwm",
  openbox: "openbox",
  yabai: "yabai",
  aerospace: "aerospace",
  amethyst: "amethyst",
  gnome: "gnome",
  "gnome-shell": "gnome",
  kde: "kde-plasma",
  plasma: "kde-plasma",
  "kde plasma": "kde-plasma",
  "kde-plasma": "kde-plasma",
  xfce: "xfce",
  xfce4: "xfce",
  cinnamon: "cinnamon",
  mate: "mate",
  lxqt: "lxqt",
  budgie: "budgie",
  cosmic: "cosmic",
  kwin: "kwin",
  mutter: "mutter",
  xfwm: "xfwm",
  picom: "picom",
  compton: "picom",
  arch: "arch-linux",
  "arch linux": "arch-linux",
  "archlinux": "arch-linux",
  "arch-linux": "arch-linux",
  nixos: "nixos",
  nix: "nixos",
  macos: "macos",
  "mac os": "macos",
  darwin: "macos",
  osx: "macos",
  void: "void-linux",
  "void linux": "void-linux",
  "void-linux": "void-linux",
  fedora: "fedora",
  debian: "debian",
  ubuntu: "ubuntu",
  gentoo: "gentoo",
  alpine: "alpine",
  opensuse: "opensuse",
  "open suse": "opensuse",
  catppuccin: "catppuccin",
  gruvbox: "gruvbox",
  nord: "nord",
  "tokyo night": "tokyo-night",
  tokyonight: "tokyo-night",
  "tokyo-night": "tokyo-night",
  pywal: "pywal",
  wal: "pywal",
  everforest: "everforest",
  dracula: "dracula",
  rose: "rose-pine",
  "rose pine": "rose-pine",
  "rose-pine": "rose-pine",
  kanagawa: "kanagawa",
  onedark: "onedark",
  "one dark": "onedark",
  kitty: "kitty",
  wezterm: "wezterm",
  alacritty: "alacritty",
  foot: "foot",
  ghostty: "ghostty",
  waybar: "waybar",
  polybar: "polybar",
  eww: "eww",
  rofi: "rofi",
  wofi: "wofi",
  fuzzel: "fuzzel",
  dunst: "dunst",
  mako: "mako",
  neovim: "neovim",
  nvim: "neovim",
  vim: "vim",
  zsh: "zsh",
  fish: "fish",
  bash: "bash",
  nushell: "nushell",
  starship: "starship",
  tmux: "tmux",
  firefox: "firefox",
  zen: "zen-browser",
  "zen-browser": "zen-browser",
  thunar: "thunar",
  dolphin: "dolphin",
  nautilus: "nautilus",
  yazi: "yazi",
};

export function slugify(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "-");
  const collapsed = trimmed.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
  return collapsed.replace(/^-|-$/g, "");
}

export function canonicalSlug(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (SYNONYMS[key]) {
    return SYNONYMS[key];
  }
  const dashed = slugify(raw);
  if (SYNONYMS[dashed]) {
    return SYNONYMS[dashed];
  }
  const spaced = key.replace(/-/g, " ");
  if (SYNONYMS[spaced]) {
    return SYNONYMS[spaced];
  }
  return dashed;
}

export function labeledFrom(raw: string): { label: string; slug: string } {
  const slug = canonicalSlug(raw);
  const label = raw.trim() || slug;
  return { label, slug };
}
