import { getContainer } from "@vendefacil/business";
import { errorResponse } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    const length = Number(req.headers.get("content-length") || 0);
    const max = Number(process.env.MAX_VIDEO_BYTES || 100 * 1024 * 1024);
    if (length > max) return Response.json({ error: { code: "FILE_TOO_LARGE", message: "Arquivo grande demais." } }, { status: 413 });
    const body = Buffer.from(await req.arrayBuffer());
    const result = await getContainer().media.writeDirect(token, body);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
