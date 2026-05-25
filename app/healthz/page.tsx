import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico exhaustivo de las env vars críticas y la conexión a Supabase.
 *
 * Abrir https://[tu-deploy].vercel.app/healthz para verificar después de
 * cambiar env vars en Vercel. Esta página NO requiere login y NO expone
 * secretos — solo dice si están configurados y a qué proyecto apuntan.
 */
export default async function HealthzPage() {
  const checks: Array<{
    label: string;
    ok: boolean;
    detail: string;
  }> = [];

  // -------------------------------------------------------------------
  // 1. Env vars críticas
  // -------------------------------------------------------------------
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = urlRaw?.trim() ?? "";
  const tieneWhitespaceUrl = urlRaw != null && urlRaw !== urlRaw.trim();
  const anonRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anon = anonRaw?.trim();
  const tieneWhitespaceAnon = anonRaw != null && anonRaw !== anonRaw.trim();
  const serviceRaw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service = serviceRaw?.trim();
  const tieneWhitespaceService =
    serviceRaw != null && serviceRaw !== serviceRaw.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const satKey = process.env.SAT_FIEL_ENCRYPTION_KEY?.trim();
  const anthropic = process.env.ANTHROPIC_API_KEY?.trim();
  const banxico = process.env.BANXICO_TOKEN?.trim();

  // Extraer project ref del URL (la parte antes de .supabase.co)
  const projectRef = url
    ? url.replace(/^https?:\/\//, "").replace(/\.supabase\.co.*$/, "")
    : null;

  const PROJECT_REF_ESPERADO = "dtmcqjtqykbkapzebbik";

  let urlDetail: string;
  if (!urlRaw) {
    urlDetail = "FALTA — agrégala en Vercel Settings → Environment Variables";
  } else if (tieneWhitespaceUrl) {
    urlDetail = `⚠ ${url} — pero el valor en Vercel tiene WHITESPACE al inicio/final. Edítala en Vercel y re-escribe el valor manualmente (no pegar). El código hace .trim() defensivo pero arréglalo en Vercel.`;
  } else if (projectRef !== PROJECT_REF_ESPERADO) {
    urlDetail = `${url} ⚠ apunta al proyecto "${projectRef}", esperado "${PROJECT_REF_ESPERADO}"`;
  } else {
    urlDetail = `${url} ✓ proyecto correcto`;
  }

  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_URL",
    ok: !!urlRaw && !tieneWhitespaceUrl && projectRef === PROJECT_REF_ESPERADO,
    detail: urlDetail,
  });

  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ok: !!anon && !tieneWhitespaceAnon,
    detail: !anon
      ? "FALTA — agrégala en Vercel"
      : tieneWhitespaceAnon
        ? `⚠ presente pero con whitespace al inicio/final (longitud raw ${anonRaw?.length}, trim ${anon.length})`
        : `presente (longitud ${anon.length})`,
  });

  checks.push({
    label: "SUPABASE_SERVICE_ROLE_KEY",
    ok: !!service && !tieneWhitespaceService,
    detail: !service
      ? "FALTA en Production — sin esto falla invitar usuarios y otras acciones admin"
      : tieneWhitespaceService
        ? `⚠ presente pero con whitespace al inicio/final (longitud raw ${serviceRaw?.length}, trim ${service.length})`
        : `presente (longitud ${service.length})`,
  });

  checks.push({
    label: "NEXT_PUBLIC_SITE_URL",
    ok: !!siteUrl,
    detail: siteUrl ?? "FALTA — los magic links de invitación usan esta URL",
  });

  checks.push({
    label: "SAT_FIEL_ENCRYPTION_KEY",
    ok: !!satKey,
    detail: satKey
      ? `presente (longitud ${satKey.length})`
      : "FALTA — descarga SAT no funcionará",
  });

  checks.push({
    label: "ANTHROPIC_API_KEY",
    ok: !!anthropic,
    detail: anthropic
      ? `presente (longitud ${anthropic.length})`
      : "FALTA — extractores IA (CFDI, tickets, edocta) no funcionarán",
  });

  checks.push({
    label: "BANXICO_TOKEN",
    ok: !!banxico,
    detail: banxico
      ? `presente (longitud ${banxico.length})`
      : "FALTA — sync de TIIE no funcionará",
  });

  // -------------------------------------------------------------------
  // 2. Conexión Supabase (lectura con anon — usa RLS del usuario)
  // -------------------------------------------------------------------
  let empresasCount: number | null = null;
  let empresasError: string | null = null;
  try {
    const supabase = createClient();
    const { error, count } = await supabase
      .from("empresas")
      .select("*", { count: "exact", head: true });
    if (error) {
      empresasError = error.message;
    } else {
      empresasCount = count;
    }
  } catch (e) {
    empresasError = (e as Error).message;
  }

  checks.push({
    label: "Conexión a Supabase (lectura anon)",
    ok: empresasError === null,
    detail:
      empresasError === null
        ? `✓ Tabla empresas accesible, count=${empresasCount ?? "n/a (RLS oculta)"}`
        : `✗ ${empresasError}`,
  });

  // -------------------------------------------------------------------
  // 3. Admin client (service_role) — verifica que la key sea válida
  //    contra el proyecto al que apunta NEXT_PUBLIC_SUPABASE_URL.
  // -------------------------------------------------------------------
  let adminOk = false;
  let adminDetail = "";
  if (!url || !service) {
    adminDetail = "skipped — faltan env vars";
  } else {
    try {
      const { createClient: createSupabaseClient } = await import(
        "@supabase/supabase-js"
      );
      const admin = createSupabaseClient(url, service, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await admin.auth.admin.listUsers({ perPage: 1 });
      if (error) {
        adminDetail = `✗ ${error.message} — el service_role key probablemente apunta a OTRO proyecto`;
      } else {
        adminOk = true;
        adminDetail = "✓ service_role key válido y proyecto coincide";
      }
    } catch (e) {
      adminDetail = `✗ excepción: ${(e as Error).message}`;
    }
  }
  checks.push({
    label: "Admin client (service_role)",
    ok: adminOk,
    detail: adminDetail,
  });

  // -------------------------------------------------------------------
  // 4. Resumen
  // -------------------------------------------------------------------
  const allOk = checks.every((c) => c.ok);
  const criticas = checks.filter((c) => !c.ok);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Healthz — Diagnóstico</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifica env vars + conexión a Supabase. Refresca si acabas de
            cambiar la config en Vercel y aún ves errores viejos.
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            allOk
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {allOk ? "✓ Todo OK" : `✗ ${criticas.length} fallas`}
        </div>
      </div>

      <ul className="space-y-2">
        {checks.map((c, i) => (
          <li
            key={i}
            className={`rounded-md border p-3 ${
              c.ok
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                  c.ok ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold">{c.label}</p>
                <p className="mt-0.5 break-words text-xs text-muted-foreground">
                  {c.detail}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-md border border-border bg-card p-4 text-xs">
        <p className="font-medium">Build</p>
        <p className="text-muted-foreground">
          SHA: {process.env.NEXT_PUBLIC_BUILD_SHA ?? "n/a"} · Ref:{" "}
          {process.env.NEXT_PUBLIC_BUILD_REF ?? "n/a"} · Build date:{" "}
          {process.env.NEXT_PUBLIC_BUILD_DATE ?? "n/a"}
        </p>
        <p className="mt-1 text-muted-foreground">
          Timestamp: {new Date().toISOString()}
        </p>
      </div>

      {!allOk && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-semibold">Cómo arreglar</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
            <li>Vercel → tu proyecto → Settings → Environment Variables.</li>
            <li>
              Las que digan FALTA arriba: agrégalas (Add new) con los
              valores correspondientes (copia del .env.local local).
            </li>
            <li>
              Marca los 3 environments (Production, Preview, Development).
            </li>
            <li>
              <code>SUPABASE_SERVICE_ROLE_KEY</code> marca como Sensitive.
            </li>
            <li>Vercel → Deployments → último → ⋯ → Redeploy.</li>
            <li>Espera ~2 min y refresca esta página.</li>
          </ol>
        </div>
      )}
    </main>
  );
}
