/**
 * Popula o banco de forma idempotente — pode rodar quantas vezes precisar.
 *
 *   npm run db:seed
 *
 * Regra importante: ao atualizar um produto que já existe, NÃO sobrescrevemos
 * `imageUrl`, `active` nem `featured`. Esses três são ajustados pelo dono no
 * painel, e o seed não pode desfazer o trabalho dele.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type MenuItem = {
  category: string;
  categorySort?: number;
  slug: string;
  code?: string;
  name: string;
  shortDescription?: string;
  longDescription?: string;
  priceCents: number;
  image?: string | null;
  featured?: boolean;
  sortOrder?: number;
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ─── Admin ───────────────────────────────────────────────────────────────────

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrador";

  if (!email || !password) {
    console.warn("  ⚠ ADMIN_EMAIL/ADMIN_PASSWORD ausentes no .env — admin não criado");
    return;
  }
  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD precisa ter pelo menos 10 caracteres");
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, name, password: hash, role: "ADMIN" },
    // Atualiza a senha também: é assim que se troca a senha do admin.
    update: { name, password: hash, role: "ADMIN" },
  });
  console.log(`  admin: ${email}`);
}

// ─── Configurações da loja ───────────────────────────────────────────────────

/** Endereço usado para montar os links de rota do Google Maps e do Waze. */
const STORE_ADDRESS_QUERY = encodeURIComponent(
  "Sushi Full, Q 33 Lote 22, Parque Esplanada III, Valparaíso de Goiás - GO",
);

async function seedSettings() {
  // create-only: se o dono já editou no painel, o seed não sobrescreve nada.
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      storeName: "SushiFull",
      tagline: "Sabor que completa",
      aboutTitle: "Sobre o SushiFull",
      // Sem "rodízio todos os dias": a casa fecha na segunda, e a grade de
      // horários semeada logo abaixo diz isso. O texto não pode contradizê-la.
      aboutText: [
        "Tem sushi de todo dia e tem sushi que vira programa. O nosso é o segundo.",
        "Salmão maçaricado, niguiri trufado com flor de sal e limão siciliano, ceviche de tilápia com leite de coco, combos de 14 a 100 peças para dividir na mesa. Tem rodízio para quem quer provar de tudo, e um cardápio chinês completo para variar.",
        "Sabor que completa é o que a gente persegue em cada peça que sai da cozinha. Estamos no Parque Esplanada III, em Valparaíso de Goiás, de terça a domingo, das 18h às 23h.",
      ].join("\n\n"),

      whatsappNumber: "5561993292359",
      whatsappDisplay: "(61) 99329-2359",
      instagramUrl: "https://instagram.com/sushifullvalparaiso",
      instagramHandle: "@sushifullvalparaiso",
      linktreeUrl: "https://linktr.ee/sushifull",

      addressLine: "Q 33, Lote 22",
      neighborhood: "Parque Esplanada III",
      city: "Valparaíso de Goiás",
      state: "GO",
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${STORE_ADDRESS_QUERY}`,
      wazeUrl: `https://waze.com/ul?q=${STORE_ADDRESS_QUERY}&navigate=yes`,

      timezone: "America/Sao_Paulo",
      ordersEnabled: true,

      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFeeMode: "FIXED",
      fixedDeliveryFeeCents: 500,
      freeDeliveryThresholdCents: 8000,
      deliveryEtaMinMinutes: 40,
      deliveryEtaMaxMinutes: 70,
      pickupEtaMinutes: 30,
    },
  });
  console.log("  configurações da loja");
}

// ─── Horários: Ter–Dom 18h–23h, segunda fechado ──────────────────────────────

async function seedOpeningHours() {
  // 0 = domingo … 6 = sábado
  const OPEN_DAYS = new Set([0, 2, 3, 4, 5, 6]);

  for (let weekday = 0; weekday < 7; weekday++) {
    const isOpen = OPEN_DAYS.has(weekday);
    const data = {
      closed: !isOpen,
      opensAtMin: 18 * 60, // 18h
      closesAtMin: 23 * 60, // 23h
    };
    await prisma.openingHour.upsert({
      where: { weekday },
      update: {},
      create: { weekday, ...data },
    });
  }
  console.log("  horários: terça a domingo, 18h às 23h (segunda fechado)");
}

// ─── Formas de pagamento ─────────────────────────────────────────────────────

async function seedPaymentMethods() {
  const methods = [
    { name: "Pix", isCash: false, sortOrder: 1 },
    { name: "Dinheiro", isCash: true, sortOrder: 2 },
    { name: "Cartão de Débito", isCash: false, sortOrder: 3 },
    { name: "Cartão de Crédito", isCash: false, sortOrder: 4 },
    { name: "Vale-Refeição", isCash: false, sortOrder: 5 },
  ];

  for (const method of methods) {
    await prisma.paymentMethod.upsert({
      where: { name: method.name },
      update: {},
      create: method,
    });
  }
  console.log(`  ${methods.length} formas de pagamento`);
}

// ─── Cidades e bairros de entrega ────────────────────────────────────────────

async function seedDeliveryZones() {
  // A UF acompanha a cidade — não dá para montar um par inválido no checkout.
  const cities = [
    { name: "Valparaíso de Goiás", state: "GO", isDefault: true, sortOrder: 1 },
    { name: "Cidade Ocidental", state: "GO", isDefault: false, sortOrder: 2 },
    { name: "Novo Gama", state: "GO", isDefault: false, sortOrder: 3 },
  ];

  const cityIds = new Map<string, string>();
  for (const city of cities) {
    const saved = await prisma.serviceCity.upsert({
      where: { name_state: { name: city.name, state: city.state } },
      update: {},
      create: city,
    });
    cityIds.set(city.name, saved.id);
  }

  // Ponto de partida — o dono ajusta taxas e adiciona bairros no painel.
  const defaultCityId = cityIds.get("Valparaíso de Goiás")!;
  const zones = [
    { name: "Parque Esplanada III", feeCents: 500, etaMinutes: 30, sortOrder: 1 },
    { name: "Parque Esplanada II", feeCents: 600, etaMinutes: 35, sortOrder: 2 },
    { name: "Parque Esplanada I", feeCents: 600, etaMinutes: 35, sortOrder: 3 },
    { name: "Cidade Jardins", feeCents: 800, etaMinutes: 45, sortOrder: 4 },
    { name: "Céu Azul", feeCents: 800, etaMinutes: 45, sortOrder: 5 },
    { name: "Jardim Céu Azul", feeCents: 900, etaMinutes: 50, sortOrder: 6 },
  ];

  for (const zone of zones) {
    await prisma.deliveryZone.upsert({
      where: { name_cityId: { name: zone.name, cityId: defaultCityId } },
      update: {},
      create: { ...zone, cityId: defaultCityId },
    });
  }

  console.log(
    `  ${cities.length} cidades e ${zones.length} bairros (ajuste taxas e regras no painel)`,
  );
}

// ─── Reels da home ───────────────────────────────────────────────────────────

async function seedReels() {
  const reels = [
    { title: "Combos que valem a pena", slug: "reel-combo", sortOrder: 1 },
    { title: "Temaki na hora", slug: "reel-temaki", sortOrder: 2 },
    { title: "Camarão empanado", slug: "reel-camarao", sortOrder: 3 },
  ];

  for (const reel of reels) {
    const videoUrl = `/video/${reel.slug}.mp4`;
    const existing = await prisma.reel.findFirst({ where: { videoUrl } });
    if (existing) continue;

    await prisma.reel.create({
      data: {
        title: reel.title,
        videoUrl,
        posterUrl: `/video/${reel.slug}-poster.webp`,
        sortOrder: reel.sortOrder,
      },
    });
  }
  console.log(`  ${reels.length} reels`);
}

// ─── Cardápio ────────────────────────────────────────────────────────────────

/**
 * Foto de reserva de cada categoria.
 *
 * Só 7 fotos profissionais e ~11 imagens aproveitáveis do PDF cobrem 91 itens.
 * Em vez de deixar 74 cards vazios, cada item sem foto própria mostra a foto
 * da sua categoria. O dono substitui item a item pelo painel quando quiser.
 */
const CATEGORY_IMAGES: Record<string, string> = {
  Combos: "/cardapio/combo-sushi-01-1000.webp",
  "Combos Especiais": "/cardapio/ambiente-mesa-completa-1000.webp",
  Temaki: "/cardapio/temaki-salmao-1000.webp",
  Huramaki: "/cardapio/menu-huramaki-1000.webp",
  Hossomaki: "/cardapio/menu-hossomaki-1000.webp",
  Niguiri: "/cardapio/niguiri-01-1000.webp",
  Gunkan: "/cardapio/menu-gunkan-salmao-1000.webp",
  Jyo: "/cardapio/menu-jyo-salmao-1000.webp",
  Hot: "/cardapio/menu-hot-salmao-macaricado-1000.webp",
  Sashimi: "/cardapio/menu-sashimi-variado-1000.webp",
  Ceviche: "/cardapio/ceviche-tilapia-leite-de-coco-01-1000.webp",
  "Cardápio Chinês": "/cardapio/menu-shimeji-1000.webp",
  Porções: "/cardapio/menu-shimeji-1000.webp",
  Bebidas: "/cardapio/menu-refrigerante-1000.webp",
};

async function seedMenu() {
  const file = path.join(process.cwd(), "prisma", "data", "menu.json");

  let items: MenuItem[];
  try {
    items = JSON.parse(await readFile(file, "utf8"));
  } catch {
    console.warn("  ⚠ prisma/data/menu.json não encontrado — cardápio não populado");
    return;
  }

  // Categorias, na ordem declarada no arquivo
  const categories = new Map<string, number>();
  for (const item of items) {
    if (!categories.has(item.category)) {
      categories.set(item.category, item.categorySort ?? categories.size + 1);
    }
  }

  const categoryIds = new Map<string, string>();
  for (const [name, sortOrder] of categories) {
    const slug = slugify(name);
    const imageUrl = CATEGORY_IMAGES[name] ?? null;
    const category = await prisma.category.upsert({
      where: { slug },
      // imageUrl fica fora do update: se o dono trocar a foto no painel,
      // rodar o seed de novo não desfaz a escolha dele.
      update: { name, sortOrder },
      create: { name, slug, sortOrder, imageUrl },
    });
    categoryIds.set(name, category.id);
  }

  let created = 0;
  let updated = 0;
  for (const [index, item] of items.entries()) {
    const categoryId = categoryIds.get(item.category);
    if (!categoryId) continue;

    const existing = await prisma.product.findUnique({ where: { slug: item.slug } });

    await prisma.product.upsert({
      where: { slug: item.slug },
      // Nunca sobrescreve imageUrl/active/featured — são ajustes do painel.
      update: {
        name: item.name,
        code: item.code ?? null,
        shortDescription: item.shortDescription ?? null,
        longDescription: item.longDescription ?? null,
        priceCents: item.priceCents,
        sortOrder: item.sortOrder ?? index,
        categoryId,
      },
      create: {
        slug: item.slug,
        code: item.code ?? null,
        name: item.name,
        shortDescription: item.shortDescription ?? null,
        longDescription: item.longDescription ?? null,
        priceCents: item.priceCents,
        imageUrl: item.image ?? null,
        featured: item.featured ?? false,
        sortOrder: item.sortOrder ?? index,
        categoryId,
      },
    });

    if (existing) updated++;
    else created++;
  }

  console.log(
    `  cardápio: ${categories.size} categorias, ${created} produtos novos, ${updated} atualizados`,
  );
}

// ─── Execução ────────────────────────────────────────────────────────────────

async function main() {
  console.log("Semeando o banco…\n");
  await seedAdmin();
  await seedSettings();
  await seedOpeningHours();
  await seedPaymentMethods();
  await seedDeliveryZones();
  await seedReels();
  await seedMenu();
  console.log("\n✓ pronto");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
