import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HealthzPage() {
  const supabase = createClient();
  const { error, count } = await supabase
    .from("empresas")
    .select("*", { count: "exact", head: true });

  const status = {
    ok: !error,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    empresas_count: count,
    error: error?.message ?? null,
    timestamp: new Date().toISOString(),
  };

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-semibold">
        Healthz — conexión Supabase
      </h1>
      <pre className="overflow-auto rounded-md border border-border bg-card p-4 text-sm shadow-sm">
        {JSON.stringify(status, null, 2)}
      </pre>
      <p className="mt-4 text-sm text-muted-foreground">
        {status.ok
          ? "✓ Conexión OK. La tabla empresas existe en el proyecto remoto."
          : "✗ Error de conexión — revisar .env.local y políticas RLS."}
      </p>
    </main>
  );
}
