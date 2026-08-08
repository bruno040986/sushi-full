"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Notice,
  PageHeader,
  TextInput,
  Toggle,
} from "@/components/admin/ui";
import { api } from "@/lib/apiClient";

type PaymentMethod = {
  id: string;
  name: string;
  isCash: boolean;
  active: boolean;
  sortOrder: number;
};

export default function FormasPagamentoPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PaymentMethod | "new" | null>(null);

  const reload = () =>
    api<{ paymentMethods: PaymentMethod[] }>("/api/admin/payment-methods")
      .then((data) => setMethods(data.paymentMethods))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  async function toggleActive(method: PaymentMethod) {
    setError(null);
    try {
      await api(`/api/admin/payment-methods/${method.id}`, {
        method: "PATCH",
        body: { active: !method.active },
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  async function remove(method: PaymentMethod) {
    if (!confirm(`Excluir a forma de pagamento "${method.name}"?`)) return;
    setError(null);
    try {
      await api(`/api/admin/payment-methods/${method.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir");
    }
  }

  return (
    <>
      <PageHeader
        title="Formas de pagamento"
        description="O que aparece na hora de fechar o pedido."
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden />
            Nova forma
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <MethodForm
            method={editing === "new" ? null : editing}
            onDone={async () => {
              setEditing(null);
              await reload();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {loading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : methods.length === 0 ? (
        <EmptyState>
          Nenhuma forma cadastrada. Sem pelo menos uma, ninguém consegue fechar o pedido.
        </EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {methods.map((method) => (
              <li key={method.id} className="flex flex-wrap items-center gap-3 p-3 sm:gap-4">
                <div className="min-w-32 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{method.name}</span>
                    {method.isCash && <Badge tone="brand">Pede troco</Badge>}
                    {!method.active && <Badge tone="danger">Inativa</Badge>}
                  </div>
                  <p className="text-sm text-muted">ordem {method.sortOrder}</p>
                </div>

                <div className="w-24">
                  <Toggle
                    checked={method.active}
                    onChange={() => toggleActive(method)}
                    label={method.active ? "Aceita" : "Fora"}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(method)}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-brand"
                  aria-label={`Editar ${method.name}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(method)}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-danger"
                  aria-label={`Excluir ${method.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function MethodForm({
  method,
  onDone,
  onCancel,
}: {
  method: PaymentMethod | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(method?.name ?? "");
  const [isCash, setIsCash] = useState(method?.isCash ?? false);
  const [active, setActive] = useState(method?.active ?? true);
  const [sortOrder, setSortOrder] = useState(method?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { name, isCash, active, sortOrder };
      if (method) await api(`/api/admin/payment-methods/${method.id}`, { method: "PATCH", body });
      else await api("/api/admin/payment-methods", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <Field label="Nome">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Ex: Pix"
            />
          </Field>
          <Field label="Ordem" hint="Menor primeiro">
            <TextInput
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </Field>
        </div>

        <Toggle
          checked={isCash}
          onChange={setIsCash}
          label="É dinheiro em espécie"
          hint='Ativa o campo "troco para quanto?" no checkout'
        />
        <Toggle checked={active} onChange={setActive} label="Aceitamos esta forma" />

        <div className="flex gap-2">
          <Button type="submit" loading={saving}>
            <Check className="size-4" aria-hidden />
            Salvar
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X className="size-4" aria-hidden />
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
