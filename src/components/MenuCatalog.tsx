"use client";

import { Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { MenuCard } from "@/components/MenuCard";
import { ProductModal } from "@/components/ProductModal";
import type { MenuCategory, MenuProduct } from "@/lib/store";

/** Ignora acento e caixa — "sasimi" não acha, mas "sashimi" e "SASHIMI" sim. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function MenuCatalog({ categories }: { categories: MenuCategory[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const query = normalize(search.trim());

  const visible = useMemo(() => {
    return categories
      .filter((category) => activeCategory === "todos" || category.slug === activeCategory)
      .map((category) => ({
        ...category,
        products: query
          ? category.products.filter(
              (product) =>
                normalize(product.name).includes(query) ||
                normalize(product.shortDescription ?? "").includes(query) ||
                normalize(product.longDescription ?? "").includes(query) ||
                product.code?.includes(query),
            )
          : category.products,
      }))
      .filter((category) => category.products.length > 0);
  }, [categories, activeCategory, query]);

  const totalFound = visible.reduce((sum, c) => sum + c.products.length, 0);

  function selectCategory(slug: string) {
    setActiveCategory(slug);
    if (slug !== "todos") {
      // Deixa o React pintar antes de rolar até a seção
      requestAnimationFrame(() =>
        sectionRefs.current[slug]?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  return (
    <>
      {/* Busca + filtros */}
      <div className="sticky top-20 z-30 -mx-4 border-b border-line/80 bg-ink/90 px-4 py-3 backdrop-blur-md">
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no cardápio…"
            aria-label="Buscar no cardápio"
            className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-10 text-sm text-cream placeholder:text-faint focus:border-brand focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-faint hover:text-cream"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[{ slug: "todos", name: "Tudo" }, ...categories].map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => selectCategory(category.slug)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeCategory === category.slug
                  ? "bg-brand text-white"
                  : "border border-line bg-surface text-muted hover:text-cream"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Resultado */}
      {totalFound === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">
          Nada encontrado para <strong className="text-cream">“{search}”</strong>.
        </p>
      ) : (
        <div className="space-y-10">
          {visible.map((category) => (
            <section
              key={category.id}
              id={category.slug}
              ref={(el) => {
                sectionRefs.current[category.slug] = el;
              }}
              className="scroll-mt-40"
            >
              <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-black">
                <span className="h-6 w-1.5 rounded-full bg-brand" aria-hidden />
                {category.name}
                <span className="text-sm font-medium text-faint">
                  {category.products.length}
                </span>
              </h2>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {category.products.map((product) => (
                  <MenuCard key={product.id} product={product} onOpen={setSelected} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* key remonta o modal a cada produto, zerando a quantidade escolhida */}
      <ProductModal key={selected?.id} product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
