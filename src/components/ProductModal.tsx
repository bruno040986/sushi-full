"use client";

import { Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { track } from "@/components/Analytics";
import { formatBRL } from "@/lib/money";
import type { MenuProduct } from "@/lib/store";
import { useCartStore } from "@/store/cartStore";

export function ProductModal({
  product,
  onClose,
}: {
  product: MenuProduct | null;
  onClose: () => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  // A quantidade volta a 1 a cada produto porque o pai passa key={product.id},
  // o que remonta este componente com o estado zerado.
  const [quantity, setQuantity] = useState(1);

  // Abrir o detalhe é o sinal de interesse que o Ads usa para remarketing
  useEffect(() => {
    if (!product) return;
    track.viewItem({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity: 1,
    });
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  if (!product) return null;

  const description = product.longDescription ?? product.shortDescription;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-surface sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:grid sm:grid-cols-2">
          <div className="relative aspect-[3/4] w-full bg-surface-2 sm:aspect-square">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, 384px"
                className="object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center">
                <span className="font-display text-6xl font-black text-line">鮨</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-5 sm:p-6">
            {product.code && (
              <span className="font-mono text-xs text-faint">Código {product.code}</span>
            )}
            <h2 className="font-display text-2xl font-black leading-tight">{product.name}</h2>

            {description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {description}
              </p>
            )}

            <span className="font-display text-3xl font-black text-brand">
              {formatBRL(product.priceCents)}
            </span>

            <div className="mt-auto flex items-center gap-3 pt-3">
              <div className="inline-flex items-center rounded-full border border-line">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-muted transition hover:text-cream"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-8 text-center font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  className="p-2.5 text-muted transition hover:text-cream"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  addItem(
                    {
                      productId: product.id,
                      name: product.name,
                      priceCents: product.priceCents,
                      imageUrl: product.imageUrl,
                    },
                    quantity,
                  );
                  track.addToCart({
                    id: product.id,
                    name: product.name,
                    priceCents: product.priceCents,
                    quantity,
                  });
                  onClose();
                }}
                className="flex-1 rounded-full bg-brand py-3 font-bold text-white transition hover:bg-brand-strong"
              >
                Adicionar {formatBRL(product.priceCents * quantity)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
