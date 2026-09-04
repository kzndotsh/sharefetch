import { describe, expect, it } from "vitest";
import { mapAwesomeDotfiles } from "./awesome-dotfiles";
import { parseFetchPaste } from "./paste";
import { hydrateFetchSpec, parseFetchSpec } from "./fetch-spec";
import { canonicalSlug } from "./slug";
import { deriveTraits } from "./traits";

describe("slug synonyms", () => {
  it("maps common aliases", () => {
    expect(canonicalSlug("Hyprland")).toBe("hyprland");
    expect(canonicalSlug("arch")).toBe("arch-linux");
    expect(canonicalSlug("KDE Plasma")).toBe("kde-plasma");
  });
});

describe("legacy layers hydrate", () => {
  it("flattens bucket objects from older stored specs", () => {
    const spec = hydrateFetchSpec({
      ...parseFetchSpec({
        specVersion: 1,
        title: "old",
        displayName: "ada",
        handle: "ada",
        visibility: "public",
        desktop: { kind: "wm", label: "i3", slug: "i3" },
        utils: { items: [] },
        layers: [],
        sectionOrder: [],
        tags: [],
      }),
      layers: {
        system: [{ key: "kernel", label: "Kernel", value: "6.12" }],
        hardware: [{ key: "cpu", label: "CPU", value: "Ryzen" }],
      },
    });
    expect(Array.isArray(spec.layers)).toBe(true);
    expect(spec.layers.map((l) => l.key)).toEqual(["kernel", "cpu"]);
  });
});

describe("desktop mapping fixtures", () => {
  it("keeps GNOME as DE, Hyprland as compositor, i3 as WM", () => {
    const gnome = parseFetchSpec({
      specVersion: 1,
      title: "GNOME daily",
      displayName: "ada",
      handle: "ada",
      visibility: "public",
      desktop: { kind: "de", label: "GNOME", slug: "gnome" },
      utils: { items: [] },
      layers: [],
      sectionOrder: [],
      tags: [],
    });
    const hypr = parseFetchSpec({
      specVersion: 1,
      title: "Hyprland rice",
      displayName: "ada",
      handle: "ada",
      visibility: "public",
      desktop: { kind: "compositor", label: "Hyprland", slug: "hyprland" },
      displayServer: "wayland",
      utils: { items: [] },
      layers: [],
      sectionOrder: [],
      tags: [],
    });
    const i3 = parseFetchSpec({
      specVersion: 1,
      title: "i3 + picom",
      displayName: "ada",
      handle: "ada",
      visibility: "public",
      desktop: { kind: "wm", label: "i3", slug: "i3" },
      compositor: { label: "picom", slug: "picom" },
      displayServer: "x11",
      utils: { items: [] },
      layers: [],
      sectionOrder: [],
      tags: [],
    });
    expect(gnome.desktop.kind).toBe("de");
    expect(hypr.desktop.kind).toBe("compositor");
    expect(i3.desktop.kind).toBe("wm");
  });
});

describe("paste DE/WM disambiguation", () => {
  it("prefers DE as desktop when both lines exist", () => {
    const spec = parseFetchPaste(
      `
OS: Fedora 40
DE: GNOME
WM: Mutter
Terminal: kitty
Shell: zsh
      `.trim(),
      "ada",
    );
    expect(spec.desktop.kind).toBe("de");
    expect(spec.desktop.slug).toBe("gnome");
    expect(spec.wm?.slug).toBe("mutter");
  });

  it("classifies Hyprland from a WM line as compositor", () => {
    const spec = parseFetchPaste(
      `
OS: Arch Linux
WM: Hyprland
Terminal: kitty
      `.trim(),
      "ada",
    );
    expect(spec.desktop.kind).toBe("compositor");
    expect(spec.desktop.slug).toBe("hyprland");
    expect(spec.displayServer).toBe("wayland");
  });
});

describe("awesome-dotfiles mapper", () => {
  it("maps GNOME wm string to desktop.kind de", () => {
    const spec = mapAwesomeDotfiles(
      {
        title: "Clean GNOME",
        wm: "GNOME",
        distro: "Fedora",
        colorscheme: "adwaita",
        github_url: "https://github.com/example/dotfiles",
      },
      "ada",
    );
    expect(spec.desktop.kind).toBe("de");
    expect(spec.desktop.slug).toBe("gnome");
  });

  it("maps hyprland to compositor", () => {
    const spec = mapAwesomeDotfiles({ wm: "Hyprland" }, "ada");
    expect(spec.desktop.kind).toBe("compositor");
  });
});

describe("derived traits", () => {
  it("marks pywal as dynamic-colors", () => {
    const traits = deriveTraits(
      parseFetchSpec({
        specVersion: 1,
        title: "wal",
        displayName: "ada",
        handle: "ada",
        visibility: "public",
        desktop: { kind: "wm", label: "i3", slug: "i3" },
        displayServer: "x11",
        colorscheme: { label: "pywal", slug: "pywal" },
        utils: { items: [] },
        layers: [],
        sectionOrder: [],
        tags: [],
      }),
    );
    expect(traits.map((t) => t.slug)).toContain("dynamic-colors");
    expect(traits.map((t) => t.slug)).toContain("x11");
    expect(traits.map((t) => t.slug)).toContain("tiling");
  });
});
