"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageField } from "@/components/admin/ImageField";
import {
  Button,
  Card,
  Field,
  Notice,
  PageHeader,
  Select,
  TextInput,
  Toggle,
  inputClass,
  type FieldErrors,
} from "@/components/admin/ui";
import { ApiError, api } from "@/lib/apiClient";
import { formatCents, parseBRLToCents } from "@/lib/money";

type Category = { id: string; name: string };

type ProductPayload = {
  name: string;
  code: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  priceCents: number;
  imageUrl: string | null;
  categoryId: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
};

type Existing = ProductPayload & { id: string };

const EMPTY: ProductPayload = {
  name: "",
  code: null,
  shortDescription: null,
  longDescription: null,
  priceCents: 0,
  imageUrl: null,
  categoryId: "",
  active: true,
  featured: false,
  sortOrder: 0,
};

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(productId);

  const [form, setForm] = useState<ProductPayload>(EMPTY);
  const [priceText, setPriceText] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    async function load() {
      try {
        const [{ categories }, product] = await Promise.all([
          api<{ categories: Category[] }>("/api/admin/categories"),
          productId
            ? api<{ product: Existing }>(`/api/admin/products/${productId}`).then((d) => d.product)
            : Promise.resolve(null),
        ]);

        setCategories(categories);

        if (product) {
          setForm({ ...product });
          setPriceText(formatCents(product.priceCents));
        } else if (categories.length > 0) {
          setForm((current) => ({ ...current, categoryId: categories[0].id }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [productId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const priceCents = parseBRLToCents(priceText) ?? 0;

    try {
      if (isEditing) {
        await api(`/api/admin/products/${productId}`, {
          method: "PATCH",
          body: { ...form, priceCents },
        });
      } else {
        await api("/api/admin/products", { method: "POST", body: { ...form, priceCents } });
      }
      router.push("/admin/produtos");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError("Não foi possível salvar");
      }
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${form.name}" do cardápio? Esta ação não pode ser desfeita.`)) return;

    setDeleting(true);
    setError(null);
    try {
      await api(`/api/admin/products/${productId}`, { method: "DELETE" });
      router.push("/admin/produtos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir");
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <Link
        href="/admin/produtos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-cream"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar aos produtos
      </Link>

      <PageHeader title={isEditing ? "Editar produto" : "Novo produto"} />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card className="space-y-4">
            <Field label="Nome" error={fieldErrors.name}>
              <TextInput
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                error={fieldErrors.name}
                required
                autoFocus
                placeholder="Ex: Combo 3 — 28 peças"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <Field label="Categoria" error={fieldErrors.categoryId}>
                <Select
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  error={fieldErrors.categoryId}
                  required
                >
                  <option value="">Selecione…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Código do cardápio"
                optional
                hint="O número impresso, usado pela cozinha"
                error={fieldErrors.code}
              >
                <TextInput
                  value={form.code ?? ""}
                  onChange={(e) => set("code", e.target.value || null)}
                  error={fieldErrors.code}
                  placeholder="0064"
                />
              </Field>
            </div>

            <Field
              label="Preço"
              hint="Digite como fala: 49,00"
              error={fieldErrors.priceCents}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  R$
                </span>
                <TextInput
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  error={fieldErrors.priceCents}
                  inputMode="decimal"
                  required
                  placeholder="49,00"
                  className="pl-10"
                />
              </div>
            </Field>

            <Field
              label="Descrição curta"
              optional
              hint={`Aparece no card do cardápio · ${(form.shortDescription ?? "").length}/140`}
              error={fieldErrors.shortDescription}
            >
              <TextInput
                value={form.shortDescription ?? ""}
                onChange={(e) => set("shortDescription", e.target.value || null)}
                error={fieldErrors.shortDescription}
                maxLength={140}
                placeholder="6 sashimis de salmão, niguiris e hots philadelphia."
              />
            </Field>

            <Field
              label="Descrição completa"
              optional
              hint="Aparece ao abrir o item. Uma linha por ingrediente funciona bem."
              error={fieldErrors.longDescription}
            >
              <textarea
                value={form.longDescription ?? ""}
                onChange={(e) => set("longDescription", e.target.value || null)}
                rows={6}
                maxLength={2000}
                className={`${inputClass} resize-y`}
                placeholder={"6 sashimis de salmão\n4 niguiris de salmão\n6 hots philadelphia"}
              />
            </Field>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4">
            <ImageField
              value={form.imageUrl}
              onChange={(url) => set("imageUrl", url)}
              hint="Sem foto própria, o item usa a foto da categoria."
            />
          </Card>

          <Card className="space-y-4">
            <Toggle
              checked={form.active}
              onChange={(value) => set("active", value)}
              label="No cardápio"
              hint="Desmarcado, o item some do site"
            />
            <Toggle
              checked={form.featured}
              onChange={(value) => set("featured", value)}
              label="Destaque na home"
              hint="Entra no carrossel da página inicial"
            />
            <Field label="Ordem" hint="Menor aparece primeiro na categoria">
              <TextInput
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
              />
            </Field>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" loading={saving} className="w-full">
              {isEditing ? "Salvar alterações" : "Cadastrar produto"}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="danger"
                loading={deleting}
                onClick={handleDelete}
                className="w-full"
              >
                <Trash2 className="size-4" aria-hidden />
                Excluir produto
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
