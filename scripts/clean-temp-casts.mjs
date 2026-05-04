#!/usr/bin/env node
/**
 * Sprint 5 cleanup: elimina los casts temporales que se introdujeron mientras
 * los types de Supabase no estaban regenerados.
 *
 * - `clientSol()` → `supabase`  (en solicitudes/actions.ts)
 * - `clientSug()` → `supabase`  (en admin/sugerencias/actions.ts)
 * - `(supabase as any)` → `supabase`
 * - Quita las funciones helper `clientSol`/`clientSug` y sus comentarios
 * - Quita los `eslint-disable-next-line @typescript-eslint/no-explicit-any`
 *   asociados a las líneas casteadas
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const targets = [
  "app/(app)/admin/sugerencias/[id]/page.tsx",
  "app/(app)/admin/sugerencias/actions.ts",
  "app/(app)/admin/sugerencias/page.tsx",
  "app/(app)/admin/uso/page.tsx",
  "app/(app)/finanzas/cumplimiento/page.tsx",
  "app/(app)/mi-dia/widgets-por-rol.tsx",
  "app/(app)/proyectos/[id]/page.tsx",
  "app/(app)/proyectos/[id]/solicitudes/actions.ts",
  "app/(app)/solicitudes/page.tsx",
  "lib/eventos-uso/actions.ts",
];

for (const rel of targets) {
  const p = resolve(root, rel);
  if (!existsSync(p)) {
    console.warn(`✗ no existe: ${rel}`);
    continue;
  }
  let s = readFileSync(p, "utf8");
  const before = s;

  // 1. Quitar bloque del helper clientSol / clientSug y su comentario JSDoc
  s = s.replace(
    /\/\*\*[\s\S]*?Las tablas[\s\S]*?\*\/\s*\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\s*\nfunction clientSol\(\): any \{\s*\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\s*\n\s*return createClient\(\) as unknown as any;\s*\n\}\s*\n\n/g,
    "",
  );
  s = s.replace(
    /\/\/ Helper local: la tabla es nueva[\s\S]*?function clientSug\(\): any \{\s*\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\s*\n\s*return createClient\(\) as unknown as any;\s*\n\}\s*\n\n/g,
    "",
  );

  // 2. Reemplazos directos
  s = s.replace(/\bclientSol\(\)/g, "supabase");
  s = s.replace(/\bclientSug\(\)/g, "supabase");
  // (supabase as any) → supabase, dentro de await + asignaciones
  s = s.replace(/\(\s*supabase\s+as\s+any\s*\)/g, "supabase");
  // Variant: (createClient() as any)
  s = s.replace(/\(\s*createClient\(\)\s+as\s+any\s*\)/g, "createClient()");

  // 3. Quitar `let query: any = supabase` → `let query = supabase`
  s = s.replace(/let\s+query\s*:\s*any\s*=\s*supabase/g, "let query = supabase");

  // 4. Quitar las eslint-disable que quedaron huérfanas (línea siguiente ya
  //    no tiene `any`). Patrón: el comentario seguido por una línea con
  //    `supabase` o `await supabase` (no tiene any).
  s = s.replace(
    /[ \t]*\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\r?\n([ \t]*(?:const|let|await|return|\.from|\.rpc|\.\w))/g,
    "$1",
  );

  // 5. Eliminar comentarios obsoletos sobre "tabla nueva, types no regenerados"
  s = s.replace(
    /\s*\/\/\s*(?:la\s+tabla\s+es\s+nueva|tabla\s+nueva|tablas?\s+nueva|`?[a-z_]+`?\s+(?:se\s+)?agreg[oó].*?migraci[oó]n[\s\S]*?(?:regener[ae]n? los types|types regenerados))[^\n]*\n/gi,
    "\n",
  );

  // 6. Cleanup: dobles líneas vacías
  s = s.replace(/\n\n\n+/g, "\n\n");

  if (before !== s) {
    writeFileSync(p, s);
    console.log(`✓ ${rel}`);
  } else {
    console.log(`= ${rel} (sin cambios)`);
  }
}
