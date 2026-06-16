import { redirect } from "next/navigation";

/**
 * Vista Real se consolidó como un tab dentro de Estados Gerenciales (sprint
 * PODA): un único punto de entrada para la información gerencial. Se conserva
 * esta ruta como redirect por marcadores/enlaces viejos.
 */
export default function VistaRealRedirect() {
  redirect("/finanzas/estados-gerenciales/vista-real");
}
