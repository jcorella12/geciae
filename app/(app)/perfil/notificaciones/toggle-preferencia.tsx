"use client";

import { useState, useTransition } from "react";

import { actualizarPreferenciaNotif } from "./actions";

export function TogglePreferencia({
  tipo,
  initialRecibir,
}: {
  tipo: string;
  initialRecibir: boolean;
}) {
  const [recibir, setRecibir] = useState(initialRecibir);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const nuevo = !recibir;
    setRecibir(nuevo);
    startTransition(async () => {
      const r = await actualizarPreferenciaNotif(tipo, nuevo);
      if (!r.ok) setRecibir(!nuevo); // revert
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        recibir ? "bg-emerald-500" : "bg-gray-300"
      } ${pending ? "opacity-60" : ""}`}
      aria-label={`${recibir ? "Recibiendo" : "Silenciado"}: ${tipo}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          recibir ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
