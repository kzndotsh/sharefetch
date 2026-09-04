import { describe, expect, it } from "vitest";
import { parseEmbedQuery } from "./embed-query";
import { emptyFetchSpec } from "./fetch-spec";
import { escapeXml, renderFetchSvg } from "./svg";

describe("svg escape", () => {
  it("escapes XML metacharacters", () => {
    expect(escapeXml(`<script>"x"&'`)).toBe(
      "&lt;script&gt;&quot;x&quot;&amp;&apos;",
    );
  });

  it("never emits raw user title as XML", () => {
    const spec = emptyFetchSpec();
    spec.title = "foo</title><script>alert(1)</script>";
    spec.displayName = "x";
    spec.handle = "x";
    spec.desktop = { kind: "de", label: "GNOME", slug: "gnome" };
    const svg = renderFetchSvg(
      spec,
      parseEmbedQuery(new URLSearchParams("theme=dark")),
      { lastVerifiedAt: "2026-09-02" },
    );
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("DE");
    expect(svg).not.toMatch(/>GNOME<\/text>[\s\S]*WM/);
    expect(svg).toContain("verified 2026-09-02");
  });

  it("omits the desktop row until a kind or name exists", () => {
    const svg = renderFetchSvg(emptyFetchSpec(), parseEmbedQuery(new URLSearchParams()), {
      lastVerifiedAt: null,
    });
    expect(svg).not.toContain("compositor");
    expect(svg).not.toContain(">desktop<");
  });

  it("shows display name beside handle when they differ", () => {
    const spec = emptyFetchSpec();
    spec.handle = "moth";
    spec.displayName = "Moth";
    spec.title = "dock";
    const svg = renderFetchSvg(spec, parseEmbedQuery(new URLSearchParams()), {
      lastVerifiedAt: null,
    });
    expect(svg).toContain("Moth · @moth");
    expect(svg).toContain("unverified");
    expect(svg).not.toContain("verified unverified");
  });

  it("keeps @handle alone when display name matches", () => {
    const spec = emptyFetchSpec();
    spec.handle = "moth";
    spec.displayName = "moth";
    spec.title = "dock";
    const svg = renderFetchSvg(spec, parseEmbedQuery(new URLSearchParams()), {
      lastVerifiedAt: null,
    });
    expect(svg).toContain("@moth");
    expect(svg).not.toContain("· @moth");
  });

  it("renders filled extra-detail rows on the card", () => {
    const spec = emptyFetchSpec();
    spec.title = "dock";
    spec.handle = "moth";
    spec.displayName = "moth";
    spec.layers = [
      { key: "kernel", label: "Kernel", value: "6.12-zen" },
    ];
    const svg = renderFetchSvg(spec, parseEmbedQuery(new URLSearchParams()), {
      lastVerifiedAt: null,
    });
    expect(svg).toContain(">kernel<");
    expect(svg).toContain(">6.12-zen<");
    expect(svg).toMatch(/height="\d+"/);
    const height = Number(/height="(\d+)"/.exec(svg)?.[1] ?? 0);
    expect(height).toBeGreaterThanOrEqual(200);
  });

  it("skips blank extra-detail rows", () => {
    const spec = emptyFetchSpec();
    spec.title = "dock";
    spec.layers = [{ key: "", label: "", value: "" }];
    const svg = renderFetchSvg(spec, parseEmbedQuery(new URLSearchParams()), {
      lastVerifiedAt: null,
    });
    expect(svg).not.toContain(">hardware<");
  });
});
