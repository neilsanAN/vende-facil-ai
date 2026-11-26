import { createHmac, timingSafeEqual } from "node:crypto";
import { getContainer } from "@vendefacil/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Callback de exclusão de dados da Meta.
 * A Meta envia POST com signed_request; respondemos com confirmation_code + url de status.
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
function parseSignedRequest(signedRequest: string, appSecret: string): { user_id?: string } | null {
  const [encodedSig, payload] = signedRequest.split(".", 2);
  if (!encodedSig || !payload) return null;
  const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const expected = createHmac("sha256", appSecret).update(payload).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return JSON.parse(json) as { user_id?: string };
}

export async function POST(req: Request) {
  const container = getContainer();
  const secret = process.env.FACEBOOK_APP_SECRET || "";
  const appUrl = container.config.APP_URL.replace(/\/$/, "");
  const form = await req.formData().catch(() => null);
  const signed = String(form?.get("signed_request") || "");
  const confirmation = `vf-del-${Date.now().toString(36)}`;

  if (signed && secret) {
    try {
      const data = parseSignedRequest(signed, secret);
      if (data?.user_id) {
        // Remove conexões sociais ligadas a esse Facebook user id, se existirem.
        await container.db.socialConnection.deleteMany({
          where: { externalAccountId: data.user_id },
        }).catch(() => undefined);
      }
    } catch {
      // Mesmo com falha de parse, devolvemos confirmação para a Meta.
    }
  }

  return Response.json({
    url: `${appUrl}/data-deletion`,
    confirmation_code: confirmation,
  });
}

export async function GET() {
  // A Meta às vezes faz GET só para validar se a URL existe.
  return Response.json({ ok: true, message: "Facebook data deletion callback is ready." });
}
