import { describe, expect, it } from "vitest";
import { mapAwesomeDotfiles } from "./awesome-dotfiles";
import {
  DESKTOP_COMPOSITOR,
  DESKTOP_DE,
  DESKTOP_WM,
  resolveDesktopLayout,
} from "./catalogs";
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

describe("desktop catalog layout", () => {
  it("annotates every desktop entry with a layout", () => {
    for (const entry of [...DESKTOP_WM, ...DESKTOP_DE, ...DESKTOP_COMPOSITOR]) {
      expect(entry.layout, entry.slug).toBeTruthy();
    }
  });

  it("resolves niri as scrollable and prefers wm over de", () => {
    expect(resolveDesktopLayout({ desktopSlug: "niri" })).toBe("scrollable");
    expect(
      resolveDesktopLayout({ desktopSlug: "kde-plasma", wmSlug: "i3" }),
    ).toBe("tiling");
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
  it("marks pywal as dynamic-colors with kind, display, and layout", () => {
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
    const ids = traits.map((t) => t.id);
    expect(ids).toContain("wm");
    expect(ids).toContain("dynamic-colors");
    expect(ids).toContain("x11");
    expect(ids).toContain("tiling");
    expect(traits.find((t) => t.id === "tiling")?.label).toBe("Tiling");
    expect(traits.find((t) => t.id === "tiling")?.href).toContain("layout=tiling");
  });

  it("classifies Awesome as dynamic and Niri as scrollable", () => {
    const awesome = deriveTraits(
      parseFetchSpec({
        specVersion: 1,
        title: "aw",
        displayName: "ada",
        handle: "ada",
        visibility: "public",
        desktop: { kind: "wm", label: "Awesome", slug: "awesome" },
        displayServer: "x11",
        utils: { items: [] },
        layers: [],
        sectionOrder: [],
        tags: [],
      }),
    );
    expect(awesome.map((t) => t.id)).toContain("dynamic");
    expect(awesome.find((t) => t.id === "dynamic")?.label).toBe("Dynamic");

    const niri = deriveTraits(
      parseFetchSpec({
        specVersion: 1,
        title: "niri",
        displayName: "ada",
        handle: "ada",
        visibility: "public",
        desktop: { kind: "compositor", label: "Niri", slug: "niri" },
        displayServer: "wayland",
        utils: { items: [] },
        layers: [],
        sectionOrder: [],
        tags: [],
      }),
    );
    expect(niri.map((t) => t.id)).toContain("scrollable");
    expect(niri.find((t) => t.id === "stacking")).toBeUndefined();
  });

  it("uses replaced WM layout for a DE stack", () => {
    const traits = deriveTraits(
      parseFetchSpec({
        specVersion: 1,
        title: "plasma+i3",
        displayName: "ada",
        handle: "ada",
        visibility: "public",
        desktop: { kind: "de", label: "KDE Plasma", slug: "kde-plasma" },
        wm: { label: "i3", slug: "i3" },
        displayServer: "x11",
        utils: { items: [] },
        layers: [],
        sectionOrder: [],
        tags: [],
      }),
    );
    expect(traits.map((t) => t.id)).toContain("tiling");
    expect(traits.map((t) => t.id)).not.toContain("stacking");
    expect(traits.find((t) => t.id === "stacking" || t.label === "Floating")).toBeUndefined();
  });

  it("labels stacking desktops as Floating", () => {
    const traits = deriveTraits(
      parseFetchSpec({
        specVersion: 1,
        title: "wayfire",
        displayName: "ada",
        handle: "ada",
        visibility: "public",
        desktop: { kind: "compositor", label: "Wayfire", slug: "wayfire" },
        displayServer: "wayland",
        utils: { items: [] },
        layers: [],
        sectionOrder: [],
        tags: [],
      }),
    );
    expect(traits.find((t) => t.id === "stacking")?.label).toBe("Floating");
  });
});
