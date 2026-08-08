/**
 * Converte as fotos profissionais de raw/fotos/ para WebP em public/cardapio/,
 * em duas larguras (480 e 1000), e gera o manifesto src/lib/gallery.ts.
 *
 * O manifesto existe porque não dá para fazer readdir em runtime na Vercel —
 * a galeria do painel precisa da lista em tempo de build.
 *
 *   npm run media:images
 */
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "raw", "fotos");
const OUT_DIR = path.join(ROOT, "public", "cardapio");
const MANIFEST = path.join(ROOT, "src", "lib", "gallery.ts");

/** Nomes de origem → slug de destino. Prefixo agrupa na galeria do painel. */
const RENAME = {
  "SUSHI-1": "combo-sushi-01",
  "NIGUIRI-1": "niguiri-01",
  "NIGUIRI-BARRIGA-1": "niguiri-barriga-salmao-01",
  "NIGUIRI-BARRIGA-2": "niguiri-barriga-salmao-02",
  "TEMAKI-SALMAO": "temaki-salmao",
  "CEVICHE-TILAPIA-LEITE-DE-COCO-1": "ceviche-tilapia-leite-de-coco-01",
  "CEVICHE-TILAPIA-LEITE-DE-COCO-2": "ceviche-tilapia-leite-de-coco-02",
  "HOMEM-CEVICHE": "ambiente-ceviche-servido",
  "MESA-SUSHI-FULL": "ambiente-mesa-completa",
  COZINHEIRO: "equipe-sushiman",
  "CASAL-SUSHIFULL-1": "ambiente-casal-01",
  "CASAL-SUSHIFULL-2": "ambiente-casal-02",
  "CASAL-RODIZIO-1": "ambiente-rodizio-01",
  "CASAL-RODIZZIO-2": "ambiente-rodizio-02",
};

/** Fallback para arquivos novos que o dono jogar na pasta sem estar no mapa. */
const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const WIDTHS = [
  { w: 1000, quality: 82 },
  { w: 480, quality: 78 },
];

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let files;
  try {
    files = (await readdir(SRC_DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  } catch {
    console.error(`✗ Pasta não encontrada: ${SRC_DIR}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`✗ Nenhuma imagem em ${SRC_DIR}`);
    process.exit(1);
  }

  const entries = [];
  let totalIn = 0;
  let totalOut = 0;

  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    const slug = RENAME[base] ?? slugify(base);
    const input = path.join(SRC_DIR, file);

    const meta = await sharp(input).metadata();
    totalIn += (await stat(input)).size;

    const outputs = [];
    for (const { w, quality } of WIDTHS) {
      const out = path.join(OUT_DIR, `${slug}-${w}.webp`);
      // .rotate() sem argumento aplica a orientação do EXIF — sem isso, foto
      // tirada no celular sai deitada.
      const info = await sharp(input)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(out);
      totalOut += info.size;
      outputs.push({ w, size: info.size });
    }

    entries.push({ slug, width: meta.width, height: meta.height });
    console.log(
      `  ${file}  →  ${slug}  ${outputs.map((o) => `${o.w}px ${kb(o.size)}`).join(" · ")}`,
    );
  }

  const manifest = `// GERADO POR scripts/optimize-images.mjs — não editar à mão.
// Rode \`npm run media:images\` para regenerar.

export type GalleryImage = {
  /** Identificador estável, usado como valor em Product.imageUrl */
  slug: string;
  /** Caminho da versão grande (cards em destaque, modal) */
  src: string;
  /** Caminho da versão pequena (thumbnails, galeria do painel) */
  thumb: string;
};

export const GALLERY: GalleryImage[] = [
${entries
  .map(
    (e) =>
      `  { slug: ${JSON.stringify(e.slug)}, src: "/cardapio/${e.slug}-1000.webp", thumb: "/cardapio/${e.slug}-480.webp" },`,
  )
  .join("\n")}
];

/** Busca uma imagem da galeria pelo slug. */
export function findGalleryImage(slug: string): GalleryImage | undefined {
  return GALLERY.find((g) => g.slug === slug);
}
`;

  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, manifest, "utf8");

  console.log(
    `\n✓ ${files.length} fotos → ${files.length * WIDTHS.length} WebP` +
      `\n  ${kb(totalIn)} → ${kb(totalOut)} (${Math.round((1 - totalOut / totalIn) * 100)}% menor)` +
      `\n  manifesto: src/lib/gallery.ts`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
