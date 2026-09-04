import { getPublicFetch } from "@/db/queries";
import { parseEmbedQuery } from "@/lib/embed-query";
import { renderFetchSvg } from "@/lib/svg";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = rawId.replace(/\.svg$/i, "");
  const row = await getPublicFetch(id);
  if (!row) {
    return new Response("Not found", { status: 404 });
  }
  const query = parseEmbedQuery(new URL(request.url).searchParams);
  const svg = renderFetchSvg(row.spec, query, {
    lastVerifiedAt: row.lastVerifiedAt,
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
