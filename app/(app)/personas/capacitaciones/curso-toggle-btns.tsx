"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/notify";

import { desactivarCurso, reactivarCurso } from "./actions";

export function CursoToggleBtns({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const r = activo ? await desactivarCurso(id) : await reactivarCurso(id);
      if (!r.ok) notify({ message: r.error ?? "Error", variant: "error" });
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={pending}
    >
      {pending ? "…" : activo ? "Desactivar" : "Reactivar"}
    </Button>
  );
}
