import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

/**
 * Token de escrita do Blob.
 *
 * O nome da variável depende do prefixo escolhido ao conectar o store na
 * Vercel: com o prefixo padrão ela nasce `BLOB_READ_WRITE_TOKEN`; se alguém
 * digitar um prefixo, a Vercel concatena e vira `<PREFIXO>_READ_WRITE_TOKEN`.
 * Aceitar as duas formas evita upload quebrado por causa de um campo de
 * formulário preenchido diferente.
 */
function blobToken(): string | undefined {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN ||
    undefined
  );
}

const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"];
/**
 * 4 MB. O ImageField já reduz a foto para ~1200px WebP no navegador antes de
 * enviar, então na prática chega algo em torno de 150 KB — este limite é só
 * uma rede de segurança (a Vercel corta o corpo em 4,5 MB de qualquer forma).
 */
const MAX_BYTES = 4 * 1024 * 1024;

/** Galeria de imagens já enviadas, para reaproveitar em outros produtos. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const token = blobToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Upload não configurado. Conecte um Blob store ao projeto na Vercel (Storage → Blob).",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo no campo 'file'" }, { status: 422 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato não aceito. Use WebP, JPEG ou PNG." },
      { status: 422 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Imagem muito grande. O limite é 4 MB." },
      { status: 413 },
    );
  }

  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "foto";

  const blob = await put(`cardapio/${base}.${extension}`, file, {
    access: "public",
    // Evita que dois uploads com o mesmo nome se sobrescrevam
    addRandomSuffix: true,
    contentType: file.type,
    token,
  });

  const asset = await prisma.mediaAsset.create({
    data: {
      url: blob.url,
      pathname: blob.pathname,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({ asset }, { status: 201 });
}

/** Remove do Blob e do catálogo. Não mexe nos produtos que usam a URL. */
export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(request.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Informe a url" }, { status: 422 });

  const asset = await prisma.mediaAsset.findUnique({ where: { url } });
  if (!asset) return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });

  const inUse = await prisma.product.count({ where: { imageUrl: url } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: `Esta imagem está em ${inUse} produto(s). Troque a foto deles antes de excluir.` },
      { status: 409 },
    );
  }

  await del(url, { token: blobToken() });
  await prisma.mediaAsset.delete({ where: { url } });

  return NextResponse.json({ ok: true });
}
