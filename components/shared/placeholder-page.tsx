import { Construction } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  espacio: string;
  titulo: string;
  sprint: string; // ej. "Sprint 2 (semanas 4-5)" o "Fase 1.5"
  resumen: string;
  funcionalidades?: string[];
};

export function PlaceholderPage({
  espacio,
  titulo,
  sprint,
  resumen,
  funcionalidades,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {espacio}
      </p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight">{titulo}</h1>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-secondary p-2">
            <Construction className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">En construcción — {sprint}</p>
            <p className="mt-1 text-sm text-muted-foreground">{resumen}</p>

            {funcionalidades && funcionalidades.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {funcionalidades.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/mi-dia">← Volver a Mi día</Link>
        </Button>
      </div>
    </div>
  );
}
