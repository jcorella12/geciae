// Plantilla de Edge Function (Supabase, runtime Deno).
// Copiar esta carpeta y renombrar a la función real (ej. timbrar-cfdi/, procesar-ia/).
//
// Despliegue:
//   npx supabase functions deploy <nombre>
//
// Invocación desde el cliente:
//   const { data, error } = await supabase.functions.invoke("<nombre>", { body: { ... } });

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface Payload {
  // Reemplazar con el contrato real de la función.
  ejemplo?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TODO: lógica de la función.
  // - Validar payload con Zod.
  // - Ejecutar acción (timbrar CFDI, llamar a Claude, sincronizar Banxico, etc.).
  // - Devolver respuesta tipada.

  return new Response(
    JSON.stringify({ ok: true, recibido: payload }),
    { headers: { "Content-Type": "application/json" } },
  );
});
