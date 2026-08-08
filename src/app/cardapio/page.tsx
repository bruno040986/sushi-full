import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MenuCatalog } from "@/components/MenuCatalog";
import { StorefrontProvider } from "@/components/StorefrontProvider";
import { getMenu, getOpeningHours, getSettings, getStorefrontData } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cardápio",
  description:
    "Combos, temakis, niguiris, huramakis, hots, ceviches, cardápio chinês e bebidas. Monte seu pedido e envie pelo WhatsApp.",
};

export default async function CardapioPage() {
  const [storefront, settings, hours, categories] = await Promise.all([
    getStorefrontData(),
    getSettings(),
    getOpeningHours(),
    getMenu(),
  ]);

  const totalItems = categories.reduce((sum, category) => sum + category.products.length, 0);

  return (
    <StorefrontProvider data={storefront}>
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="py-8">
          <h1 className="flex items-center gap-3 font-display text-3xl font-black sm:text-4xl">
            <span className="h-9 w-2 rounded-full bg-brand" aria-hidden />
            Cardápio
          </h1>
          <p className="mt-2 text-sm text-muted">
            {totalItems} itens · {categories.length} categorias · monte seu pedido e envie no
            WhatsApp
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">
            O cardápio está sendo atualizado. Volte em instantes.
          </p>
        ) : (
          <MenuCatalog categories={categories} />
        )}
      </main>

      <Footer settings={settings} hours={hours} />
    </StorefrontProvider>
  );
}
