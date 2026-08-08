"use client";

import { MessageCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  Select,
  inputClass,
} from "@/components/admin/ui";
import { api } from "@/lib/apiClient";
import { formatBRL, formatPhone } from "@/lib/money";

type Customer = {
  id: string;
  name: string;
  phone: string;
  lastStreet: string | null;
  lastNumber: string | null;
  lastNeighborhood: string | null;
  ordersCount: number;
  totalSpentCents: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
};

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(new Date(iso))
    : "—";

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "spent">("recent");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ sort: sort === "spent" ? "spent" : "recent" });
      if (search.trim()) params.set("q", search.trim());

      api<{ customers: Customer[] }>(`/api/admin/customers?${params}`, {
        signal: controller.signal,
      })
        .then((data) => setCustomers(data.customers))
        .catch((err) => {
          if (err.name !== "AbortError") setError(err.message);
        })
        .finally(() => setLoading(false));
    }, 250); // espera o usuário parar de digitar

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, sort]);

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Consolidados pelo telefone. Estes dados nunca são expostos no site — só aqui dentro."
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
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
            placeholder="Buscar por nome ou telefone…"
            aria-label="Buscar clientes"
            className={`${inputClass} pl-10`}
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="max-w-56"
          aria-label="Ordenar"
        >
          <option value="recent">Pedido mais recente</option>
          <option value="spent">Quem mais gastou</option>
        </Select>
      </div>

      {loading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : customers.length === 0 ? (
        <EmptyState>
          Nenhum cliente ainda. O cadastro é criado sozinho no primeiro pedido.
        </EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {customers.map((customer) => (
              <li key={customer.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-sm text-muted">
                    {formatPhone(customer.phone)}
                    {customer.lastNeighborhood && ` · ${customer.lastNeighborhood}`}
                  </p>
                  {customer.lastStreet && (
                    <p className="text-xs text-faint">
                      {customer.lastStreet}
                      {customer.lastNumber && `, ${customer.lastNumber}`}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-display font-bold tabular-nums">
                    {formatBRL(customer.totalSpentCents)}
                  </p>
                  <p className="text-sm text-muted">
                    {customer.ordersCount} pedido{customer.ordersCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="hidden w-28 text-right text-xs text-muted sm:block">
                  <p>último</p>
                  <p>{formatDate(customer.lastOrderAt)}</p>
                </div>

                <a
                  href={`https://wa.me/55${customer.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-whats"
                  aria-label={`Conversar com ${customer.name} no WhatsApp`}
                >
                  <MessageCircle className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
