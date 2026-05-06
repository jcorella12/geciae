import { FEATURES } from "@/lib/feature-flags";

import DashboardV1 from "./page-v1";
import DashboardV2 from "./page-v2";

export const metadata = { title: "Dashboard ejecutivo" };
export const dynamic = "force-dynamic";

/**
 * Sprint Z.1.5 — Dashboard con feature flag para rollout gradual.
 *
 * Por defecto sirve la versión v1 (saturada, 1,514 líneas, en producción
 * desde el inicio del proyecto). Con NEXT_PUBLIC_DASHBOARD_V2=true se
 * activa la versión v2 configurable con widgets.
 *
 * Una vez validado v2 con usuarios reales y ajustadas las plantillas,
 * eliminar el switch y dejar solo v2 (también borrar page-v1.tsx).
 */
export default async function DashboardPage() {
  return FEATURES.DASHBOARD_V2 ? <DashboardV2 /> : <DashboardV1 />;
}
