import { ArrowRight, MapPin, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Instagram } from "@/components/BrandIcons";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HeroVideo } from "@/components/HeroVideo";
import { HowToGetThereButton, type RouteLinks } from "@/components/HowToGetThere";
import { ReelsSection } from "@/components/ReelsSection";
import { StorefrontProvider } from "@/components/StorefrontProvider";
import {
  buildMapEmbedUrl,
  formatStoreAddress,
  getActiveReels,
  getFeaturedProducts,
  getOpeningHours,
  getSettings,
  getStorefrontData,
} from "@/lib/store";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [storefront, settings, hours, featured, reels] = await Promise.all([
    getStorefrontData(),
    getSettings(),
    getOpeningHours(),
    getFeaturedProducts(),
    getActiveReels(),
  ]);

  const whatsappUrl = buildWhatsappUrl(
    settings.whatsappNumber,
    "Olá! Gostaria de fazer um pedido.",
  );

  const routeLinks: RouteLinks = {
    googleMapsUrl: settings.googleMapsUrl,
    wazeUrl: settings.wazeUrl,
    address: formatStoreAddress(settings),
  };

  return (
    <StorefrontProvider data={storefront}>
      <Header />

      <main>
        {/* Hero */}
        <section className="relative isolate flex min-h-[85vh] items-center overflow-hidden">
          <HeroVideo src="/video/hero.mp4" poster="/video/hero-poster.webp" />
          <div
            className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink"
            aria-hidden
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-20">
            <Image
              src={settings.logoUrl}
              alt={settings.storeName}
              width={648}
              height={442}
              priority
              className="mb-6 h-28 w-auto sm:h-40"
            />

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              {settings.tagline}
            </p>
            <h1 className="max-w-2xl font-display text-4xl font-black leading-[1.05] sm:text-6xl">
              O melhor sushi de{" "}
              <span className="text-brand">{settings.city.replace(/ de Goiás$/, "")}</span>,
              feito na hora.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Rodízio, combos para dividir, temakis, niguiris, ceviches, cardápio chinês e
              muito mais! Peça pelo site e receba em casa.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cardapio"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong"
              >
                Ver cardápio
                <ArrowRight className="size-4" aria-hidden />
              </Link>

              <HowToGetThereButton
                links={routeLinks}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-6 py-3.5 font-semibold backdrop-blur transition hover:border-brand hover:text-brand"
              >
                <MapPin className="size-4" aria-hidden />
                Como chegar
              </HowToGetThereButton>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-6 py-3.5 font-semibold backdrop-blur transition hover:border-whats hover:text-whats"
              >
                <MessageCircle className="size-4" aria-hidden />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* Destaques */}
        {featured.length > 0 && (
          <section className="py-14">
            <div className="mx-auto max-w-6xl px-4">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-black sm:text-3xl">Destaques</h2>
                  <p className="mt-1 text-sm text-muted">Os queridinhos da casa.</p>
                </div>
                <Link
                  href="/cardapio"
                  className="shrink-0 text-sm font-semibold text-brand transition hover:text-brand-soft"
                >
                  Ver tudo →
                </Link>
              </div>
              <FeaturedCarousel products={featured} />
            </div>
          </section>
        )}

        <ReelsSection reels={reels} />

        {/* Sobre */}
        <section className="border-y border-line bg-surface py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-black sm:text-3xl">
                {settings.aboutTitle}
              </h2>
              {settings.aboutText && (
                <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">
                  {settings.aboutText}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {settings.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold transition hover:border-brand hover:text-brand"
                  >
                    <Instagram className="size-4" aria-hidden />
                    {settings.instagramHandle ?? "Instagram"}
                  </a>
                )}
                <HowToGetThereButton
                  links={routeLinks}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold transition hover:border-brand hover:text-brand"
                >
                  <MapPin className="size-4" aria-hidden />
                  Como chegar
                </HowToGetThereButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                "/cardapio/ambiente-mesa-completa-1000.webp",
                "/cardapio/equipe-sushiman-1000.webp",
                "/cardapio/ambiente-casal-01-1000.webp",
                "/cardapio/ambiente-rodizio-01-1000.webp",
              ].map((src, index) => (
                <div
                  key={src}
                  className={`relative overflow-hidden rounded-2xl border border-line ${
                    index % 3 === 0 ? "aspect-[3/4]" : "aspect-square"
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 45vw, 280px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Onde estamos */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-8 text-center">
              <h2 className="font-display text-2xl font-black sm:text-3xl">Onde estamos</h2>
              <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">
                {formatStoreAddress(settings)}
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-line">
              <iframe
                src={buildMapEmbedUrl(settings)}
                title={`Mapa — ${settings.storeName}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="block h-[340px] w-full border-0 sm:h-[420px]"
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/cardapio"
                className="rounded-full bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-strong"
              >
                Fazer meu pedido
              </Link>

              <HowToGetThereButton
                links={routeLinks}
                className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 font-semibold transition hover:border-brand hover:text-brand"
              >
                <MapPin className="size-4" aria-hidden />
                Como chegar
              </HowToGetThereButton>

              <Link
                href="/bio"
                className="rounded-full border border-line px-6 py-3 font-semibold transition hover:border-brand hover:text-brand"
              >
                Todos os nossos links
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer settings={settings} hours={hours} />
    </StorefrontProvider>
  );
}
