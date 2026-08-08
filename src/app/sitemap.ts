import type { MetadataRoute } from "next";

/**
 * Sitemap com as páginas públicas.
 *
 * O cardápio inteiro vive numa URL só (`/cardapio`), então não há por que
 * listar produto a produto — não existe página por item.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!siteUrl) return [];

  const now = new Date();

  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/cardapio`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/bio`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/termos-de-uso`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    {
      url: `${siteUrl}/politica-de-privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
