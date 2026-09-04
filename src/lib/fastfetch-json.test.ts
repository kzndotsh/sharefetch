import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  matchColorscheme,
  parseFastfetchJson,
} from "./fastfetch-json";
import { parseFetchPaste } from "./paste";

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));
}

describe("parseFastfetchJson", () => {
  it("classifies Sway as compositor with Wayland display server", () => {
    const modules = loadFixture("fastfetch-sway.json");
    const spec = parseFastfetchJson(modules, "ada");
    expect(spec.desktop.kind).toBe("compositor");
    expect(spec.desktop.slug).toBe("sway");
    expect(spec.displayServer).toBe("wayland");
    expect(spec.distro?.slug).toBe("nixos");
    expect(spec.utils.items.some((u) => u.slug === "kitty")).toBe(true);
    expect(spec.utils.items.some((u) => u.slug === "zsh")).toBe(true);
    expect(spec.colorscheme?.slug).toBe("tokyo-night");
    expect(spec.layers.system?.some((l) => l.key === "packages")).toBe(true);
    expect(spec.layers.desktop?.some((l) => l.key === "display")).toBe(true);
    expect(spec.layers.aesthetic?.some((l) => l.key === "icons")).toBe(true);
    expect(spec.source?.kind).toBe("cli");
  });

  it("classifies GNOME as DE with nested Mutter WM", () => {
    const modules = loadFixture("fastfetch-gnome.json");
    const spec = parseFastfetchJson(modules, "ada");
    expect(spec.desktop.kind).toBe("de");
    expect(spec.desktop.slug).toBe("gnome");
    expect(spec.wm?.slug).toBe("mutter");
    expect(spec.de?.slug).toBe("gnome");
    expect(spec.displayServer).toBe("wayland");
    expect(spec.distro?.slug).toBe("fedora");
    expect(spec.utils.items.some((u) => u.slug === "bash")).toBe(true);
    expect(spec.utils.items.some((u) => u.slug === "neovim")).toBe(true);
  });
});

describe("parseFetchPaste routing", () => {
  it("routes fastfetch JSON arrays through the cli mapper", () => {
    const raw = readFileSync(join(here, "fixtures", "fastfetch-sway.json"), "utf8");
    const spec = parseFetchPaste(raw, "ada");
    expect(spec.source?.kind).toBe("cli");
    expect(spec.desktop.slug).toBe("sway");
  });

  it("still parses text neofetch paste", () => {
    const spec = parseFetchPaste(
      `
OS: Arch Linux
WM: Hyprland
Terminal: kitty
Shell: zsh 5.9
Packages: 842 (pacman)
Display: 2560x1440 @ 165Hz
Icons: Papirus-Dark
Cursor: Bibata-Modern-Classic
Terminal Font: JetBrainsMono Nerd Font 12
      `.trim(),
      "ada",
    );
    expect(spec.source?.kind).toBe("paste");
    expect(spec.desktop.kind).toBe("compositor");
    expect(spec.layers.system?.some((l) => l.key === "packages")).toBe(true);
    expect(spec.layers.desktop?.some((l) => l.key === "display")).toBe(true);
    expect(spec.layers.aesthetic?.some((l) => l.key === "icons")).toBe(true);
    expect(spec.layers.aesthetic?.some((l) => l.key === "cursor")).toBe(true);
  });
});

describe("matchColorscheme", () => {
  it("matches tokyonight and catppuccin freeform strings", () => {
    expect(matchColorscheme("Tokyonight-Dark [GTK3]")?.slug).toBe("tokyo-night");
    expect(matchColorscheme("catppuccin-mocha-blue-cursors")?.slug).toBe(
      "catppuccin",
    );
  });
});
