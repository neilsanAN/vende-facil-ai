import { handleApi } from "@/server/router";

async function dispatch(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handleApi(req, path);
}

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const PUT = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
