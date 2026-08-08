import { MapPin, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, TikTok, type IconComponent } from "@/components/BrandIcons";
import { weeklySchedule, type OpeningHourDTO } from "@/lib/hours";
import { formatCnpj } from "@/lib/money";
import { formatStoreAddress, type Settings } from "@/lib/store";
import { buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * Tudo aqui vem do banco. Campo vazio no painel = bloco some do rodapé,
 * em vez de ícone órfão ou link quebrado.
 */
export function Footer({ settings, hours }: { settings: Settings; hours: OpeningHourDTO[] }) {
  const schedule = weeklySchedule(hours);
  const year = new Date().getFullYear();

  type Social = { href: string; label: string; Icon: IconComponent };

  const candidates: { href: string | null; label: string; Icon: IconComponent }[] = [
    {
      href: buildWhatsappUrl(settings.whatsappNumber, "Olá! Vim pelo site."),
      label: "WhatsApp",
      Icon: MessageCircle,
    },
    { href: settings.instagramUrl, label: "Instagram", Icon: Instagram },
    { href: settings.facebookUrl, label: "Facebook", Icon: Facebook },
    { href: settings.tiktokUrl, label: "TikTok", Icon: TikTok },
  ];

  const socials = candidates.filter((social): social is Social => Boolean(social.href));

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Marca */}
        <div>
          <Image
            src={settings.logoUrl}
            alt={settings.storeName}
            width={648}
            height={442}
            className="h-16 w-auto"
          />
          <p className="mt-3 text-sm leading-relaxed text-muted">{settings.tagline}</p>

          {socials.length > 0 && (
            <div className="mt-4 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="rounded-full border border-line p-2 text-muted transition hover:border-brand hover:text-brand"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Contato */}
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-cream">Contato</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <a
                href={buildWhatsappUrl(settings.whatsappNumber, "Olá! Vim pelo site.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-brand"
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden />
                {settings.whatsappDisplay}
              </a>
            </li>
            {settings.phoneLandline && (
              <li className="inline-flex items-center gap-2">
                <Phone className="size-4 shrink-0" aria-hidden />
                {settings.phoneLandline}
              </li>
            )}
            {settings.contactEmail && (
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="transition hover:text-brand"
                >
                  {settings.contactEmail}
                </a>
              </li>
            )}
          </ul>
        </div>

        {/* Endereço */}
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-cream">
            Onde estamos
          </h3>
          <p className="flex gap-2 text-sm leading-relaxed text-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{formatStoreAddress(settings)}</span>
          </p>
          {settings.googleMapsUrl && (
            <a
              href={settings.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-brand transition hover:text-brand-soft"
            >
              Traçar rota
            </a>
          )}
        </div>

        {/* Horários */}
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-cream">
            Funcionamento
          </h3>
          <ul className="space-y-1 text-sm">
            {schedule.map((day) => (
              <li key={day.weekday} className="flex justify-between gap-3">
                <span className="text-muted">{day.short}</span>
                <span className={day.closed ? "text-faint" : "text-cream"}>{day.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.legalName ?? settings.storeName}
            {settings.cnpj && ` · CNPJ ${formatCnpj(settings.cnpj)}`}
          </p>
          <nav className="flex gap-4">
            <Link href="/termos-de-uso" className="transition hover:text-muted">
              Termos de uso
            </Link>
            <Link href="/politica-de-privacidade" className="transition hover:text-muted">
              Privacidade
            </Link>
            <Link href="/admin/login" className="transition hover:text-muted">
              Painel
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
