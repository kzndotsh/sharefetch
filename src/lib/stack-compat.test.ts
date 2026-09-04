import { describe, expect, it } from "vitest";
import { chooseDesktop, chooseDesktopKind, toggleUtil } from "./builder";
import { DESKTOP_COMPOSITOR, DESKTOP_DE } from "./catalogs";
import { emptyFetchSpec } from "./fetch-spec";
import {
  isDisplayServerCompatible,
  isUtilCompatible,
  reconcileDesktopStack,
} from "./stack-compat";

describe("reconcileDesktopStack", () => {
  it("drops picom under compositor kind", () => {
    const base = chooseDesktop(
      chooseDesktopKind(emptyFetchSpec(), "compositor"),
      DESKTOP_COMPOSITOR[0],
    );
    const withPicom = {
      ...base,
      utils: {
        items: [{ label: "picom", slug: "picom", role: "compositor" as const }],
      },
    };
    const { spec, notes } = reconcileDesktopStack(withPicom);
    expect(spec.utils.items).toEqual([]);
    expect(notes.some((n) => n.section === "utils" && n.text.includes("picom"))).toBe(
      true,
    );
  });

  it("clears standalone compositor field when kind is compositor", () => {
    const base = chooseDesktop(
      chooseDesktopKind(emptyFetchSpec(), "compositor"),
      DESKTOP_COMPOSITOR[2],
    );
    const { spec, notes } = reconcileDesktopStack({
      ...base,
      compositor: { label: "picom", slug: "picom" },
    });
    expect(spec.compositor).toBeUndefined();
    expect(
      notes.some((n) => n.section === "desktop" && n.text.includes("standalone compositor")),
    ).toBe(true);
  });

  it("clamps quartz off a DE and notes it", () => {
    const gnome = chooseDesktop(chooseDesktopKind(emptyFetchSpec(), "de"), DESKTOP_DE[0]);
    const { spec, notes } = reconcileDesktopStack({
      ...gnome,
      displayServer: "quartz",
    });
    expect(spec.displayServer).not.toBe("quartz");
    expect(
      notes.some(
        (n) => n.section === "displayServer" && n.text.toLowerCase().includes("quartz"),
      ),
    ).toBe(true);
  });

  it("clamps wayland to quartz on macOS", () => {
    const { spec, notes } = reconcileDesktopStack({
      ...emptyFetchSpec(),
      distro: { label: "macOS", slug: "macos" },
      displayServer: "wayland",
    });
    expect(spec.displayServer).toBe("quartz");
    expect(
      notes.some((n) => n.section === "displayServer" && n.text.includes("macOS")),
    ).toBe(true);
  });
});

describe("compatibility helpers", () => {
  it("marks picom incompatible under compositor", () => {
    const spec = chooseDesktopKind(emptyFetchSpec(), "compositor");
    expect(isUtilCompatible(spec, "picom")).toBe(false);
    expect(isUtilCompatible(spec, "kitty")).toBe(true);
    expect(toggleUtil(spec, { label: "picom", slug: "picom", role: "compositor" }).utils.items).toEqual(
      [],
    );
  });

  it("allows quartz only for wm or macos", () => {
    const de = chooseDesktopKind(emptyFetchSpec(), "de");
    expect(isDisplayServerCompatible(de, "quartz")).toBe(false);
    const wm = chooseDesktopKind(emptyFetchSpec(), "wm");
    expect(isDisplayServerCompatible(wm, "quartz")).toBe(true);
    expect(
      isDisplayServerCompatible(
        { ...emptyFetchSpec(), distro: { label: "macOS", slug: "macos" } },
        "quartz",
      ),
    ).toBe(true);
  });
});
