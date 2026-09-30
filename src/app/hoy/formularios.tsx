"use client";

import { useActionState } from "react";
import {
  agregarAguaAccion,
  agregarComidaAccion,
  type EstadoFormulario,
} from "../acciones";
import { Mensajes } from "../componentes/mensajes";
import type { Alimento } from "@/lib/catalogo";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

export function FormularioComida({ catalogo }: { catalogo: Alimento[] }) {
  const [estado, accion, pendiente] = useActionState(
    agregarComidaAccion,
    INICIAL,
  );

  return (
    <form action={accion}>
      <Mensajes errores={estado.errores} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "3 1 260px" }}>
          <label htmlFor="alimento">Alimento</label>
          <select id="alimento" name="alimento" defaultValue={catalogo[0]?.id}>
            {catalogo.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} — {a.porcion} ({a.kcal} kcal)
              </option>
            ))}
          </select>
        </div>

        <div className="campo" style={{ flex: "1 1 110px" }}>
          <label htmlFor="porciones">Porciones</label>
          <input
            id="porciones"
            name="porciones"
            type="number"
            step="0.1"
            defaultValue="1"
          />
        </div>

        <button type="submit" disabled={pendiente}>
          {pendiente ? "Agregando..." : "Agregar"}
        </button>
      </div>
    </form>
  );
}

export function FormularioAgua() {
  const [estado, accion, pendiente] = useActionState(agregarAguaAccion, INICIAL);

  return (
    <form action={accion}>
      <Mensajes errores={estado.errores} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "1 1 140px" }}>
          <label htmlFor="ml">Agua (ml)</label>
          <input id="ml" name="ml" type="number" step="1" defaultValue="250" />
        </div>

        <button type="submit" disabled={pendiente}>
          {pendiente ? "Registrando..." : "Registrar agua"}
        </button>
      </div>
    </form>
  );
}
