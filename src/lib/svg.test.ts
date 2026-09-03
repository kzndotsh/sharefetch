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
  });
});
