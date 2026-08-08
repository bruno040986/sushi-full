import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getDashboardStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  return NextResponse.json(await getDashboardStats());
}
