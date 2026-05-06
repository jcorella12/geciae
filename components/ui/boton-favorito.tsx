"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";

import { agregarFavorito, quitarFavorito } from "@/lib/favoritos/actions";

export function BotonFavorito({
  entidadTipo,
  entidadId,
  esFavoritoInicial,
  etiqueta,
}: {
  entidadTipo: string;
  entidadId: string;
  esFavoritoInicial: boolean;
  etiqueta?: string;
}) {
  const [esFavorito, setEsFavorito] = useState(esFavoritoInicial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const nuevo = !esFavorito;
    setEsFavorito(nuevo); // optimistic
    startTransition(async () => {
      const res = nuevo
        ? await agregarFavorito(entidadTipo, entidadId, etiqueta)
        : await quitarFavorito(entidadTipo, entidadId);
      if (!res.ok) setEsFavorito(!nuevo); // revert
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        esFavorito
          ? "text-amber-500 hover:text-amber-600"
          : "text-ink-3 hover:text-ink-1"
      }`}
    >
      <Star className="h-4 w-4" fill={esFavorito ? "currentColor" : "none"} />
    </button>
  );
}
