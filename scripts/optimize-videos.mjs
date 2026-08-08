/**
 * Prepara os vídeos verticais (9:16) para o site.
 *
 *  - hero.mp4   → trecho curto, SEM áudio, para tocar em loop atrás do hero
 *  - reel-*.mp4 → os 3 reels completos, COM áudio (começam mudos, o usuário
 *                 pode ligar o som no botão do card)
 *  - poster WebP para todos, para o primeiro paint não depender do vídeo
 *
 *   npm run media:videos
 */
import { execFile } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "raw", "videos");
const OUT_DIR = path.join(ROOT, "public", "video");

/** Vídeo do hero: o mais apetitoso, cortado curto. */
const HERO = { file: "VIDEO-COMBO-SUSHI.mp4", seconds: 6, startAt: 1 };

/** Reels exibidos na seção dedicada, na ordem em que aparecem. */
const REELS = [
  { file: "VIDEO-COMBO-SUSHI.mp4", slug: "reel-combo", title: "Combos que valem a pena" },
  { file: "VIDEO-TEMAKI.mp4", slug: "reel-temaki", title: "Temaki na hora" },
  { file: "VIDEO-CAMARAO.mp4", slug: "reel-camarao", title: "Camarão empanado" },
];

const kb = (n) => `${Math.round(n / 1024)} KB`;
const sizeOf = async (p) => (await stat(p)).size;

async function ffmpeg(args) {
  // maxBuffer alto porque o ffmpeg é verboso no stderr
  await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    maxBuffer: 1024 * 1024 * 32,
  });
}

/** Extrai um frame e grava como WebP — o poster do <video>. */
async function makePoster(input, output, atSecond) {
  const tmp = `${output}.tmp.png`;
  await ffmpeg(["-ss", String(atSecond), "-i", input, "-frames:v", "1", tmp]);
  await sharp(tmp).webp({ quality: 74, effort: 5 }).toFile(output);
  await rm(tmp, { force: true });
  return sizeOf(output);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // ─── Hero ───────────────────────────────────────────────────────────────
  const heroIn = path.join(SRC_DIR, HERO.file);
  const heroOut = path.join(OUT_DIR, "hero.mp4");

  await ffmpeg([
    "-ss", String(HERO.startAt),
    "-i", heroIn,
    "-t", String(HERO.seconds),
    "-an",                        // hero é decorativo e silencioso
    "-c:v", "libx264",
    "-profile:v", "main",
    "-crf", "32",                 // fica atrás de um overlay escuro e desfocado
    "-r", "24",                   // 24 fps já basta para um pano de fundo
    "-preset", "slow",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",    // começa a tocar antes do download completo
    heroOut,
  ]);

  const heroPoster = path.join(OUT_DIR, "hero-poster.webp");
  const heroPosterSize = await makePoster(heroIn, heroPoster, HERO.startAt + 1);
  const heroSize = await sizeOf(heroOut);

  console.log(`  hero.mp4          ${kb(heroSize)}  (${HERO.seconds}s, sem áudio)`);
  console.log(`  hero-poster.webp  ${kb(heroPosterSize)}`);
  if (heroSize > 700 * 1024) {
    console.warn(`  ⚠ hero acima de 700 KB — considere reduzir -t ou subir o -crf`);
  }

  // ─── Reels ──────────────────────────────────────────────────────────────
  const manifest = [];
  for (const reel of REELS) {
    const input = path.join(SRC_DIR, reel.file);
    const output = path.join(OUT_DIR, `${reel.slug}.mp4`);

    await ffmpeg([
      "-i", input,
      "-c:v", "libx264",
      "-profile:v", "main",
      "-crf", "30",
      "-preset", "slow",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",              // áudio mantido: o card tem botão de som
      "-b:a", "80k",
      "-ac", "1",                 // mono: reel de celular não tem estéreo real
      "-movflags", "+faststart",
      output,
    ]);

    const poster = path.join(OUT_DIR, `${reel.slug}-poster.webp`);
    const posterSize = await makePoster(input, poster, 1);
    const videoSize = await sizeOf(output);

    manifest.push(reel);
    console.log(
      `  ${reel.slug}.mp4      ${kb(videoSize)}  ·  poster ${kb(posterSize)}`,
    );
  }

  console.log(
    `\n✓ hero + ${REELS.length} reels em public/video/` +
      `\n  Os reels só baixam quando entram no viewport (ReelsSection).`,
  );
}

main().catch((err) => {
  console.error(err.stderr?.toString?.() ?? err);
  process.exit(1);
});
