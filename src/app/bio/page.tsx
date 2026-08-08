import { Globe, MapPin, MessageCircle, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Delivery,
  Facebook,
  Instagram,
  TikTok,
  type IconComponent,
} from "@/components/BrandIcons";
import { HeroVideo } from "@/components/HeroVideo";
import { HowToGetThereButton, type RouteLinks } from "@/components/HowToGetThere";
import { getStoreStatus, weeklySchedule } from "@/lib/hours";
import { formatStoreAddress, getOpeningHours, getSettings } from "@/lib/store";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Links",
  description: "Cardápio, pedidos, localização e redes sociais do SushiFull.",
};

type BioLink = {
  label: string;
  href: string;
  Icon: IconComponent;
  variant?: "primary" | "whats";
  external?: boolean;
};

const linkClass = (variant?: BioLink["variant"]) =>
  `flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-4 font-bold backdrop-blur transition ${
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-strong"
      : variant === "whats"
        ? "bg-whats text-ink hover:brightness-110"
        : "border border-line bg-surface/80 text-cream hover:border-brand hover:text-brand"
  }`;

export default async function BioPage() {
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);
  const status = getStoreStatus(hours, new Date(), settings.timezone);
  const schedule = weeklySchedule(hours);

  const routeLinks: RouteLinks = {
    googleMapsUrl: settings.googleMapsUrl,
    wazeUrl: settings.wazeUrl,
    address: formatStoreAddress(settings),
  };

  // Link sem destino cadastrado no painel simplesmente não aparece.
  const optional = (href: string | null, link: Omit<BioLink, "href">): BioLink | null =>
    href ? { ...link, href } : null;

  const secondaryLinks: BioLink[] = [
    { label: "Site oficial", href: "/", Icon: Globe },
    {
      label: "Falar no WhatsApp",
      href: buildWhatsappUrl(settings.whatsappNumber, "Olá! Vim pelo link da bio."),
      Icon: MessageCircle,
      variant: "whats" as const,
      external: true,
    },
    optional(settings.ifoodUrl, { label: "Pedir pelo iFood", Icon: Delivery, external: true }),
    optional(settings.instagramUrl, {
      label: settings.instagramHandle ?? "Instagram",
      Icon: Instagram,
      external: true,
    }),
    optional(settings.facebookUrl, { label: "Facebook", Icon: Facebook, external: true }),
    optional(settings.tiktokUrl, { label: "TikTok", Icon: TikTok, external: true }),
  ].filter((link): link is BioLink => link !== null);

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-12">
      {/* Fundo: mesmo vídeo do hero, bem escurecido para o texto respirar */}
      <div className="fixed inset-0 -z-10" aria-hidden>
        <HeroVideo src="/video/hero.mp4" poster="/video/hero-poster.webp" />
        <div className="absolute inset-0 bg-ink/85" />
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,var(--color-brand)_0%,transparent_70%)] opacity-25" />
      </div>

      <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
        <Link href="/" aria-label={`${settings.storeName} — site oficial`}>
          <Image
            src={settings.logoUrl}
            alt={settings.storeName}
            width={648}
            height={442}
            priority
            className="h-36 w-auto sm:h-44"
          />
        </Link>

        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          {settings.tagline}
        </p>

        <span
          className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur ${
            status.isOpen
              ? "border-success/30 bg-success/10 text-success"
              : "border-line bg-surface/80 text-muted"
          }`}
        >
          <span
            className={`size-2 rounded-full ${status.isOpen ? "bg-success" : "bg-danger"}`}
            aria-hidden
          />
          {status.isOpen ? "Aberto agora" : (status.nextOpen?.label ?? "Fechado")}
        </span>

        <nav className="mt-8 w-full space-y-3">
          <Link href="/cardapio" className={linkClass("primary")}>
            <UtensilsCrossed className="size-5 shrink-0" aria-hidden />
            Ver cardápio e pedir
          </Link>

          <HowToGetThereButton links={routeLinks} className={linkClass()}>
            <MapPin className="size-5 shrink-0" aria-hidden />
            Como chegar
          </HowToGetThereButton>

          {secondaryLinks.map(({ label, href, Icon, variant, external }) => {
            const content = (
              <>
                <Icon className="size-5 shrink-0" aria-hidden />
                {label}
              </>
            );

            return external ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className={linkClass(variant)}
              >
                {content}
              </a>
            ) : (
              <Link key={label} href={href} className={linkClass(variant)}>
                {content}
              </Link>
            );
          })}
        </nav>

        <section className="mt-10 w-full rounded-2xl border border-line bg-surface/85 p-5 text-left backdrop-blur">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
            Funcionamento
          </h2>
          <ul className="space-y-1 text-sm">
            {schedule.map((day) => (
              <li key={day.weekday} className="flex justify-between gap-3">
                <span className="text-muted">{day.name}</span>
                <span className={day.closed ? "text-faint" : "text-cream"}>{day.label}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex gap-2 border-t border-line pt-4 text-sm leading-relaxed text-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{formatStoreAddress(settings)}</span>
          </p>
        </section>

        <p className="mt-8 text-xs text-faint">{settings.whatsappDisplay}</p>
      </div>
    </main>
  );
}
