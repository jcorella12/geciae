import { obtenerVinculos, puedeGestionarClientes } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ContactosList, type Contacto } from "./contactos-list";

export const dynamic = "force-dynamic";

export default async function ClienteContactosPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puedeEditar = puedeGestionarClientes(v);

  const { data: contactos } = await supabase
    .from("contactos_cliente")
    .select(
      "id, nombre, puesto, email, telefono, whatsapp, tipo, es_principal",
    )
    .eq("cliente_id", params.id)
    .eq("activo", true)
    .order("es_principal", { ascending: false })
    .order("nombre");

  return (
    <ContactosList
      clienteId={params.id}
      contactos={(contactos ?? []) as Contacto[]}
      puedeEditar={puedeEditar}
    />
  );
}
