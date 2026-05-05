import { createClient } from "@/lib/supabase/server";

export type CostoLevantamiento = {
  costo: number;
  desglose: {
    horas_ingeniero: number;
    tarifa_hora: number;
    monto_horas: number;
    viaticos: number;
    kilometraje: number;
    tarifa_km: number;
    monto_km: number;
  };
};

/**
 * Calcula el costo de un levantamiento aplicando las tarifas vigentes
 * de su empresa al día de la fecha realizada (o solicitada si no hay).
 */
export async function calcularCostoLevantamiento(
  levantamientoId: string,
): Promise<{ ok: true; data: CostoLevantamiento } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: lev } = await supabase
    .from("levantamientos")
    .select(
      "id, empresa_id, horas_ingeniero, viaticos, kilometraje, fecha_realizada, fecha_solicitud",
    )
    .eq("id", levantamientoId)
    .maybeSingle();
  if (!lev) return { ok: false, error: "Levantamiento no encontrado." };

  const fechaBase = (lev.fecha_realizada ?? lev.fecha_solicitud) as string;

  // Buscar tarifas vigentes
  const { data: tarifas } = await supabase
    .from("tarifas_internas")
    .select("concepto, costo_unitario, vigente_desde, vigente_hasta")
    .eq("empresa_id", lev.empresa_id)
    .eq("activa", true)
    .lte("vigente_desde", fechaBase);

  const vigentes = (tarifas ?? []).filter((t) => {
    const hasta = t.vigente_hasta as string | null;
    return !hasta || hasta >= fechaBase;
  });

  const tarifaHora =
    Number(
      vigentes.find((t) => t.concepto === "hora_ingeniero")?.costo_unitario ?? 0,
    ) || 0;
  const tarifaKm =
    Number(
      vigentes.find((t) => t.concepto === "kilometraje")?.costo_unitario ?? 0,
    ) || 0;

  const horas = Number(lev.horas_ingeniero ?? 0);
  const viaticos = Number(lev.viaticos ?? 0);
  const km = Number(lev.kilometraje ?? 0);

  const montoHoras = Math.round(horas * tarifaHora * 100) / 100;
  const montoKm = Math.round(km * tarifaKm * 100) / 100;
  const costo = Math.round((montoHoras + viaticos + montoKm) * 100) / 100;

  return {
    ok: true,
    data: {
      costo,
      desglose: {
        horas_ingeniero: horas,
        tarifa_hora: tarifaHora,
        monto_horas: montoHoras,
        viaticos,
        kilometraje: km,
        tarifa_km: tarifaKm,
        monto_km: montoKm,
      },
    },
  };
}

/**
 * Asegura que existe un sub-centro vendedor dentro del CC operativo de
 * "Ventas" de la empresa. Si no existe el padre o el sub-centro, devuelve
 * null y el caller puede asignar al centro de la empresa por default.
 */
export async function asegurarSubCentroVendedor(
  empresaId: string,
  vendedorId: string,
  vendedorEmail: string,
): Promise<string | null> {
  const supabase = createClient();
  // Busca un CC padre "Ventas" en la empresa (subtipo='operativo' con código que contenga "VENTAS")
  const { data: padre } = await supabase
    .from("centros")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("subtipo", "operativo")
    .ilike("codigo", "%VENTA%")
    .eq("activo", true)
    .maybeSingle();
  if (!padre) return null;

  // ¿Ya existe sub-centro para este vendedor?
  const codigoVend = `VEND-${vendedorId.slice(0, 8).toUpperCase()}`;
  const { data: existente } = await supabase
    .from("centros")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("codigo", codigoVend)
    .maybeSingle();
  if (existente) return existente.id;

  // Crear
  const { data: nuevo } = await supabase
    .from("centros")
    .insert({
      empresa_id: empresaId,
      codigo: codigoVend,
      nombre: `Levantamientos: ${vendedorEmail}`,
      tipo: "costo" as never,
      subtipo: "operativo" as never,
      centro_padre_id: padre.id,
      responsable_id: vendedorId,
      activo: true,
    })
    .select("id")
    .single();
  return nuevo?.id ?? null;
}
