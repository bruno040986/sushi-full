"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { formatBRL } from "@/lib/money";
import type { MenuProduct } from "@/lib/store";
import { useCartStore } from "@/store/cartStore";

/**
 * Carrossel dos destaques. É aqui que as fotos profissionais aparecem
 * inteiras, em 3:4, sem o corte quadrado dos cards do cardápio.
 */
export function FeaturedCarousel({ products }: { products: MenuProduct[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  if (products.length === 0) return null;

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-hide"
      >
        {products.map((product) => (
          <article
            key={product.id}
            className="group relative aspect-[3/4] w-[230px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-surface-2 sm:w-[260px]"
          >
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="260px"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="grid size-full place-items-center">
                <span className="font-display text-5xl font-black text-line">鮨</span>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-14">
              <h3 className="text-sm font-bold leading-snug text-white">{product.name}</h3>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-display text-lg font-black text-white">
                  {formatBRL(product.priceCents)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    addItem({
                      productId: product.id,
                      name: product.name,
                      priceCents: product.priceCents,
                      imageUrl: product.imageUrl,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-strong"
                  aria-label={`Adicionar ${product.name} ao carrinho`}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {products.length > 3 && (
        <>
          <CarouselButton side="left" onClick={() => scrollBy(-1)} />
          <CarouselButton side="right" onClick={() => scrollBy(1)} />
        </>
      )}
    </div>
  );
}

function CarouselButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1/2 hidden -translate-y-1/2 rounded-full border border-line bg-ink/80 p-2 text-cream backdrop-blur transition hover:border-brand hover:text-brand lg:block ${
        side === "left" ? "-left-4" : "-right-4"
      }`}
      aria-label={side === "left" ? "Anterior" : "Próximo"}
    >
      <Icon className="size-5" />
    </button>
  );
}
