import { NextResponse } from "next/server";
import { getStorefrontData } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Tudo que o carrinho precisa numa chamada: configurações, horários, bairros,
 * formas de pagamento e o status aberto/fechado com a hora do servidor.
 */
export async function GET() {
  const data = await getStorefrontData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
