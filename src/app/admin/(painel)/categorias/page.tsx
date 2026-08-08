"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CsvImport, type ImportSpec } from "@/components/admin/CsvImport";
import { ImageField } from "@/components/admin/ImageField";
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

type Category = {
  id: string;
  name: string;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  _count: { products: number };
};

const IMPORT_CATEGORIES: ImportSpec = {
  action: "Importar categorias",
  title: "Cadastro em lote de categorias",
  description:
    "Cadastre e atualize categorias de uma vez. A coluna foto_url é a foto de reserva dos itens sem foto própria.",
  endpoint: "/api/admin/categories/import",
  templates: [
    {
      href: "/api/admin/categories/export",
      label: "Planilha de categorias",
      hint: "Todas as categorias cadastradas",
    },
  ],
  columns: "id · nome · foto_url · ativo · ordem",
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () =>
    api<{ categories: Category[] }>("/api/admin/categories")
      .then((data) => setCategories(data.categories))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  async function toggleActive(category: Category) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        body: { active: !category.active },
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: Category) {
    if (!confirm(`Excluir a categoria "${category.name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Categorias"
        description="A foto da categoria é usada pelos itens que não têm foto própria."
        action={
          <div className="flex flex-wrap gap-2">
            <CsvImport spec={IMPORT_CATEGORIES} onApplied={reload} />
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Nova categoria
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <CategoryForm
            category={editing === "new" ? null : editing}
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
      ) : categories.length === 0 ? (
        <EmptyState>Nenhuma categoria cadastrada.</EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center gap-3 p-3 sm:gap-4">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {category.imageUrl && (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-32 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{category.name}</span>
                    {!category.active && <Badge tone="danger">Inativa</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {category._count.products} produto
                    {category._count.products === 1 ? "" : "s"} · ordem {category.sortOrder}
                  </p>
                </div>

                <div className="w-24">
                  <Toggle
                    checked={category.active}
                    onChange={() => toggleActive(category)}
                    label={category.active ? "Visível" : "Oculta"}
                    disabled={busy}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-brand"
                  aria-label={`Editar ${category.name}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(category)}
                  disabled={busy}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-danger"
                  aria-label={`Excluir ${category.name}`}
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

function CategoryForm({
  category,
  onDone,
  onCancel,
}: {
  category: Category | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? null);
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [active, setActive] = useState(category?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { name, imageUrl, sortOrder, active };
      if (category) {
        await api(`/api/admin/categories/${category.id}`, { method: "PATCH", body });
      } else {
        await api("/api/admin/categories", { method: "POST", body });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="font-display font-bold">
          {category ? `Editar ${category.name}` : "Nova categoria"}
        </h2>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Nome">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Ex: Temaki"
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

        <ImageField
          label="Foto de reserva"
          value={imageUrl}
          onChange={setImageUrl}
          hint="Exibida nos itens desta categoria que não têm foto própria."
        />

        <Toggle checked={active} onChange={setActive} label="Categoria visível no cardápio" />

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
