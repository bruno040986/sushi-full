"use client";

import { AlertTriangle, Check, Download, FileUp, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, Button, Notice } from "@/components/admin/ui";
import { ApiError, api } from "@/lib/apiClient";

type PreviewRow = { line: number; label: string; detail: string };

type Preview = {
  create: PreviewRow[];
  update: PreviewRow[];
  unchanged: number;
  errors: { line: number; message: string }[];
  newCategories?: string[];
  newCities?: string[];
  applied?: boolean;
};

export type ImportSpec = {
  /** Rótulo do botão que abre o diálogo */
  action: string;
  title: string;
  description: string;
  /** Rota que recebe { csv, apply } */
  endpoint: string;
  /** Links de modelo para baixar antes de subir */
  templates: { href: string; label: string; hint: string }[];
  columns: string;
};

/**
 * Importação de planilha em duas etapas: primeiro mostra o que vai acontecer,
 * só depois grava. Subir CSV direto por cima de um cardápio inteiro é jeito
 * fácil de estragar dado sem perceber.
 */
export function CsvImport({ spec, onApplied }: { spec: ImportSpec; onApplied: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <FileUp className="size-4" aria-hidden />
        {spec.action}
      </Button>
      {open && (
        <ImportDialog
          spec={spec}
          onClose={() => setOpen(false)}
          onApplied={() => {
            setOpen(false);
            onApplied();
          }}
        />
      )}
    </>
  );
}

function ImportDialog({
  spec,
  onClose,
  onApplied,
}: {
  spec: ImportSpec;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [csv, setCsv] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyse(file: File) {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const text = await file.text();
      setCsv(text);
      setFilename(file.name);
      setPreview(await api<Preview>(spec.endpoint, { method: "POST", body: { csv: text } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ler a planilha");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!csv) return;
    setBusy(true);
    setError(null);
    try {
      await api(spec.endpoint, { method: "POST", body: { csv, apply: true } });
      onApplied();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Não foi possível importar");
      setBusy(false);
    }
  }

  const totalChanges = (preview?.create.length ?? 0) + (preview?.update.length ?? 0);
  const hasErrors = (preview?.errors.length ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={spec.title}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-black">{spec.title}</h2>
            <p className="mt-1 text-sm text-muted">{spec.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-cream"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Passo 1 — baixar o modelo */}
        <section className="mb-4 rounded-2xl border border-line bg-surface-2 p-4">
          <h3 className="mb-1 text-sm font-bold">1. Baixe o modelo</h3>
          <p className="mb-3 text-xs text-muted">
            Vem com o que já está cadastrado — serve de modelo e de ponto de partida.
          </p>
          <div className="flex flex-wrap gap-2">
            {spec.templates.map((template) => (
              <a
                key={template.href}
                href={template.href}
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-brand hover:text-brand"
                title={template.hint}
              >
                <Download className="size-4" aria-hidden />
                {template.label}
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs text-faint">
            Colunas: <code className="text-muted">{spec.columns}</code>
          </p>
        </section>

        {/* Passo 2 — enviar */}
        <section className="mb-4 rounded-2xl border border-line bg-surface-2 p-4">
          <h3 className="mb-1 text-sm font-bold">2. Envie a planilha preenchida</h3>
          <p className="mb-3 text-xs text-muted">
            Salve como CSV no Excel ou Google Planilhas. Nada é gravado antes de você conferir.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void analyse(file);
            }}
          />
          <Button variant="ghost" onClick={() => fileRef.current?.click()} loading={busy}>
            <Upload className="size-4" aria-hidden />
            {filename || "Escolher arquivo CSV"}
          </Button>
        </section>

        {error && (
          <div className="mb-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        {/* Passo 3 — conferir */}
        {preview && (
          <section className="space-y-4">
            <h3 className="text-sm font-bold">3. Confira antes de aplicar</h3>

            <div className="flex flex-wrap gap-2">
              <Badge tone={preview.create.length ? "success" : "neutral"}>
                {preview.create.length} novo{preview.create.length === 1 ? "" : "s"}
              </Badge>
              <Badge tone={preview.update.length ? "brand" : "neutral"}>
                {preview.update.length} atualizado{preview.update.length === 1 ? "" : "s"}
              </Badge>
              <Badge>{preview.unchanged} sem mudança</Badge>
              {hasErrors && <Badge tone="danger">{preview.errors.length} com erro</Badge>}
            </div>

            {preview.newCategories && preview.newCategories.length > 0 && (
              <Notice tone="success">
                Categorias que serão criadas junto: {preview.newCategories.join(", ")}
              </Notice>
            )}
            {preview.newCities && preview.newCities.length > 0 && (
              <Notice tone="success">
                Cidades que serão criadas junto: {preview.newCities.join(", ")}
              </Notice>
            )}

            {hasErrors && (
              <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-danger">
                  <AlertTriangle className="size-4" aria-hidden />
                  Corrija estas linhas na planilha e envie de novo
                </p>
                <ul className="space-y-1 text-xs text-danger">
                  {preview.errors.slice(0, 20).map((issue, index) => (
                    <li key={index}>
                      Linha {issue.line}: {issue.message}
                    </li>
                  ))}
                  {preview.errors.length > 20 && (
                    <li className="text-muted">… e mais {preview.errors.length - 20}</li>
                  )}
                </ul>
              </div>
            )}

            <ChangeList title="Serão criados" rows={preview.create} tone="success" />
            <ChangeList title="Serão atualizados" rows={preview.update} tone="brand" />

            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button onClick={apply} loading={busy} disabled={hasErrors || totalChanges === 0}>
                <Check className="size-4" aria-hidden />
                {totalChanges === 0
                  ? "Nada para aplicar"
                  : `Aplicar ${totalChanges} alteraç${totalChanges === 1 ? "ão" : "ões"}`}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ChangeList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: PreviewRow[];
  tone: "success" | "brand";
}) {
  if (rows.length === 0) return null;

  return (
    <details className="rounded-2xl border border-line bg-surface-2 p-4" open={rows.length <= 12}>
      <summary className="cursor-pointer text-sm font-bold">
        {title} <span className="font-normal text-muted">({rows.length})</span>
      </summary>
      <ul className="mt-3 max-h-60 space-y-1.5 overflow-y-auto text-sm">
        {rows.map((row) => (
          <li key={`${row.line}-${row.label}`} className="flex flex-wrap items-baseline gap-2">
            <span className="w-10 shrink-0 text-xs text-faint">L{row.line}</span>
            <span className="font-medium">{row.label}</span>
            <span className={tone === "success" ? "text-xs text-success" : "text-xs text-brand"}>
              {row.detail}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
