import { describe, expect, it } from "vitest";
import {
  chooseDesktop,
  chooseDesktopKind,
  clearSection,
  DRAFT_KEY,
  forkSpec,
  moveSection,
  normalizeSectionOrder,
  prepareForPublish,
  publishIssues,
  readDraft,
  SECTION_KEYS,
  sectionHasClearable,
  toggleUtil,
  wouldClobberSectionOrder,
  writeDraft,
} from "./builder";
import { DESKTOP_COMPOSITOR, DESKTOP_DE } from "./catalogs";
import { DEFAULT_SECTION_ORDER, emptyFetchSpec } from "./fetch-spec";
import { exploreHref, parseExploreFilters, toggleHref } from "./explore-params";
import { freshness } from "./format";
import { embedMarkdown } from "./embed-snippet";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("section order", () => {
  it("normalizes unknown and missing keys", () => {
    expect(normalizeSectionOrder(["utils", "bogus", "title"])).toEqual([
      "utils",
      "title",
      ...SECTION_KEYS.filter((k) => k !== "utils" && k !== "title"),
    ]);
  });

  it("moves a section and clamps at the edges", () => {
    const moved = moveSection([...DEFAULT_SECTION_ORDER], "desktop", -1);
    expect(moved.slice(0, 2)).toEqual(["desktop", "title"]);
    expect(moveSection(moved, "desktop", -1)).toEqual(moved);
  });

  it("flags clobber only when the user customized order", () => {
    const custom = moveSection([...DEFAULT_SECTION_ORDER], "utils", -1);
    expect(wouldClobberSectionOrder([...DEFAULT_SECTION_ORDER], custom)).toBe(false);
    expect(wouldClobberSectionOrder(custom, [...DEFAULT_SECTION_ORDER])).toBe(true);
    expect(wouldClobberSectionOrder(custom, custom)).toBe(false);
  });
});

describe("clear section", () => {
  it("clears desktop and reports clearable state", () => {
    let spec = emptyFetchSpec();
    expect(sectionHasClearable(spec, "desktop")).toBe(false);
    spec = chooseDesktopKind(spec, "compositor");
    spec = chooseDesktop(spec, DESKTOP_COMPOSITOR[0]);
    expect(sectionHasClearable(spec, "desktop")).toBe(true);
    spec = clearSection(spec, "desktop");
    expect(spec.desktop.kind).toBeUndefined();
    expect(spec.desktop.slug).toBe("");
    expect(sectionHasClearable(spec, "desktop")).toBe(false);
  });

  it("clears utils and layers", () => {
    let spec = emptyFetchSpec();
    spec = toggleUtil(spec, { label: "kitty", slug: "kitty", role: "terminal" });
    spec = { ...spec, layers: [{ key: "kernel", label: "Kernel", value: "6.12" }] };
    expect(sectionHasClearable(spec, "utils")).toBe(true);
    expect(sectionHasClearable(spec, "layers")).toBe(true);
    spec = clearSection(spec, "utils");
    spec = clearSection(spec, "layers");
    expect(spec.utils.items).toEqual([]);
    expect(spec.layers).toEqual([]);
  });
});

describe("desktop choice", () => {
  it("starts with no kind and does not apply a catalog pick until kind is set", () => {
    const empty = emptyFetchSpec();
    expect(empty.desktop.kind).toBeUndefined();
    expect(empty.desktop.slug).toBe("");
    expect(chooseDesktop(empty, DESKTOP_COMPOSITOR[0]).desktop.slug).toBe("");
    const kinded = chooseDesktopKind(empty, "compositor");
    expect(kinded.desktop).toEqual({ kind: "compositor", label: "", slug: "" });
  });

  it("switching kind clears the picked desktop and display server", () => {
    const spec = chooseDesktop(chooseDesktopKind(emptyFetchSpec(), "compositor"), DESKTOP_COMPOSITOR[0]);
    expect(spec.desktop.slug).toBe("hyprland");
    expect(spec.displayServer).toBe("wayland");
    const de = chooseDesktopKind(spec, "de");
    expect(de.desktop).toEqual({ kind: "de", label: "", slug: "" });
    expect(de.displayServer).toBeUndefined();
    const gnome = chooseDesktop(de, DESKTOP_DE[0]);
    expect(gnome.desktop.kind).toBe("de");
    expect(gnome.desktop.label).toBe("GNOME");
  });

  it("keeps an explicit display server when picking a desktop", () => {
    const spec = {
      ...chooseDesktopKind(emptyFetchSpec(), "compositor"),
      displayServer: "x11" as const,
    };
    expect(chooseDesktop(spec, DESKTOP_COMPOSITOR[0]).displayServer).toBe("x11");
  });
});

describe("utils and publish", () => {
  it("toggles utils by slug", () => {
    const kitty = { label: "kitty", slug: "kitty", role: "terminal" as const };
    const on = toggleUtil(emptyFetchSpec(), kitty);
    expect(on.utils.items).toEqual([kitty]);
    expect(toggleUtil(on, kitty).utils.items).toEqual([]);
  });

  it("reports missing required fields in plain language", () => {
    const issues = publishIssues(emptyFetchSpec());
    expect(issues.some((i) => i.includes("title"))).toBe(true);
    expect(issues.some((i) => i.includes("window manager") || i.includes("desktop"))).toBe(true);
    expect(issues.some((i) => i.includes("display name"))).toBe(false);
    expect(issues.every((i) => !i.includes(":"))).toBe(true);
  });

  it("defaults displayName to handle and drops empty dotfiles url", () => {
    const spec = prepareForPublish({
      ...emptyFetchSpec(),
      title: " Hypr ",
      handle: " moth ",
      dotfilesUrl: "",
    });
    expect(spec.displayName).toBe("moth");
    expect(spec.title).toBe("Hypr");
    expect(spec.dotfilesUrl).toBeUndefined();
  });

  it("forks with a prefixed title and blank ownership", () => {
    const forked = forkSpec({ ...emptyFetchSpec(), title: "Rice", handle: "nori" });
    expect(forked.title).toBe("fork of Rice");
    expect(forked.handle).toBe("");
  });
});

describe("draft storage", () => {
  it("round-trips a mid-edit draft that would fail publish validation", () => {
    const storage = memoryStorage();
    const spec = { ...emptyFetchSpec(), title: "" };
    writeDraft(storage, { id: "abc", spec });
    const draft = readDraft(storage);
    expect(draft?.id).toBe("abc");
    expect(draft?.spec.title).toBe("");
  });

  it("returns null for garbage", () => {
    const storage = memoryStorage();
    storage.setItem(DRAFT_KEY, "{not json");
    expect(readDraft(storage)).toBeNull();
    storage.setItem(DRAFT_KEY, JSON.stringify({ spec: { specVersion: 2 } }));
    expect(readDraft(storage)).toBeNull();
  });
});

describe("explore params", () => {
  it("parses and rejects unknown enum values", () => {
    const filters = parseExploreFilters({
      kind: "gnome",
      desktop: "gnome",
      sort: "random",
      displayServer: ["wayland"],
      layout: "floating",
    });
    expect(filters.kind).toBeUndefined();
    expect(filters.desktop).toBe("gnome");
    expect(filters.sort).toBe("random");
    expect(filters.displayServer).toBe("wayland");
    expect(filters.layout).toBeUndefined();
  });

  it("parses layout facet values", () => {
    expect(parseExploreFilters({ layout: "scrollable" }).layout).toBe("scrollable");
    expect(parseExploreFilters({ layout: "dynamic" }).layout).toBe("dynamic");
  });

  it("builds toggle hrefs and omits the default sort", () => {
    const filters = parseExploreFilters({ distro: "arch-linux" });
    expect(exploreHref(filters, {})).toBe("/explore?distro=arch-linux");
    const toggled = toggleHref(filters, "distro", "arch-linux");
    expect(toggled.active).toBe(true);
    expect(toggled.href).toBe("/explore");
  });

  it("defaults to popular and parses popular sort", () => {
    expect(parseExploreFilters({}).sort).toBe("popular");
    expect(parseExploreFilters({ sort: "popular" }).sort).toBe("popular");
    expect(parseExploreFilters({ sort: "latest" }).sort).toBe("latest");
    expect(exploreHref({ sort: "popular" }, {})).toBe("/explore");
    expect(exploreHref({}, { sort: "latest" })).toBe("/explore?sort=latest");
  });
});

describe("format and embed", () => {
  it("marks fetches older than the stale window", () => {
    const now = new Date("2026-09-03T00:00:00Z");
    expect(freshness("2026-09-03T00:00:00Z", now)).toEqual({
      label: "verified 2026-09-03 · today",
      stale: false,
    });
    expect(freshness("2026-01-01T00:00:00Z", now).stale).toBe(true);
  });

  it("emits a versioned markdown snippet", () => {
    expect(
      embedMarkdown("https://example.test", "abc", "dark", "2026-09-03T00:00:00Z"),
    ).toBe("![fetch](https://example.test/embed/abc.svg?theme=dark&v=1788393600)");
  });
});
