import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * O proxy já bloqueia /admin/*, mas o redirect aqui é a segunda camada: se o
 * matcher for editado errado um dia, a tela ainda não abre sem sessão.
 *
 * A tela de login tem layout próprio em /admin/login/layout.tsx e não passa
 * por aqui — senão seria um loop de redirect.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/admin/login");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminNav userName={session.user.name ?? session.user.email ?? "Administrador"} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
