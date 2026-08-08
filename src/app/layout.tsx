import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Providers } from "@/app/Providers";
import { Analytics } from "@/components/Analytics";
import { CookieNotice } from "@/components/CookieNotice";
import { getAnalyticsConfig } from "@/lib/store";
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

export const metadata: Metadata = {
  title: {
    default: "SushiFull — Sabor que completa",
    template: "%s · SushiFull",
  },
  description:
    "Combos, temakis, niguiris, ceviches e cardápio chinês em Valparaíso de Goiás. Peça pelo site e receba em casa.",
  // Sem metadataBase as URLs de Open Graph saem relativas e o card do link
  // não renderiza no WhatsApp — que é onde o restaurante mais compartilha.
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "SushiFull",
  },
  robots: ALLOW_INDEXING ? undefined : { index: false, follow: false },
};

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
