// Genera los iconos del sistema a partir del logo fuente.
//
// Uso:
//   node scripts/generate-icons.mjs
//
// Lee `public/logos/ciae.png` (o el archivo declarado en SRC) y produce:
//   - public/icons/icon-192.png (PWA manifest)
//   - public/icons/icon-512.png (PWA manifest)
//   - public/icons/icon-180.png (Apple touch icon)
//   - app/icon.png             (favicon auto-detectado por Next.js)
//   - app/apple-icon.png       (Apple touch icon auto-detectado por Next.js)
//
// Cuando llegue el logo del Grupo PSENERGIA cambiar SRC y volver a correr.
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const SRC = resolve(ROOT, "public/logos/ciae.png");

const TARGETS = [
  { out: "public/icons/icon-192.png", size: 192, padding: 0.06 },
  { out: "public/icons/icon-512.png", size: 512, padding: 0.06 },
  { out: "public/icons/icon-180.png", size: 180, padding: 0.06 },
  { out: "app/icon.png", size: 256, padding: 0.04 },
  { out: "app/apple-icon.png", size: 180, padding: 0.06 },
];

async function generate() {
  const meta = await sharp(SRC).metadata();
  console.log(
    `Source: ${SRC}\n  ${meta.width}x${meta.height} ${meta.format} (${meta.channels} ch)`,
  );

  for (const t of TARGETS) {
    const outPath = resolve(ROOT, t.out);
    await mkdir(dirname(outPath), { recursive: true });

    const inner = Math.round(t.size * (1 - t.padding * 2));
    const margin = Math.round((t.size - inner) / 2);

    await sharp(SRC)
      .resize(inner, inner, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: margin,
        bottom: t.size - inner - margin,
        left: margin,
        right: t.size - inner - margin,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    console.log(`  ✓ ${t.out} (${t.size}x${t.size})`);
  }

  console.log("\nDone.");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
