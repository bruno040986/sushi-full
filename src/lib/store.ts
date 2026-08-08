/**
 * Leitura das configurações e do catálogo.
 *
 * Estas funções rodam em Server Components e nas rotas públicas. Sempre
 * filtram `active` — nenhuma delas pode vazar produto ou categoria desativados,
 * que era o defeito do projeto anterior.
 */
import { prisma } from "@/lib/prisma";
import { getStoreStatus, type OpeningHourDTO } from "@/lib/hours";

/** Config de analytics para o layout — só o que o navegador precisa. */
export async function getAnalyticsConfig() {
  const settings = await getSettings();
  return {
    gtmContainerId: settings.gtmContainerId,
    ga4MeasurementId: settings.ga4MeasurementId,
    metaPixelId: settings.metaPixelId,
  };
}

/** Configurações da loja. O upsert garante que nunca retorna null. */
export async function getSettings() {
  return prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

export async function getOpeningHours(): Promise<OpeningHourDTO[]> {
  const hours = await prisma.openingHour.findMany({ orderBy: { weekday: "asc" } });
  return hours.map(({ weekday, closed, opensAtMin, closesAtMin }) => ({
    weekday,
    closed,
    opensAtMin,
    closesAtMin,
  }));
}

/** Cidades atendidas, com a padrão em primeiro lugar. */
export async function getServiceCities() {
  return prisma.serviceCity.findMany({
    where: { active: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, state: true, isDefault: true },
  });
}

export async function getActiveDeliveryZones() {
  return prisma.deliveryZone.findMany({
    where: { active: true, city: { active: true } },
    orderBy: [{ city: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      feeCents: true,
      etaMinutes: true,
      cityId: true,
      freeDelivery: true,
      freeDeliveryThresholdCents: true,
    },
  });
}

export async function getActivePaymentMethods() {
  return prisma.paymentMethod.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isCash: true },
  });
}

export async function getActiveReels() {
  return prisma.reel.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, videoUrl: true, posterUrl: true },
  });
}

const PRODUCT_FIELDS = {
  id: true,
  name: true,
  slug: true,
  code: true,
  shortDescription: true,
  longDescription: true,
  priceCents: true,
  imageUrl: true,
} as const;

export type MenuProduct = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  priceCents: number;
  imageUrl: string | null;
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  products: MenuProduct[];
};

/** Catálogo público: só categorias e produtos ativos, já agrupados. */
export async function getMenu(): Promise<MenuCategory[]> {
  const categories = await prisma.category.findMany({
    where: { active: true, products: { some: { active: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      products: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: PRODUCT_FIELDS,
      },
    },
  });

  // Item sem foto própria herda a da categoria — melhor que card vazio.
  return categories.map(({ imageUrl, ...category }) => ({
    ...category,
    products: category.products.map((product) => ({
      ...product,
      imageUrl: product.imageUrl ?? imageUrl,
    })),
  }));
}

/** Destaques do carrossel da home. */
export async function getFeaturedProducts(limit = 12): Promise<MenuProduct[]> {
  const products = await prisma.product.findMany({
    where: { active: true, featured: true, category: { active: true } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit,
    select: { ...PRODUCT_FIELDS, category: { select: { imageUrl: true } } },
  });

  return products.map(({ category, ...product }) => ({
    ...product,
    imageUrl: product.imageUrl ?? category.imageUrl,
  }));
}

/**
 * Tudo que o carrinho precisa numa chamada só. O CartDrawer não pode fazer
 * quatro fetches no mount.
 */
export async function getStorefrontData(now = new Date()) {
  const [settings, hours, zones, cities, paymentMethods] = await Promise.all([
    getSettings(),
    getOpeningHours(),
    getActiveDeliveryZones(),
    getServiceCities(),
    getActivePaymentMethods(),
  ]);

  const status = getStoreStatus(hours, now, settings.timezone);

  return {
    settings: {
      storeName: settings.storeName,
      whatsappNumber: settings.whatsappNumber,
      whatsappDisplay: settings.whatsappDisplay,
      addressLine: settings.addressLine,
      number: settings.number,
      neighborhood: settings.neighborhood,
      city: settings.city,
      state: settings.state,
      googleMapsUrl: settings.googleMapsUrl,
      wazeUrl: settings.wazeUrl,
      ordersEnabled: settings.ordersEnabled,
      closedMessage: settings.closedMessage,
      timezone: settings.timezone,
      deliveryEnabled: settings.deliveryEnabled,
      pickupEnabled: settings.pickupEnabled,
      deliveryFeeMode: settings.deliveryFeeMode,
      fixedDeliveryFeeCents: settings.fixedDeliveryFeeCents,
      freeDeliveryThresholdCents: settings.freeDeliveryThresholdCents,
      minOrderCents: settings.minOrderCents,
      deliveryEtaMinMinutes: settings.deliveryEtaMinMinutes,
      deliveryEtaMaxMinutes: settings.deliveryEtaMaxMinutes,
      pickupEtaMinutes: settings.pickupEtaMinutes,
    },
    hours,
    zones,
    cities,
    paymentMethods,
    status,
    serverNowIso: now.toISOString(),
  };
}

/**
 * URL de embed do Google Maps sem precisar de chave de API.
 * Usa lat/long quando cadastrados; senão cai no endereço em texto.
 */
export function buildMapEmbedUrl(settings: {
  latitude: number | null;
  longitude: number | null;
  addressLine: string;
  number: string | null;
  neighborhood: string;
  city: string;
  state: string;
}): string {
  const query =
    settings.latitude != null && settings.longitude != null
      ? `${settings.latitude},${settings.longitude}`
      : formatStoreAddress(settings);

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

export type StorefrontData = Awaited<ReturnType<typeof getStorefrontData>>;

/** Endereço da loja numa linha só, para a mensagem do WhatsApp e a bio. */
export function formatStoreAddress(settings: {
  addressLine: string;
  number: string | null;
  neighborhood: string;
  city: string;
  state: string;
}): string {
  const head = settings.number
    ? `${settings.addressLine}, ${settings.number}`
    : settings.addressLine;
  return `${head} — ${settings.neighborhood}, ${settings.city}/${settings.state}`;
}
