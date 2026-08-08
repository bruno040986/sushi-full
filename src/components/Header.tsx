"use client";

import { ShoppingBag } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { StoreStatusBadge } from "@/components/StoreStatusBadge";
import { useCartStore } from "@/store/cartStore";

// O drawer lê o localStorage; carregar só no cliente evita mismatch de hidratação.
const CartDrawer = dynamic(
  () => import("@/components/CartDrawer").then((m) => m.CartDrawer),
  { ssr: false },
);

/** O valor nunca muda depois da hidratação, então não há a que se inscrever. */
const subscribeNever = () => () => {};

export function Header() {
  const itemCount = useCartStore((state) => state.itemCount());
  const openDrawer = useCartStore((state) => state.openDrawer);

  /**
   * O carrinho vive no localStorage, que não existe no servidor. Só mostramos
   * a contagem depois da hidratação — senão o HTML do servidor (0 itens) briga
   * com o do cliente e o React reclama.
   *
   * `getServerSnapshot` vale no SSR e na hidratação; `getSnapshot` assume
   * depois, o que dispara um render extra sem risco de mismatch.
   */
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-3" aria-label="SushiFull — início">
            <Image
              src="/brand/logo.png"
              alt="SushiFull"
              width={648}
              height={442}
              priority
              className="h-12 w-auto sm:h-14"
            />
          </Link>

          <nav className="flex items-center gap-2 sm:gap-5">
            <StoreStatusBadge className="hidden sm:inline-flex" />

            <Link
              href="/cardapio"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:text-cream"
            >
              Cardápio
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              className="relative inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-strong"
              aria-label={`Abrir carrinho${mounted && itemCount > 0 ? ` com ${itemCount} itens` : ""}`}
            >
              <ShoppingBag className="size-4" aria-hidden />
              <span className="hidden sm:inline">Carrinho</span>
              {mounted && itemCount > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-white px-1.5 text-xs font-black text-brand">
                  {itemCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {mounted && <CartDrawer />}
    </>
  );
}
