"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/notify";

import { devengarInteresesHoy } from "../prestamos/actions";

export function DevengarBtn() {
  const [pending, start] = useTransition();

  function devengar() {
    start(async () => {
      const r = await devengarInteresesHoy();
      if (!r.ok) {
        notify({ message: r.error ?? "Error", variant: "error" });
        return;
      }
      notify({
        message: `${r.count} préstamo(s) devengaron intereses del día.`,
        variant: "success",
      });
    });
  }

  return (
    <Button onClick={devengar} disabled={pending} variant="outline" size="sm">
      {pending ? "Devengando…" : "Devengar intereses hoy"}
    </Button>
  );
}
