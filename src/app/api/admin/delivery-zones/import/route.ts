import { NextResponse } from "next/server";
import {
  csvToBoolean,
  csvToCents,
  csvToInt,
  parseCsv,
  type ImportIssue,
} from "@/lib/csv";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

type ZoneData = {
  name: string;
  feeCents: number;
  freeDelivery: boolean;
  freeDeliveryThresholdCents: number | null;
  etaMinutes: number | null;
  active: boolean;
  sortOrder: number;
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const cityKey = (name: string, state: string) => `${normalize(name)}|${state.toUpperCase()}`;

/**
 * Importa bairros em lote — cadastro e atualização usam a mesma planilha.
 *
 * O sistema compara linha a linha com o banco: o que está diferente é
 * atualizado, o que está igual é ignorado. Cidade que ainda não existe é
 * criada junto, para o dono não precisar cadastrar antes.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await parseJson(request)) as { csv?: string; apply?: boolean } | null;
  if (!body?.csv?.trim()) {
    return NextResponse.json({ error: "Envie o conteúdo do arquivo" }, { status: 422 });
  }

  const rows = parseCsv(body.csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "A planilha está vazia" }, { status: 422 });
  }

  const [zones, cities] = await Promise.all([
    prisma.deliveryZone.findMany({ include: { city: { select: { name: true, state: true } } } }),
    prisma.serviceCity.findMany(),
  ]);

  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const zoneByNameCity = new Map(
    zones.map((z) => [`${normalize(z.name)}|${cityKey(z.city.name, z.city.state)}`, z]),
  );
  const cityByKey = new Map(cities.map((c) => [cityKey(c.name, c.state), c]));

  const errors: ImportIssue[] = [];
  const pendingCities = new Map<string, { name: string; state: string }>();
  const create: { line: number; label: string; detail: string; cityKey: string; data: ZoneData }[] =
    [];
  const update: {
    line: number;
    id: string;
    label: string;
    detail: string;
    cityKey: string;
    data: ZoneData;
  }[] = [];
  let unchanged = 0;

  rows.forEach((row, index) => {
    const line = index + 2;
    const fail = (message: string) => errors.push({ line, message });

    const name = (row.bairro ?? "").trim();
    const cityName = (row.cidade ?? "").trim();
    const state = (row.uf ?? "").trim().toUpperCase();

    const existing = row.id?.trim() ? zoneById.get(row.id.trim()) : undefined;

    if (!existing && !name) {
      fail("Bairro novo sem a coluna `bairro`");
      return;
    }
    if (!existing && (!cityName || !state)) {
      fail("Bairro novo precisa de `cidade` e `uf`");
      return;
    }
    if (state && !/^[A-Z]{2}$/.test(state)) {
      fail(`UF inválida: "${row.uf}" — use a sigla de 2 letras`);
      return;
    }

    // ─── Cidade ─────────────────────────────────────────────────────────────
    let key: string;
    if (cityName && state) {
      key = cityKey(cityName, state);
      if (!cityByKey.has(key)) pendingCities.set(key, { name: cityName, state });
    } else {
      key = cityKey(existing!.city.name, existing!.city.state);
    }

    // ─── Valores ────────────────────────────────────────────────────────────
    const feeCents = csvToCents(row.taxa_entrega ?? "");
    if (feeCents === undefined) {
      fail(`Taxa de entrega inválida: "${row.taxa_entrega}"`);
      return;
    }

    const threshold = csvToCents(row.frete_gratis_acima_de ?? "");
    if (threshold === undefined) {
      fail(`"Frete grátis acima de" inválido: "${row.frete_gratis_acima_de}"`);
      return;
    }

    const eta = csvToInt(row.previsao_min ?? "");
    if (eta === undefined) {
      fail(`Previsão inválida: "${row.previsao_min}"`);
      return;
    }

    const sortOrder = csvToInt(row.ordem ?? "");
    if (sortOrder === undefined) {
      fail(`Ordem inválida: "${row.ordem}"`);
      return;
    }

    const finalFee = feeCents ?? existing?.feeCents;
    if (finalFee == null) {
      fail("Bairro novo sem `taxa_entrega`");
      return;
    }

    const data: ZoneData = {
      name: name || existing!.name,
      feeCents: finalFee,
      freeDelivery: csvToBoolean(row.frete_sempre_gratis ?? "", existing?.freeDelivery ?? false),
      freeDeliveryThresholdCents: threshold ?? existing?.freeDeliveryThresholdCents ?? null,
      etaMinutes: eta ?? existing?.etaMinutes ?? null,
      active: csvToBoolean(row.entregamos ?? "", existing?.active ?? true),
      sortOrder: sortOrder ?? existing?.sortOrder ?? 0,
    };

    // Sem id na planilha, tenta casar por bairro + cidade
    const matched = existing ?? zoneByNameCity.get(`${normalize(data.name)}|${key}`);

    if (!matched) {
      create.push({
        line,
        label: `${data.name} — ${cityName}/${state}`,
        detail: data.freeDelivery ? "frete grátis" : formatBRL(data.feeCents),
        cityKey: key,
        data,
      });
      return;
    }

    const currentKey = cityKey(matched.city.name, matched.city.state);
    const changed =
      data.name !== matched.name ||
      data.feeCents !== matched.feeCents ||
      data.freeDelivery !== matched.freeDelivery ||
      data.freeDeliveryThresholdCents !== matched.freeDeliveryThresholdCents ||
      data.etaMinutes !== matched.etaMinutes ||
      data.active !== matched.active ||
      data.sortOrder !== matched.sortOrder ||
      key !== currentKey;

    if (!changed) {
      unchanged++;
      return;
    }

    update.push({
      line,
      id: matched.id,
      label: `${data.name} — ${matched.city.name}/${matched.city.state}`,
      detail: describeChange(matched, data),
      cityKey: key,
      data,
    });
  });

  const preview = {
    create: create.map(({ line, label, detail }) => ({ line, label, detail })),
    update: update.map(({ line, label, detail }) => ({ line, label, detail })),
    unchanged,
    errors,
    newCities: [...pendingCities.values()].map((c) => `${c.name}/${c.state}`),
  };

  if (!body.apply) return NextResponse.json(preview);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Corrija os erros da planilha antes de importar", ...preview },
      { status: 422 },
    );
  }

  for (const [key, city] of pendingCities) {
    const created = await prisma.serviceCity.create({
      data: { name: city.name, state: city.state, sortOrder: cities.length + 1 },
    });
    cityByKey.set(key, created);
  }

  for (const row of create) {
    await prisma.deliveryZone.create({
      data: { ...row.data, cityId: cityByKey.get(row.cityKey)!.id },
    });
  }

  for (const row of update) {
    await prisma.deliveryZone.update({
      where: { id: row.id },
      data: { ...row.data, cityId: cityByKey.get(row.cityKey)!.id },
    });
  }

  return NextResponse.json({ ...preview, applied: true });
}

function describeChange(
  current: { feeCents: number; active: boolean; etaMinutes: number | null },
  next: ZoneData,
): string {
  const parts: string[] = [];
  if (next.feeCents !== current.feeCents) {
    parts.push(`taxa ${formatBRL(current.feeCents)} → ${formatBRL(next.feeCents)}`);
  }
  if (next.etaMinutes !== current.etaMinutes) {
    parts.push(`previsão ${current.etaMinutes ?? "—"} → ${next.etaMinutes ?? "—"} min`);
  }
  if (next.active !== current.active) parts.push(next.active ? "reativado" : "desativado");
  return parts.length > 0 ? parts.join(" · ") : "outros campos";
}
