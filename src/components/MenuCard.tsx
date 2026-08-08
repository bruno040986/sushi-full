"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { track } from "@/components/Analytics";
import { formatBRL } from "@/lib/money";
import type { MenuProduct } from "@/lib/store";
import { useCartStore } from "@/store/cartStore";

export function MenuCard({
  product,
  onOpen,
}: {
  product: MenuProduct;
  onOpen: (product: MenuProduct) => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const quantity = useCartStore((s) => s.quantityOf(product.id));

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-brand/40">
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative aspect-square w-full overflow-hidden bg-surface-2 text-left"
        aria-label={`Ver detalhes de ${product.name}`}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center bg-surface-2">
            <span className="font-display text-3xl font-black text-line">鮨</span>
          </div>
        )}
        {quantity > 0 && (
          <span className="absolute left-2 top-2 grid min-w-6 place-items-center rounded-full bg-brand px-2 py-0.5 text-xs font-black text-white">
            {quantity}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <button
          type="button"
          onClick={() => onOpen(product)}
          className="text-left text-sm font-semibold leading-snug hover:text-brand-soft"
        >
          {product.name}
        </button>

        {product.shortDescription && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">
            {product.shortDescription}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-display text-base font-black text-brand">
            {formatBRL(product.priceCents)}
          </span>
          <button
            type="button"
            onClick={() => {
              addItem({
                productId: product.id,
                name: product.name,
                priceCents: product.priceCents,
                imageUrl: product.imageUrl,
              });
              track.addToCart({
                id: product.id,
                name: product.name,
                priceCents: product.priceCents,
                quantity: 1,
              });
            }}
            className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-strong"
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            <Plus className="size-3.5" aria-hidden />
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
