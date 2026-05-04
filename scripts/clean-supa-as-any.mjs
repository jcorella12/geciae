// Limpia el patrón estándar:
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const supa = supabase as any;
//   ... usa supa.from(...) ...
//
// Lo reemplaza por uso directo de `supabase`.
// Solo modifica archivos donde el patrón está y `supa` es una variable local.
//
// Uso: node scripts/clean-supa-as-any.mjs [--check]
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const checkOnly = process.argv.includes("--check");

// Listar archivos con el patrón usando git grep (rápido y respeta .gitignore)
const grepOut = execSync(
  `git grep -l "const supa = supabase as any" -- "app/**/*.ts" "app/**/*.tsx" "components/**/*.ts" "components/**/*.tsx"`,
  { cwd: process.cwd(), encoding: "utf8" },
).trim();
const files = grepOut.split("\n").filter(Boolean);

console.log(`${checkOnly ? "[check] " : ""}Files to process: ${files.length}`);

let totalReplaced = 0;
let filesChanged = 0;
const errors = [];

for (const relPath of files) {
  const path = join(process.cwd(), relPath);
  const original = readFileSync(path, "utf8");

  // Step 1: Quitar el bloque "eslint-disable + const supa = supabase as any;"
  // Considera líneas en blanco intermedias mínimas
  let cleaned = original.replace(
    /^\s*\/\/\s*eslint-disable-next-line\s+@typescript-eslint\/no-explicit-any\s*\r?\n\s*const supa = supabase as any;\s*\r?\n/gm,
    "",
  );

  // Si no hubo match, saltar
  if (cleaned === original) {
    console.log(`  - ${relPath}: SIN cambios (patrón no encontrado limpio)`);
    continue;
  }

  // Step 2: Reemplazar `supa` por `supabase` en todo el archivo (palabra completa)
  // Manejar `supa.from()`, `supa\n  .from()`, `(supa)`, etc.
  cleaned = cleaned.replace(/\bsupa\b/g, "supabase");

  // Sanity: no debería quedar `supa` solo (ya reemplazó todos)
  if (/\bsupa\b/.test(cleaned)) {
    errors.push(`  ⚠️  ${relPath}: quedaron usos de \`supa\` — revisar`);
    continue;
  }

  if (!checkOnly) {
    writeFileSync(path, cleaned, "utf8");
  }
  const replaced = (original.match(/\bsupa\b/g) || []).length;
  totalReplaced += replaced;
  filesChanged++;
  console.log(`  ✓ ${relPath}: ${replaced} usos de \`supa\` reemplazados`);
}

console.log(
  `\n${checkOnly ? "[check] " : ""}${filesChanged}/${files.length} archivos modificados, ${totalReplaced} reemplazos totales`,
);
if (errors.length > 0) {
  console.log("\nERRORES:");
  errors.forEach((e) => console.log(e));
}
