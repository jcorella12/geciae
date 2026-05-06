"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { exportarVistaRealExcel } from "./actions";

export function BotonExportar({ empresaId }: { empresaId?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (
      !window.confirm(
        "Vas a exportar información gerencial confidencial. Cada exportación queda registrada. ¿Continuar?",
      )
    ) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const r = await exportarVistaRealExcel(empresaId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const blob = new Blob([r.buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleClick} disabled={pending} variant="default">
        <Download className="mr-1.5 h-4 w-4" />
        {pending ? "Generando…" : "Exportar Excel"}
      </Button>
      {error && (
        <span className="text-[11px] text-danger-deep">{error}</span>
      )}
    </div>
  );
}
