import { getContainer } from "@vendefacil/business";
import { readCookie } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const container = getContainer();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || readCookie(req, "vf_access");
  const session = await container.auth.fromAccess(token);
  const asset = await container.media.readable(
    id,
    session?.organizationId ? { organizationId: session.organizationId } : null,
    { exp: url.searchParams.get("exp") || undefined, sig: url.searchParams.get("sig") || undefined },
  );
  if (!asset) return Response.json({ error: { code: "NOT_FOUND", message: "Arquivo não encontrado." } }, { status: 404 });
  const isPublic = asset.visibility === "PUBLIC" && asset.publicObjectKey;
  const bucket = isPublic ? "public" : "private";
  const key = isPublic ? asset.publicObjectKey || asset.objectKey : asset.objectKey;
  if (container.storage.driver === "r2") {
    if (isPublic) {
      const stable = container.storage.publicUrl(key);
      if (stable) return Response.redirect(stable);
    }
    return Response.redirect(await container.storage.getSignedDownloadUrl(bucket, key, 300));
  }
  const opened = await container.storage.openLocalStream(bucket, key);
  if (!opened) return Response.json({ error: { code: "NOT_FOUND", message: "Arquivo não encontrado." } }, { status: 404 });
  return new Response(opened.stream, {
    headers: {
      "content-type": asset.mimeType,
      "content-length": String(opened.size),
      "cache-control": isPublic ? "public, max-age=3600" : "private, max-age=120",
    },
  });
}
