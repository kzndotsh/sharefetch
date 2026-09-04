import { describe, expect, it } from "vitest";
import {
  builderShareUrl,
  claimQueryToSpec,
  hasClaimQuery,
  parseClaimQuery,
  serializeClaimQuery,
} from "./builder-query";
import { emptyFetchSpec } from "./fetch-spec";

describe("claim query", () => {
  it("round-trips claim fields", () => {
    const spec = {
      ...emptyFetchSpec(),
      title: "Cold aisle Niri",
      handle: "aisle",
      desktop: { kind: "compositor" as const, label: "Niri", slug: "niri" },
      displayServer: "wayland" as const,
      distro: { label: "Arch Linux", slug: "arch-linux" },
      utils: { items: [{ label: "kitty", slug: "kitty", role: "terminal" as const }] },
    };
    const params = serializeClaimQuery(spec);
    expect(params.get("k")).toBe("compositor");
    expect(params.get("desk")).toBe("niri");
    expect(params.get("distro")).toBe("arch-linux");
    expect(params.get("ds")).toBe("wayland");
    expect(params.get("title")).toBe("Cold aisle Niri");
    expect(params.get("handle")).toBe("aisle");
    expect(params.get("utils")).toBe("kitty");

    const restored = claimQueryToSpec(parseClaimQuery(params));
    expect(restored.desktop.kind).toBe("compositor");
    expect(restored.desktop.slug).toBe("niri");
    expect(restored.distro?.slug).toBe("arch-linux");
    expect(restored.displayServer).toBe("wayland");
    expect(restored.title).toBe("Cold aisle Niri");
    expect(restored.handle).toBe("aisle");
    expect(restored.utils.items.map((u) => u.slug)).toEqual(["kitty"]);
  });

  it("detects claim keys and ignores unknown", () => {
    expect(hasClaimQuery(new URLSearchParams("foo=1"))).toBe(false);
    expect(hasClaimQuery(new URLSearchParams("k=compositor"))).toBe(true);
    const claim = parseClaimQuery(new URLSearchParams("k=bogus&desk=niri&extra=1"));
    expect(claim.k).toBeUndefined();
    expect(claim.desk).toBe("niri");
  });

  it("builds a share URL", () => {
    const url = builderShareUrl("http://localhost:3001", {
      ...emptyFetchSpec(),
      desktop: { kind: "wm", label: "i3", slug: "i3" },
    });
    expect(url).toBe("http://localhost:3001/new?k=wm&desk=i3");
  });
});
