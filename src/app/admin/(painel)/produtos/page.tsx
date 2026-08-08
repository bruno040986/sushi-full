"use client";

import { Pencil, Plus, Search, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CsvImport, type ImportSpec } from "@/components/admin/CsvImport";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Notice,
  PageHeader,
  Select,
  Toggle,
  inputClass,
} from "@/components/admin/ui";
import { api } from "@/lib/apiClient";
import { formatBRL } from "@/lib/money";

type AdminProduct = {
  id: string;
  name: string;
  code: string | null;
  priceCents: number;
  imageUrl: string | null;
  active: boolean;
  featured: boolean;
  category: { id: string; name: string };
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const IMPORT_PRODUCTS: ImportSpec = {
  action: "Importar produtos",
  title: "Cadastro em lote de produtos",
  description:
    "Cadastre novos itens e atualize os existentes de uma vez. A coluna foto_url \u00e9 opcional \u2014 sem ela o item sobe sem foto e usa a da categoria.",
  endpoint: "/api/admin/products/import",
  templates: [
    {
      href: "/api/admin/products/export",
      label: "Planilha de produtos",
      hint: "Todos os itens cadastrados, com todas as colunas",
    },
  ],
  columns: "id \u00b7 codigo \u00b7 nome \u00b7 categoria \u00b7 preco \u00b7 descricao_curta \u00b7 descricao_completa \u00b7 foto_url \u00b7 ativo \u00b7 destaque \u00b7 ordem",
};

const IMPORT_PRICES: ImportSpec = {
  action: "Reajustar pre\u00e7os",
  title: "Reajuste de pre\u00e7os em lote",
  description:
    "Baixe a planilha, preencha a coluna preco_novo s\u00f3 onde quiser mudar e envie de volta. Linha em branco n\u00e3o \u00e9 alterada.",
  endpoint: "/api/admin/products/import-prices",
  templates: [
    {
      href: "/api/admin/products/export?tipo=precos",
      label: "Planilha de pre\u00e7os",
      hint: "Pre\u00e7o atual preenchido e coluna do novo em branco",
    },
  ],
  columns: "id \u00b7 codigo \u00b7 nome \u00b7 categoria \u00b7 preco_atual \u00b7 preco_novo",
};

export default function ProdutosPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [saving, setSaving] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      api<{ products: AdminProduct[] }>("/api/admin/products")
        .then((data) => setProducts(data.products))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) map.set(product.category.id, product.category.name);
    return [...map].map(([id, name]) => ({ id, name }));
  }, [products]);

  const visible = useMemo(() => {
    const query = normalize(search.trim());
    return products.filter((product) => {
      if (categoryFilter !== "todas" && product.category.id !== categoryFilter) return false;
      if (!query) return true;
      return (
        normalize(product.name).includes(query) || (product.code ?? "").includes(query)
      );
    });
  }, [products, search, categoryFilter]);

  /** Alterna ativo/destaque direto na lista, sem abrir o formulário. */
  async function patch(id: string, data: Partial<Pick<AdminProduct, "active" | "featured">>) {
    setSaving(id);
    setError(null);
    // Otimista: a lista responde na hora e volta atrás se a API recusar
    const previous = products;
    setProducts((current) => current.map((p) => (p.id === id ? { ...p, ...data } : p)));
    try {
      await api(`/api/admin/products/${id}`, { method: "PATCH", body: data });
    } catch (err) {
      setProducts(previous);
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Produtos"
        description={`${products.length} itens no cardápio`}
        action={
          <div className="flex flex-wrap gap-2">
            <CsvImport spec={IMPORT_PRICES} onApplied={reload} />
            <CsvImport spec={IMPORT_PRODUCTS} onApplied={reload} />
            <Link href="/admin/produtos/novo">
              <Button>
                <Plus className="size-4" aria-hidden />
                Novo produto
              </Button>
            </Link>
          </div>
        }
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
            placeholder="Buscar por nome ou código…"
            aria-label="Buscar produtos"
            className={`${inputClass} pl-10`}
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="max-w-56"
          aria-label="Filtrar por categoria"
        >
          <option value="todas">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <EmptyState>Carregando…</EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState>Nenhum produto encontrado.</EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {visible.map((product) => (
              <li key={product.id} className="flex flex-wrap items-center gap-3 p-3 sm:gap-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-40 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{product.name}</span>
                    {product.code && (
                      <span className="font-mono text-xs text-faint">{product.code}</span>
                    )}
                    {!product.active && <Badge tone="danger">Inativo</Badge>}
                  </div>
                  <p className="text-sm text-muted">{product.category.name}</p>
                </div>

                <span className="font-display font-bold text-brand tabular-nums">
                  {formatBRL(product.priceCents)}
                </span>

                <button
                  type="button"
                  onClick={() => patch(product.id, { featured: !product.featured })}
                  disabled={saving === product.id}
                  title={product.featured ? "Tirar dos destaques" : "Destacar na home"}
                  aria-label={product.featured ? "Tirar dos destaques" : "Destacar na home"}
                  className={`rounded-lg p-2 transition ${
                    product.featured
                      ? "text-accent hover:bg-surface-2"
                      : "text-faint hover:bg-surface-2 hover:text-accent"
                  }`}
                >
                  <Star
                    className="size-4"
                    fill={product.featured ? "currentColor" : "none"}
                    aria-hidden
                  />
                </button>

                <div className="w-28">
                  <Toggle
                    checked={product.active}
                    onChange={(active) => patch(product.id, { active })}
                    label={product.active ? "No cardápio" : "Fora"}
                    disabled={saving === product.id}
                  />
                </div>

                <Link
                  href={`/admin/produtos/${product.id}`}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-brand"
                  aria-label={`Editar ${product.name}`}
                >
                  <Pencil className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
