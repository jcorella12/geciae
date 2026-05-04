"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { devengarInteresesHoy } from "../prestamos/actions";

export function DevengarBtn() {
  const [pending, start] = useTransition();

  function devengar() {
    start(async () => {
      const r = await devengarInteresesHoy();
      if (!r.ok) {
        alert(`Error: ${r.error}`);
        return;
      }
      alert(`${r.count} préstamo(s) devengaron intereses del día.`);
    });
  }

  return (
    <Button onClick={devengar} disabled={pending} variant="outline" size="sm">
      {pending ? "Devengando…" : "Devengar intereses hoy"}
    </Button>
  );
}
