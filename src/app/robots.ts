import type { MetadataRoute } from "next";

/**
 * robots.txt.
 *
 * Enquanto NEXT_PUBLIC_ALLOW_INDEXING não for "true", bloqueia o site inteiro —
 * é o endereço provisório e não deve concorrer com o domínio definitivo.
 * Liberado ou não, o painel e as rotas de API nunca são indexados.
 */
export default function robots(): MetadataRoute.Robots {
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!allowIndexing) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: siteUrl ? `${siteUrl}/sitemap.xml` : undefined,
  };
}
