import { redirect } from "next/navigation";

/**
 * /mi-espacio quedó como landing duplicada de /mi-dia (sprint PODA): sin
 * enlaces entrantes y con cards que apuntaban a /mi-dia, /proyectos y /perfil.
 * Se colapsa en /mi-dia (la landing personal canónica, post-login y en el
 * sidebar). Se conserva la ruta como redirect por si quedan marcadores viejos.
 */
export default function MiEspacioPage() {
  redirect("/mi-dia");
}
