import { NextResponse } from "next/server";
import { getMenu } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Cardápio público. `getMenu` filtra `active` em categoria e produto — produto
 * desativado no painel não aparece aqui nem no site.
 */
export async function GET() {
  const categories = await getMenu();
  return NextResponse.json({ categories });
}
