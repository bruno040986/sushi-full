"use client";

import {
  Bike,
  Clock,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Tags,
  UsersRound,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/admin", label: "Visão geral", Icon: LayoutDashboard, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", Icon: Receipt },
  { href: "/admin/clientes", label: "Clientes", Icon: UsersRound },
  { href: "/admin/produtos", label: "Produtos", Icon: UtensilsCrossed },
  { href: "/admin/categorias", label: "Categorias", Icon: Tags },
  { href: "/admin/entrega", label: "Entrega", Icon: Bike },
  { href: "/admin/formas-pagamento", label: "Pagamento", Icon: Wallet },
  { href: "/admin/horarios", label: "Horários", Icon: Clock },
  { href: "/admin/midia", label: "Fotos", Icon: ImageIcon },
  { href: "/admin/configuracoes", label: "Configurações", Icon: Settings },
];

export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const nav = (
    <nav className="space-y-1">
      {LINKS.map(({ href, label, Icon, exact }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isActive(href, exact)
              ? "bg-brand/15 text-brand"
              : "text-muted hover:bg-surface-2 hover:text-cream"
          }`}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Barra do mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-muted hover:text-cream"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-display text-sm font-bold">Painel SushiFull</span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg p-2 text-muted hover:text-danger"
          aria-label="Sair"
        >
          <LogOut className="size-5" />
        </button>
      </div>

      {/* Gaveta do mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-y-auto border-r border-line bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display font-bold">Menu</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:text-cream"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* Coluna fixa no desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface p-4 lg:flex">
        <Link href="/" className="mb-6 block px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="SushiFull" className="h-10 w-auto" />
        </Link>

        {nav}

        <div className="mt-auto border-t border-line pt-4">
          <p className="mb-2 truncate px-3 text-xs text-muted">{userName}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-danger"
          >
            <LogOut className="size-4" aria-hidden />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
