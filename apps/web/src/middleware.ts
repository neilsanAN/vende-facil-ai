import { NextResponse, type NextRequest } from "next/server";

const PROTECTED =
  /^\/(inicio|produtos|estudio|mais|anuncios|loja|publicar|pedidos|estatisticas|configuracoes|equipe|assinatura|contatos|criar|onboarding|verificar-email)(\/|$)/;

export async function middleware(req: NextRequest) {
  if (!PROTECTED.test(req.nextUrl.pathname)) return NextResponse.next();

  const access = req.cookies.get("vf_access")?.value;
  if (access) return NextResponse.next();

  const refresh = req.cookies.get("vf_refresh")?.value;
  if (!refresh) return NextResponse.next();

  try {
    const refreshRes = await fetch(new URL("/api/auth/refresh", req.nextUrl.origin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `vf_refresh=${refresh}`,
      },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!refreshRes.ok) return NextResponse.next();

    const res = NextResponse.next();
    const setCookies = refreshRes.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) res.headers.append("set-cookie", cookie);
    // Fallback se getSetCookie não existir
    if (setCookies.length === 0) {
      const single = refreshRes.headers.get("set-cookie");
      if (single) res.headers.append("set-cookie", single);
    }
    return res;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|v/).*)"],
};
