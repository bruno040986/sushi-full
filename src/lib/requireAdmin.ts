import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * Guarda de autorização para as rotas /api/admin/*.
 *
 * O middleware já bloqueia essas rotas, mas isso NÃO dispensa a checagem aqui:
 * o matcher pode ser editado errado e o middleware não roda em toda invocação.
 * Defesa em profundidade — foi a falta disso que deixou 4 telas do projeto
 * anterior acessíveis sem sessão.
 *
 * Uso:
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  return null;
}
