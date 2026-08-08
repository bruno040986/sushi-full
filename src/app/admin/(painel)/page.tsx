import { ArrowRight, Bell, ChefHat, TrendingUp, UsersRound } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { getStoreStatus } from "@/lib/hours";
import { formatBRL } from "@/lib/money";
import { getDashboardStats } from "@/lib/stats";
import { getOpeningHours, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, settings, hours] = await Promise.all([
    getDashboardStats(),
    getSettings(),
    getOpeningHours(),
  ]);
  const status = getStoreStatus(hours, new Date(), settings.timezone);

  return (
    <>
      <PageHeader
        title="Visão geral"
        description="O resumo do dia e o que precisa da sua atenção."
      />

      {/* Estado da loja */}
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`size-3 rounded-full ${
              status.isOpen && settings.ordersEnabled
                ? "bg-success"
                : status.isOpen
                  ? "bg-warning"
                  : "bg-danger"
            }`}
            aria-hidden
          />
          <div>
            <p className="font-semibold">
              {!settings.ordersEnabled
                ? "Pedidos pausados"
                : status.isOpen
                  ? "Aberto — recebendo pedidos"
                  : "Fechado"}
            </p>
            <p className="text-sm text-muted">
              {settings.ordersEnabled
                ? (status.nextOpen?.label ?? "Dentro do horário de funcionamento")
                : "O botão de pedido está desativado no site, mesmo dentro do horário."}
            </p>
          </div>
        </div>
        <Link
          href="/admin/horarios"
          className="text-sm font-semibold text-brand transition hover:text-brand-soft"
        >
          Ajustar horários →
        </Link>
      </Card>

      {/* Pedidos aguardando */}
      {stats.awaiting > 0 && (
        <Link href="/admin/pedidos?status=AWAITING_CONFIRMATION" className="mb-6 block">
          <Card className="flex items-center gap-4 border-warning/40 bg-warning/5 transition hover:border-warning">
            <Bell className="size-6 shrink-0 text-warning" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold text-warning">
                {stats.awaiting} pedido{stats.awaiting > 1 ? "s" : ""} aguardando confirmação
              </p>
              <p className="text-sm text-muted">
                Confirme os que chegaram no WhatsApp — só eles entram no faturamento.
              </p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-warning" aria-hidden />
          </Card>
        </Link>
      )}

      {/* Números */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Faturamento de hoje"
          value={formatBRL(stats.today.revenueCents)}
          hint={`${stats.today.orders} pedido${stats.today.orders === 1 ? "" : "s"}`}
          Icon={TrendingUp}
        />
        <Stat
          label="Em preparo agora"
          value={String(stats.inProgress)}
          hint="Confirmados e ainda não entregues"
          Icon={ChefHat}
        />
        <Stat
          label="Ticket médio (30 dias)"
          value={formatBRL(stats.last30Days.averageTicketCents)}
          hint={`${stats.last30Days.orders} pedidos · ${formatBRL(stats.last30Days.revenueCents)}`}
          Icon={TrendingUp}
        />
        <Stat
          label="Clientes cadastrados"
          value={String(stats.customers)}
          hint="Consolidados por telefone"
          Icon={UsersRound}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mais vendidos */}
        <Card>
          <h2 className="mb-4 font-display font-bold">Mais vendidos (30 dias)</h2>
          {stats.topSellers.length === 0 ? (
            <EmptyState>Ainda não há pedidos confirmados no período.</EmptyState>
          ) : (
            <ol className="space-y-2.5">
              {stats.topSellers.map((item, index) => (
                <li key={item.name} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {item.quantity}x
                  </span>
                  <span className="w-20 shrink-0 text-right text-sm text-muted tabular-nums">
                    {formatBRL(item.revenueCents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Atalhos */}
        <Card>
          <h2 className="mb-4 font-display font-bold">Cardápio</h2>
          <div className="mb-4 flex items-center gap-3">
            <span className="font-display text-3xl font-black">{stats.catalog.total}</span>
            <div className="text-sm text-muted">
              <p>itens cadastrados</p>
              {stats.catalog.inactive > 0 && (
                <Badge tone="warning">{stats.catalog.inactive} inativos</Badge>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { href: "/admin/produtos", label: "Gerenciar produtos" },
              { href: "/admin/categorias", label: "Categorias" },
              { href: "/admin/entrega", label: "Bairros e frete" },
              { href: "/admin/configuracoes", label: "Dados do negócio" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium transition hover:border-brand hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string;
  hint: string;
  Icon: typeof TrendingUp;
}) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        <Icon className="size-4 text-faint" aria-hidden />
      </div>
      <p className="font-display text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Card>
  );
}
