/**
 * Schemas zod de todas as rotas de escrita.
 *
 * Centralizados aqui para que a mesma regra valha na API e nos formulários do
 * painel — e para que nenhuma rota nasça sem validação, que foi o buraco do
 * projeto anterior.
 */
import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const optionalUrl = z
  .string()
  .trim()
  .url("URL inválida")
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const IMAGE_REF_MESSAGE = "Informe um caminho iniciando com / ou uma URL http(s)";
const isImageRef = (v: string) => v.startsWith("/") || /^https?:\/\//.test(v);

/** Aceita caminho local (/cardapio/x.webp) ou URL completa. Vazio vira null. */
const imageRef = z
  .string()
  .trim()
  .refine((v) => v === "" || isImageRef(v), { message: IMAGE_REF_MESSAGE })
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

/**
 * Para colunas de imagem NÃO anuláveis (ex: StoreSettings.logoUrl): o campo
 * pode ser omitido, mas se vier precisa ter valor — enviar "" não pode virar
 * null e estourar no banco.
 */
const imageRefRequired = z
  .string()
  .trim()
  .min(1, "Informe a imagem")
  .refine(isImageRef, { message: IMAGE_REF_MESSAGE })
  .optional();

const cents = z.coerce
  .number({ invalid_type_error: "Informe um valor numérico" })
  .int("Use centavos inteiros")
  .min(0, "Não pode ser negativo")
  .max(100_000_000, "Valor absurdo");

const sortOrder = z.coerce.number().int().min(0).max(9999).default(0);

// ─── Categoria ───────────────────────────────────────────────────────────────

export const categoryCreateSchema = z.object({
  name: trimmed(80).min(2, "Nome muito curto"),
  /** Foto de reserva dos itens da categoria que não têm foto própria */
  imageUrl: imageRef,
  active: z.boolean().default(true),
  sortOrder,
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ─── Produto ─────────────────────────────────────────────────────────────────

export const productCreateSchema = z.object({
  name: trimmed(120).min(2, "Nome muito curto"),
  code: optionalText(20),
  shortDescription: optionalText(140),
  longDescription: optionalText(2000),
  priceCents: cents.refine((v) => v > 0, "O preço precisa ser maior que zero"),
  imageUrl: imageRef,
  categoryId: z.string().uuid("Selecione uma categoria"),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder,
});

export const productUpdateSchema = productCreateSchema.partial();

// ─── Forma de pagamento ──────────────────────────────────────────────────────

export const paymentMethodCreateSchema = z.object({
  name: trimmed(60).min(2, "Nome muito curto"),
  isCash: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder,
});

export const paymentMethodUpdateSchema = paymentMethodCreateSchema.partial();

// ─── Cidade atendida ─────────────────────────────────────────────────────────

export const serviceCityCreateSchema = z.object({
  name: trimmed(100).min(2, "Nome muito curto"),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a sigla de 2 letras, ex: GO"),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder,
});

export const serviceCityUpdateSchema = serviceCityCreateSchema.partial();

// ─── Bairro de entrega ───────────────────────────────────────────────────────

export const deliveryZoneCreateSchema = z.object({
  name: trimmed(80).min(2, "Nome muito curto"),
  cityId: z.string().uuid("Selecione a cidade"),
  feeCents: cents,
  /** Frete sempre grátis neste bairro */
  freeDelivery: z.boolean().default(false),
  /** Frete grátis a partir deste valor só neste bairro; nulo = usa a regra global */
  freeDeliveryThresholdCents: cents.optional().nullable(),
  etaMinutes: z.coerce.number().int().min(0).max(600).optional().nullable(),
  active: z.boolean().default(true),
  sortOrder,
});

export const deliveryZoneUpdateSchema = deliveryZoneCreateSchema.partial();

// ─── Horários ────────────────────────────────────────────────────────────────

const openingHourSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    closed: z.boolean(),
    // Até 1439 na abertura; o fechamento pode passar de 1440 (vira o dia)
    opensAtMin: z.coerce.number().int().min(0).max(1439),
    closesAtMin: z.coerce.number().int().min(1).max(1739), // até 04h59 do dia seguinte
  })
  .refine((h) => h.closed || h.closesAtMin > h.opensAtMin, {
    message: "O horário de fechamento precisa ser depois do de abertura",
    path: ["closesAtMin"],
  });

/** O PUT recebe a grade inteira: 7 dias, um por weekday. */
export const openingHoursSchema = z
  .array(openingHourSchema)
  .length(7, "Envie os 7 dias da semana")
  .refine((days) => new Set(days.map((d) => d.weekday)).size === 7, {
    message: "Cada dia da semana deve aparecer uma única vez",
  });

// ─── Configurações da loja ───────────────────────────────────────────────────

export const settingsUpdateSchema = z.object({
  // Identidade
  storeName: trimmed(80).min(2).optional(),
  tagline: trimmed(140).optional(),
  logoUrl: imageRefRequired,
  aboutTitle: trimmed(120).optional(),
  aboutText: optionalText(4000),

  // Jurídico
  legalName: optionalText(160),
  tradeName: optionalText(160),
  cnpj: optionalText(20),
  stateRegistration: optionalText(30),

  // Contato
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^\d{12,13}$/, "Use só dígitos com DDI e DDD, ex: 5561993292359")
    .optional(),
  whatsappDisplay: trimmed(30).optional(),
  phoneLandline: optionalText(30),
  secondaryPhone: optionalText(30),
  contactEmail: z
    .string()
    .trim()
    .email("E-mail inválido")
    .or(z.literal(""))
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),

  // Redes
  instagramUrl: optionalUrl,
  instagramHandle: optionalText(60),
  facebookUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  ifoodUrl: optionalUrl,
  linktreeUrl: optionalUrl,

  // Localização
  addressLine: trimmed(160).optional(),
  number: optionalText(20),
  complement: optionalText(80),
  neighborhood: trimmed(100).optional(),
  city: trimmed(100).optional(),
  state: trimmed(2).optional(),
  zipCode: optionalText(12),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  googleMapsUrl: optionalUrl,
  wazeUrl: optionalUrl,

  // Operação
  timezone: trimmed(60).optional(),
  ordersEnabled: z.boolean().optional(),
  closedMessage: trimmed(300).optional(),

  // Entrega
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryFeeMode: z.enum(["FIXED", "BY_NEIGHBORHOOD"]).optional(),
  fixedDeliveryFeeCents: cents.optional(),
  freeDeliveryThresholdCents: cents.optional().nullable(),
  minOrderCents: cents.optional().nullable(),
  deliveryEtaMinMinutes: z.coerce.number().int().min(0).max(600).optional(),
  deliveryEtaMaxMinutes: z.coerce.number().int().min(0).max(600).optional(),
  pickupEtaMinutes: z.coerce.number().int().min(0).max(600).optional(),

  // SEO
  metaTitle: optionalText(70),
  metaDescription: optionalText(180),
  ogImageUrl: imageRef,

  // Analytics — validados no formato de cada plataforma
  gtmContainerId: trimmed(20)
    .regex(/^GTM-[A-Z0-9]+$/, "Formato esperado: GTM-XXXXXXX")
    .or(z.literal(""))
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  ga4MeasurementId: trimmed(20)
    .regex(/^G-[A-Z0-9]+$/, "Formato esperado: G-XXXXXXXXXX")
    .or(z.literal(""))
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  metaPixelId: trimmed(20)
    .regex(/^\d{10,20}$/, "O ID do Pixel é só números")
    .or(z.literal(""))
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

// ─── Pedido (rota pública) ───────────────────────────────────────────────────

export const orderCreateSchema = z
  .object({
    fulfillment: z.enum(["DELIVERY", "PICKUP"]),

    customerName: trimmed(120).min(2, "Informe seu nome"),
    customerPhone: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length === 10 || v.length === 11, "Telefone inválido"),

    // Endereço — exigido só quando for entrega (ver superRefine abaixo)
    street: optionalText(160),
    number: optionalText(20),
    complement: optionalText(80),
    neighborhood: optionalText(100),
    reference: optionalText(160),
    deliveryZoneId: z.string().uuid().optional().nullable(),

    paymentMethodId: z.string().uuid("Selecione a forma de pagamento"),
    changeForCents: cents.optional().nullable(),

    notes: optionalText(500),

    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.coerce.number().int().min(1).max(99),
        }),
      )
      .min(1, "O carrinho está vazio")
      .max(60, "Pedido grande demais — fale com o atendente"),
  })
  .superRefine((order, ctx) => {
    if (order.fulfillment !== "DELIVERY") return;
    // O bairro vem sempre da lista cadastrada no painel — é ele que define a taxa.
    for (const field of ["street", "number", "deliveryZoneId"] as const) {
      if (!order[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Obrigatório para entrega",
        });
      }
    }
  });

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

// ─── Pedido (painel) ─────────────────────────────────────────────────────────

export const orderStatusSchema = z.object({
  status: z.enum([
    "AWAITING_CONFIRMATION",
    "CONFIRMED",
    "PREPARING",
    "OUT_FOR_DELIVERY",
    "READY_FOR_PICKUP",
    "DELIVERED",
    "CANCELED",
  ]),
  canceledReason: optionalText(300),
});

// ─── Helper de resposta ──────────────────────────────────────────────────────

import { NextResponse } from "next/server";

/** Converte um erro do zod em 422 com os erros por campo. */
export function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: "Dados inválidos", fieldErrors: error.flatten().fieldErrors },
    { status: 422 },
  );
}

/** Faz o parse do corpo JSON com tolerância a body vazio/malformado. */
export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
