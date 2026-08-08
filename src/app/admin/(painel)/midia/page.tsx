"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import { api, uploadImage } from "@/lib/apiClient";
import { GALLERY } from "@/lib/gallery";

type Asset = {
  id: string;
  url: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
};

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

/** Mesma redução do ImageField: 1200px WebP antes de subir. */
async function shrink(file: File, maxSide = 1200): Promise<File> {
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

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

export default function MidiaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () =>
    api<{ assets: Asset[] }>("/api/admin/media")
      .then((data) => setAssets(data.assets))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadImage(await shrink(file));
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(asset: Asset) {
    if (!confirm(`Excluir "${asset.filename}"?`)) return;
    setError(null);
    try {
      await api(`/api/admin/media?url=${encodeURIComponent(asset.url)}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir");
    }
  }

  return (
    <>
      <PageHeader
        title="Fotos"
        description="As fotos enviadas ficam disponíveis para qualquer produto ou categoria."
        action={
          <Button onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload className="size-4" aria-hidden />
            Enviar fotos
          </Button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
      />

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-1 font-display font-bold">Enviadas pelo painel</h2>
        <p className="mb-4 text-sm text-muted">
          Reduzidas para 1200px no navegador antes de subir, para não pesar no celular do cliente.
        </p>

        {loading ? (
          <EmptyState>Carregando…</EmptyState>
        ) : assets.length === 0 ? (
          <EmptyState>
            Nenhuma foto enviada ainda. Use o botão acima ou envie direto pelo formulário do
            produto.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {assets.map((asset) => (
              <li key={asset.id} className="group relative">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
                  <Image
                    src={asset.url}
                    alt={asset.filename}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => remove(asset)}
                    className="absolute right-1.5 top-1.5 rounded-lg bg-black/70 p-1.5 text-white opacity-0 transition hover:bg-danger group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Excluir ${asset.filename}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <p className="mt-1 truncate text-xs text-muted" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="text-xs text-faint">{kb(asset.sizeBytes)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-display font-bold">Fotos que vieram com o site</h2>
          <Badge>{GALLERY.length}</Badge>
        </div>
        <p className="mb-4 text-sm text-muted">
          As profissionais e as aproveitadas do cardápio impresso. Ficam no site e não podem ser
          excluídas por aqui.
        </p>

        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {GALLERY.map((image) => (
            <li key={image.slug}>
              <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
                <Image
                  src={image.thumb}
                  alt={image.slug}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </div>
              <p className="mt-1 truncate text-xs text-muted" title={image.slug}>
                {image.slug}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      {uploading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Enviando…
        </p>
      )}
    </>
  );
}
