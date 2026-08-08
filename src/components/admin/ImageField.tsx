"use client";

import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Field, inputClass } from "@/components/admin/ui";
import { api, uploadImage } from "@/lib/apiClient";
import { GALLERY } from "@/lib/gallery";

type Tab = "upload" | "galeria" | "url";

/** Reduz a foto no NAVEGADOR antes de enviar. */
async function shrink(file: File, maxSide = 1200): Promise<File> {
  // SVG e GIF não passam pelo canvas sem perder o que têm de próprio
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 400_000) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${name}.webp`, { type: "image/webp" });
}

export function ImageField({
  label = "Foto",
  value,
  onChange,
  hint,
}: {
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const [tab, setTab] = useState<Tab>("galeria");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ url: string; filename: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Carrega o que já foi enviado ao Blob, para reaproveitar em outros itens
  useEffect(() => {
    let cancelled = false;
    api<{ assets: { url: string; filename: string }[] }>("/api/admin/media")
      .then((data) => !cancelled && setUploaded(data.assets))
      .catch(() => {
        // Blob não configurado: a aba Galeria ainda mostra as fotos locais.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const shrunk = await shrink(file);
      const { url } = await uploadImage(shrunk);
      setUploaded((current) => [{ url, filename: shrunk.name }, ...current]);
      onChange(url);
      setTab("galeria");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const options = [
    ...uploaded.map((asset) => ({ src: asset.url, thumb: asset.url, label: asset.filename })),
    ...GALLERY.map((image) => ({ src: image.src, thumb: image.thumb, label: image.slug })),
  ];

  return (
    <Field label={label} hint={hint}>
      <div className="rounded-xl border border-line bg-surface p-3">
        {/* Prévia */}
        <div className="mb-3 flex items-center gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
            {value ? (
              <Image src={value} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-faint">
                <ImageIcon className="size-6" aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">{value ?? "Nenhuma foto selecionada"}</p>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="mt-1 inline-flex items-center gap-1 text-xs text-danger hover:underline"
              >
                <Trash2 className="size-3" aria-hidden />
                Remover foto
              </button>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="mb-3 flex gap-1 rounded-full bg-surface-2 p-1">
          {(
            [
              ["galeria", "Galeria"],
              ["upload", "Enviar foto"],
              ["url", "Colar URL"],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tab === id ? "bg-brand text-white" : "text-muted hover:text-cream"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        {tab === "galeria" && (
          <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {options.map((option) => (
              <button
                key={option.src}
                type="button"
                title={option.label}
                onClick={() => onChange(option.src)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                  value === option.src ? "border-brand" : "border-transparent hover:border-line"
                }`}
              >
                <Image
                  src={option.thumb}
                  alt={option.label}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {tab === "upload" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="size-6 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-6" aria-hidden />
              )}
              {uploading ? "Enviando…" : "Escolher foto do computador"}
            </button>
            <p className="mt-2 text-center text-xs text-faint">
              A foto é reduzida para 1200px aqui no navegador antes de subir.
            </p>
            {error && <p className="mt-2 text-center text-xs text-danger">{error}</p>}
          </div>
        )}

        {tab === "url" && (
          <input
            type="url"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://… ou /cardapio/foto.webp"
            className={inputClass}
          />
        )}
      </div>
    </Field>
  );
}
