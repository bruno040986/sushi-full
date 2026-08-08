import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import type { OpeningHourDTO } from "@/lib/hours";
import { formatCnpj } from "@/lib/money";
import { formatStoreAddress, type Settings } from "@/lib/store";

/** Moldura comum de Termos e Privacidade. */
export function LegalPage({
  title,
  updatedAt,
  settings,
  hours,
  children,
}: {
  title: string;
  updatedAt: string;
  settings: Settings;
  hours: OpeningHourDTO[];
  children: ReactNode;
}) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-5">
          <Link href="/" className="text-sm text-muted transition hover:text-cream">
            ← Voltar ao site
          </Link>
          <span className="font-display text-sm font-bold">{settings.storeName}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {updatedAt}</p>

        <div className="mt-8 space-y-6 leading-relaxed text-muted">{children}</div>

        <section className="mt-10 rounded-2xl border border-line bg-surface p-5 text-sm">
          <h2 className="mb-2 font-display font-bold text-cream">Quem somos</h2>
          <p>
            {settings.legalName ?? settings.storeName}
            {settings.cnpj && ` — CNPJ ${formatCnpj(settings.cnpj)}`}
          </p>
          <p className="mt-1">{formatStoreAddress(settings)}</p>
          <p className="mt-1">
            WhatsApp {settings.whatsappDisplay}
            {settings.contactEmail && ` · ${settings.contactEmail}`}
          </p>
        </section>
      </main>

      <Footer settings={settings} hours={hours} />
    </>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-bold text-cream">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
