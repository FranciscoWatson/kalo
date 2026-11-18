"use client";

import { useActionState, useState } from "react";
import { guardarPesadaAccion, type EstadoFormulario } from "../acciones";
import { Mensajes } from "../componentes/mensajes";
import {
  useCampoSincronizado,
  useLimpiarTrasAlta,
} from "../componentes/campos";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

export function FormularioPesada({ hoy, peso }: { hoy: string; peso: number }) {
  const [estado, accion, pendiente] = useActionState(guardarPesadaAccion, INICIAL);

  const [fecha, setFecha] = useState(hoy);
  const [valorPeso, setValorPeso] = useState(String(peso));

  // KL-22: tras registrar, la fecha vuelve a hoy y el peso al del perfil.
  useLimpiarTrasAlta(estado, () => {
    setFecha(hoy);
    setValorPeso(String(peso));
  });

  const refFecha = useCampoSincronizado<HTMLInputElement>(fecha);
  const refPeso = useCampoSincronizado<HTMLInputElement>(valorPeso);

  return (
    <form action={accion} noValidate>
      <Mensajes
        errores={estado.errores}
        avisos={estado.avisos}
        ok={estado.ok && estado.avisos.length === 0 ? "Pesada registrada." : null}
      />

      <div className="fila-form">
        <div className="campo" style={{ flex: "1 1 180px" }}>
          <label htmlFor="fecha">Fecha</label>
          {/* DF-08: sin max, para que la fecha futura la rechace la aplicación
              con su propio mensaje y no el cartel del navegador. */}
          <input
            id="fecha"
            name="fecha"
            type="date"
            ref={refFecha}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <div className="campo" style={{ flex: "1 1 140px" }}>
          <label htmlFor="peso">Peso (kg)</label>
          <input
            id="peso"
            name="peso"
            type="text"
            inputMode="decimal"
            ref={refPeso}
            value={valorPeso}
            onChange={(e) => setValorPeso(e.target.value)}
          />
        </div>

        <button type="submit" disabled={pendiente}>
          {pendiente ? "Registrando..." : "Registrar pesada"}
        </button>
      </div>
    </form>
  );
}
