/**
 * Gera os ícones e o logo do site a partir dos originais em raw/marca/.
 *
 * O favicon original tem 2000x2000 e 3,1 MB — inviável como ícone de aba.
 * Aqui ele vira 512² (icon) e 180² (apple-icon), ambos abaixo de 30 KB.
 *
 *   npm run media:icons
 */
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "raw", "marca");
const APP = path.join(ROOT, "src", "app");
const BRAND = path.join(ROOT, "public", "brand");

const kb = async (p) => `${Math.round((await stat(p)).size / 1024)} KB`;

const JOBS = [
  // Ícones do App Router — o Next gera as <link> automaticamente
  {
    // 256² é suficiente para aba, bookmark e PWA. Em 512 o arquivo passa de
    // 130 KB por causa do degradê do original — desperdício num favicon.
    from: "favicon-sushi-full.png",
    to: path.join(APP, "icon.png"),
    size: 256,
    quantize: 96,
    label: "src/app/icon.png",
  },
  {
    from: "favicon-sushi-full.png",
    to: path.join(APP, "apple-icon.png"),
    size: 180,
    // iOS não respeita transparência: achata sobre o preto da marca
    flattenOn: { r: 0, g: 0, b: 0 },
    label: "src/app/apple-icon.png",
  },
  // Logotipo usado no Header, Footer e /bio — transparente, sobre fundo escuro.
  // O original é quadrado com muita margem vazia: a marca ocupa menos de
  // metade da altura, o que a faz parecer minúscula em qualquer tamanho.
  // `trim` remove essa margem para o logo preencher a caixa de verdade.
  {
    from: "logo-sushi-full-transparente.png",
    to: path.join(BRAND, "logo.png"),
    size: 900,
    trim: true,
    fit: "inside",
    label: "public/brand/logo.png",
  },
  // Versão para compartilhamento (OG) precisa de fundo sólido
  {
    from: "logo-sushi-full-transparente.png",
    to: path.join(BRAND, "logo-og.png"),
    size: 512,
    trim: true,
    fit: "inside",
    flattenOn: { r: 0, g: 0, b: 0 },
    label: "public/brand/logo-og.png",
  },
];

async function main() {
  await mkdir(BRAND, { recursive: true });

  for (const job of JOBS) {
    const input = path.join(SRC, job.from);
    let pipeline = sharp(input);

    // Remove a moldura transparente antes de redimensionar
    if (job.trim) pipeline = pipeline.trim({ threshold: 12 });

    pipeline = pipeline.resize({
      width: job.size,
      height: job.size,
      fit: job.fit ?? "contain",
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    if (job.flattenOn) pipeline = pipeline.flatten({ background: job.flattenOn });

    await pipeline
      .png({ compressionLevel: 9, palette: true, colors: job.quantize ?? 128 })
      .toFile(job.to);

    const { width, height } = await sharp(job.to).metadata();
    console.log(`  ${job.label.padEnd(28)} ${width}×${height}  ${await kb(job.to)}`);
  }

  console.log("\n✓ ícones e logo gerados");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
