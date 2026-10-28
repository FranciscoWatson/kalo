"use client";

import { useActionState } from "react";
import { guardarPesadaAccion, type EstadoFormulario } from "../acciones";
import { Mensajes } from "../componentes/mensajes";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

export function FormularioPesada({ hoy, peso }: { hoy: string; peso: number }) {
  const [estado, accion, pendiente] = useActionState(guardarPesadaAccion, INICIAL);

  return (
    <form action={accion}>
      <Mensajes
        errores={estado.errores}
        avisos={estado.avisos}
        ok={estado.ok && estado.avisos.length === 0 ? "Pesada registrada." : null}
      />

      <div className="fila-form">
        <div className="campo" style={{ flex: "1 1 180px" }}>
          <label htmlFor="fecha">Fecha</label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={hoy}
            max={hoy}
          />
        </div>

        <div className="campo" style={{ flex: "1 1 140px" }}>
          <label htmlFor="peso">Peso (kg)</label>
          <input
            id="peso"
            name="peso"
            type="number"
            step="0.1"
            defaultValue={peso}
          />
        </div>

        <button type="submit" disabled={pendiente}>
          {pendiente ? "Registrando..." : "Registrar pesada"}
        </button>
      </div>
    </form>
  );
}
