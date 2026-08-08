import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Providers } from "@/app/Providers";
import { Analytics } from "@/components/Analytics";
import { CookieNotice } from "@/components/CookieNotice";
import { getAnalyticsConfig, getSettings } from "@/lib/store";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

/**
 * Enquanto o site vive num subdomínio provisório, bloqueamos os buscadores
 * para ele não competir com o domínio definitivo (conteúdo duplicado).
 * É variável de ambiente, e não código, para liberar sem precisar de deploy.
 */
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

/** Usado quando o painel ainda não tem SEO preenchido, ou o banco não responde. */
const FALLBACK = {
  storeName: "SushiFull",
  title: "SushiFull — Sabor que completa",
  description:
    "Combos, temakis, niguiris, ceviches e cardápio chinês em Valparaíso de Goiás. Peça pelo site e receba em casa.",
  image: "/brand/og.jpg",
};

/**
 * Metadata vinda do banco: o dono edita título, descrição e imagem de
 * compartilhamento na aba SEO do painel, sem precisar de deploy.
 *
 * A imagem é o que aparece ao colar o link no WhatsApp — canal principal do
 * restaurante —, então nunca fica vazia: sem escolha no painel, cai no
 * `og.jpg` gerado a partir da foto do salão com o logo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoConfig();

  return {
    title: { default: seo.title, template: `%s · ${seo.storeName}` },
    description: seo.description,
    // Sem metadataBase as URLs de Open Graph saem relativas e o card do link
    // não renderiza no WhatsApp.
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
      : undefined,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: seo.storeName,
      title: seo.title,
      description: seo.description,
      images: [{ url: seo.image, width: 1200, height: 630, alt: seo.storeName }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [seo.image],
    },
    robots: ALLOW_INDEXING ? undefined : { index: false, follow: false },
  };
}

/** Lê o SEO do banco tolerando falha — igual ao analytics, não pode quebrar o build. */
async function getSeoConfig() {
  try {
    const settings = await getSettings();
    return {
      storeName: settings.storeName || FALLBACK.storeName,
      title: settings.metaTitle || `${settings.storeName} — ${settings.tagline}`,
      description: settings.metaDescription || FALLBACK.description,
      image: settings.ogImageUrl || FALLBACK.image,
    };
  } catch {
    return FALLBACK;
  }
}

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const analytics = await getAnalyticsConfig();
  const hasAnalytics = Object.values(analytics).some(Boolean);

  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable} h-full`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <Analytics {...analytics} />
        <CookieNotice enabled={hasAnalytics} />
      </body>
    </html>
  );
}
