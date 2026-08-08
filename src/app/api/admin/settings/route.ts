import { NextResponse } from "next/server";
import { isValidCnpj, onlyDigits } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSettings } from "@/lib/store";
import { parseJson, settingsUpdateSchema, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  return NextResponse.json({ settings: await getSettings() });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = settingsUpdateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const data = { ...parsed.data };

  const fieldErrors: Record<string, string[]> = {};

  // CNPJ é opcional, mas se vier tem que ser válido — dígito verificador e tudo.
  if (data.cnpj) {
    if (!isValidCnpj(data.cnpj)) {
      fieldErrors.cnpj = ["CNPJ inválido"];
    } else {
      data.cnpj = onlyDigits(data.cnpj);
    }
  }

  // Faixa de previsão de entrega precisa fazer sentido
  const current = await getSettings();
  const etaMin = data.deliveryEtaMinMinutes ?? current.deliveryEtaMinMinutes;
  const etaMax = data.deliveryEtaMaxMinutes ?? current.deliveryEtaMaxMinutes;
  if (etaMin > etaMax) {
    fieldErrors.deliveryEtaMaxMinutes = ["A previsão máxima precisa ser maior que a mínima"];
  }

  // Não dá para desligar entrega e retirada ao mesmo tempo: ninguém pediria nada.
  const deliveryEnabled = data.deliveryEnabled ?? current.deliveryEnabled;
  const pickupEnabled = data.pickupEnabled ?? current.pickupEnabled;
  if (!deliveryEnabled && !pickupEnabled) {
    fieldErrors.deliveryEnabled = ["Mantenha ao menos entrega ou retirada habilitada"];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Dados inválidos", fieldErrors }, { status: 422 });
  }

  const settings = await prisma.storeSettings.update({ where: { id: "singleton" }, data });
  return NextResponse.json({ settings });
}
