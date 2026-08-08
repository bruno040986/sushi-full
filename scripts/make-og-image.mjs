/**
 * Gera a imagem de compartilhamento (Open Graph), 1200×630.
 *
 * É o que aparece quando alguém cola o link do site no WhatsApp — o canal
 * principal do restaurante. Sem ela o preview sai só com texto.
 *
 *   npm run media:og
 */
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const PHOTO = path.join(ROOT, "public", "cardapio", "ambiente-mesa-completa-1000.webp");
const LOGO = path.join(ROOT, "public", "brand", "logo.png");
const OUT = path.join(ROOT, "public", "brand", "og.jpg");

const WIDTH = 1200;
const HEIGHT = 630;

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });

  // Foto de fundo cortada no formato do card
  const background = await sharp(PHOTO)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" })
    .toBuffer();

  // Véu escuro para o logo respirar sobre a foto
  const veil = Buffer.from(
    `<svg width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000" stop-opacity="0.55"/>
          <stop offset="55%" stop-color="#000" stop-opacity="0.72"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#v)"/>
    </svg>`,
  );

  const logo = await sharp(LOGO).resize({ width: 560 }).toBuffer();
  const { height: logoHeight = 0 } = await sharp(logo).metadata();

  const caption = Buffer.from(
    `<svg width="${WIDTH}" height="120">
      <style>
        .t { fill: #FFF6F2; font-family: Poppins, Inter, Arial, sans-serif;
             font-size: 34px; font-weight: 700; letter-spacing: 6px }
      </style>
      <text x="50%" y="58" text-anchor="middle" class="t">SABOR QUE COMPLETA</text>
    </svg>`,
  );

  await sharp(background)
    .composite([
      { input: veil, top: 0, left: 0 },
      { input: logo, top: Math.round((HEIGHT - logoHeight) / 2) - 40, left: (WIDTH - 560) / 2 },
      { input: caption, top: HEIGHT - 170, left: 0 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(OUT);

  const { size } = await stat(OUT);
  console.log(`  public/brand/og.jpg  ${WIDTH}×${HEIGHT}  ${Math.round(size / 1024)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
