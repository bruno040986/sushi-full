"use client";

import { Bike, ChevronDown, Search, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  EmptyState,
  Notice,
  PageHeader,
  Select,
  inputClass,
} from "@/components/admin/ui";
import { api } from "@/lib/apiClient";
import { formatBRL, formatPhone } from "@/lib/money";

type OrderStatus =
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "READY_FOR_PICKUP"
  | "DELIVERED"
  | "CANCELED";

type Order = {
  id: string;
  code: string;
  status: OrderStatus;
  fulfillment: "DELIVERY" | "PICKUP";
  customerName: string;
  customerPhone: string;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  reference: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  freeDeliveryApplied: boolean;
  paymentMethodName: string;
  changeForCents: number | null;
  changeDueCents: number | null;
  notes: string | null;
  createdAt: string;
  items: { nameSnapshot: string; quantity: number; lineTotalCents: number }[];
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  AWAITING_CONFIRMATION: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  READY_FOR_PICKUP: "Pronto para retirada",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

const STATUS_TONE: Record<OrderStatus, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  AWAITING_CONFIRMATION: "warning",
  CONFIRMED: "brand",
  PREPARING: "brand",
  OUT_FOR_DELIVERY: "brand",
  READY_FOR_PICKUP: "brand",
  DELIVERED: "success",
  CANCELED: "danger",
};

/** Data e hora no fuso de São Paulo, sem depender do relógio da máquina. */
const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () =>
    api<{ orders: Order[] }>("/api/admin/orders?limit=100")
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "todos" && order.status !== statusFilter) return false;
      if (!query) return true;
      return (
        order.code.includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerPhone.includes(query.replace(/\D/g, ""))
      );
    });
  }, [orders, statusFilter, search]);

  async function changeStatus(order: Order, status: OrderStatus) {
    setBusy(order.id);
    setError(null);
    try {
      await api(`/api/admin/orders/${order.id}`, { method: "PATCH", body: { status } });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar");
    } finally {
      setBusy(null);
    }
  }

  const awaiting = orders.filter((o) => o.status === "AWAITING_CONFIRMATION").length;

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Os pedidos entram como “aguardando confirmação”. Confirme os que chegaram no WhatsApp — só esses contam no faturamento."
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {awaiting > 0 && (
        <div className="mb-4">
          <Notice tone="error">
            {awaiting} pedido{awaiting > 1 ? "s" : ""} aguardando sua confirmação.
          </Notice>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nome ou telefone…"
            aria-label="Buscar pedidos"
            className={`${inputClass} pl-10`}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="max-w-56"
          aria-label="Filtrar por status"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState>
          {orders.length === 0
            ? "Nenhum pedido ainda. Assim que alguém pedir pelo site, aparece aqui."
            : "Nenhum pedido com esse filtro."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => {
            const isOpen = expanded === order.id;
            return (
              <Card key={order.id} className="p-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-mono text-sm font-bold text-brand">#{order.code}</span>

                  {order.fulfillment === "DELIVERY" ? (
                    <Bike className="size-4 shrink-0 text-muted" aria-label="Entrega" />
                  ) : (
                    <Store className="size-4 shrink-0 text-muted" aria-label="Retirada" />
                  )}

                  <div className="min-w-32 flex-1">
                    <p className="font-semibold">{order.customerName}</p>
                    <p className="text-sm text-muted">
                      {formatDateTime(order.createdAt)} · {order.items.length} item
                      {order.items.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>

                  <span className="font-display font-bold tabular-nums">
                    {formatBRL(order.totalCents)}
                  </span>

                  <ChevronDown
                    className={`size-4 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-line p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                          Itens
                        </h3>
                        <ul className="space-y-1 text-sm">
                          {order.items.map((item, index) => (
                            <li key={index} className="flex justify-between gap-3">
                              <span>
                                {item.quantity}× {item.nameSnapshot}
                              </span>
                              <span className="tabular-nums text-muted">
                                {formatBRL(item.lineTotalCents)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                          <Row label="Subtotal" value={formatBRL(order.subtotalCents)} />
                          {order.fulfillment === "DELIVERY" && (
                            <Row
                              label="Entrega"
                              value={
                                order.freeDeliveryApplied
                                  ? "GRÁTIS"
                                  : formatBRL(order.deliveryFeeCents)
                              }
                            />
                          )}
                          <Row label="Total" value={formatBRL(order.totalCents)} strong />
                        </dl>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
                            Cliente
                          </h3>
                          <p>{order.customerName}</p>
                          <a
                            href={`https://wa.me/55${order.customerPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand hover:underline"
                          >
                            {formatPhone(order.customerPhone)}
                          </a>
                        </div>

                        {order.fulfillment === "DELIVERY" && (
                          <div>
                            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
                              Entrega
                            </h3>
                            <p>
                              {order.street}, nº {order.number}
                              {order.complement && ` — ${order.complement}`}
                            </p>
                            <p className="text-muted">
                              {order.neighborhood} · {order.city}/{order.state}
                            </p>
                            {order.reference && (
                              <p className="text-muted">Ref: {order.reference}</p>
                            )}
                          </div>
                        )}

                        <div>
                          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
                            Pagamento
                          </h3>
                          <p>{order.paymentMethodName}</p>
                          {order.changeForCents != null && (
                            <p className="text-muted">
                              Troco para {formatBRL(order.changeForCents)} — levar{" "}
                              {formatBRL(order.changeDueCents ?? 0)}
                            </p>
                          )}
                        </div>

                        {order.notes && (
                          <div>
                            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
                              Observações
                            </h3>
                            <p className="text-muted">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-line pt-4">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted">
                          Mudar status
                        </span>
                        <Select
                          value={order.status}
                          disabled={busy === order.id}
                          onChange={(e) => changeStatus(order, e.target.value as OrderStatus)}
                          className="max-w-64"
                        >
                          {Object.entries(STATUS_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-bold" : ""}`}>{value}</dd>
    </div>
  );
}
