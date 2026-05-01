import { redirect } from "next/navigation";

// Middleware ya redirige `/` según auth, este archivo es respaldo.
export default function RootPage() {
  redirect("/mi-dia");
}
