/**
 * Aproveita as fotos que vieram embutidas no PDF do cardápio.
 *
 * O PDF tem ~75 imagens, mas a maioria é ícone, selo ou logo de refrigerante.
 * Só uma dúzia serve como foto de prato — e mesmo essas são pequenas
 * (máx. ~530px), então valem como reserva de categoria, não como foto de hero.
 *
 * Pré-requisito:
 *   pdfimages -j -p docs/cardapio-sushifull.pdf raw/cardapio-fotos/pdf
 *
 *   node scripts/import-pdf-photos.mjs
 */
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "raw", "cardapio-fotos");
const OUT = path.join(ROOT, "public", "cardapio");

/** Origem no PDF → nome final. Selecionadas visualmente, uma a uma. */
const SELECTED = {
  "pdf-004-028": "menu-hot-salmao-macaricado",
  "pdf-004-029": "menu-shimeji",
  "pdf-004-030": "menu-hot-doce",
  "pdf-003-018": "menu-ceviche",
  "pdf-003-019": "menu-niguiri-macaricado",
  "pdf-003-020": "menu-jyo-salmao",
  "pdf-003-022": "menu-sashimi-variado",
  "pdf-002-006": "menu-huramaki",
  "pdf-002-007": "menu-hossomaki",
  "pdf-002-011": "menu-gunkan-salmao",
  "pdf-014-067": "menu-refrigerante",
};

const kb = async (p) => `${Math.round((await stat(p)).size / 1024)} KB`;

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const [source, slug] of Object.entries(SELECTED)) {
    const input = path.join(SRC, `${source}.jpg`);

    for (const [width, quality] of [
      [1000, 82],
      [480, 78],
    ]) {
      await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(path.join(OUT, `${slug}-${width}.webp`));
    }

    const { width, height } = await sharp(input).metadata();
    console.log(
      `  ${source} (${width}×${height}) → ${slug}  ${await kb(path.join(OUT, `${slug}-1000.webp`))}`,
    );
  }

  console.log(`\n✓ ${Object.keys(SELECTED).length} fotos do PDF importadas`);
  console.log("  Rode `npm run media:images` depois se quiser regenerar o manifesto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
