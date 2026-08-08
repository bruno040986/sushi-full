import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protege o painel e TODAS as rotas de mutação.
 *
 * (No Next 16 este arquivo se chama `proxy.ts`; `middleware.ts` foi depreciado.)
 *
 * Roda no Edge porque a sessão é JWT — Credentials sem adapter de banco.
 * Exige NEXTAUTH_SECRET definido.
 *
 * Página sem sessão → redireciona para o login.
 * Rota de API sem sessão → 401 em JSON. Redirecionar uma API faria o `fetch`
 * do cliente seguir para o HTML da tela de login e falhar ao dar `.json()`.
 */
/** A tela de login precisa abrir deslogada, senão é loop de redirect. */
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Ter token não basta — o papel precisa ser ADMIN.
  if (token?.role === "ADMIN") return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Todo o painel — a exceção do login é tratada acima, no código, porque
    // negative lookahead no matcher do Next não é confiável.
    "/admin/:path*",
    // Toda mutação vive sob /api/admin/* — assim é impossível esquecer de
    // proteger uma rota nova.
    "/api/admin/:path*",
  ],
};
