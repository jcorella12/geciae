"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

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
      if (!r.ok) alert(r.error ?? "Error");
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
