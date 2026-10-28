"use client";

import { useActionState, useState } from "react";
import {
  agregarAguaAccion,
  agregarComidaAccion,
  agregarEjercicioAccion,
  registrarComidaGuardadaAccion,
  type EstadoFormulario,
} from "../acciones";
import { Mensajes } from "../componentes/mensajes";
import { ETIQUETA_INTENSIDAD, type Intensidad } from "@/lib/calc";
import { EJERCICIOS } from "@/lib/ejercicios";
import type { ComidaGuardada, OpcionAlimento } from "@/lib/datos";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

const INTENSIDADES: Intensidad[] = ["suave", "moderada", "intensa"];

export function FormularioComida({ opciones }: { opciones: OpcionAlimento[] }) {
  const [estado, accion, pendiente] = useActionState(
    agregarComidaAccion,
    INICIAL,
  );
  const [alimento, setAlimento] = useState(opciones[0]?.valor ?? "");

  const delCatalogo = opciones.filter((o) => !o.propio);
  const propios = opciones.filter((o) => o.propio);

  return (
    <form action={accion}>
      <Mensajes errores={estado.errores} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "3 1 260px" }}>
          <label htmlFor="alimento">Alimento</label>
          <select
            id="alimento"
            name="alimento"
            value={alimento}
            onChange={(e) => setAlimento(e.target.value)}
          >
            <optgroup label="Catálogo">
              {delCatalogo.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.nombre} — {o.porcion} ({o.kcal} kcal)
                </option>
              ))}
            </optgroup>
            {propios.length > 0 ? (
              <optgroup label="Mis alimentos">
                {propios.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.nombre} — {o.porcion} ({o.kcal} kcal)
                  </option>
                ))}
              </optgroup>
            ) : null}
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

export function FormularioComidaGuardada({
  comidas,
}: {
  comidas: ComidaGuardada[];
}) {
  const [estado, accion, pendiente] = useActionState(
    registrarComidaGuardadaAccion,
    INICIAL,
  );
  const [comida, setComida] = useState(String(comidas[0]?.id ?? ""));

  if (comidas.length === 0) {
    return (
      <p className="vacio">
        Todavía no guardaste ninguna comida. Podés crearlas desde la pantalla
        Alimentos.
      </p>
    );
  }

  return (
    <form action={accion}>
      <Mensajes errores={estado.errores} ok={estado.mensaje ?? null} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "3 1 260px" }}>
          <label htmlFor="comida">Mis comidas guardadas</label>
          <select
            id="comida"
            name="comida"
            value={comida}
            onChange={(e) => setComida(e.target.value)}
          >
            {comidas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — {c.items.length} alimentos ({c.kcal} kcal)
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={pendiente}>
          {pendiente ? "Registrando..." : "Registrar comida"}
        </button>
      </div>
    </form>
  );
}

export function FormularioEjercicio() {
  const [estado, accion, pendiente] = useActionState(
    agregarEjercicioAccion,
    INICIAL,
  );
  const [ejercicio, setEjercicio] = useState("");
  const [intensidad, setIntensidad] = useState<Intensidad>("moderada");

  return (
    <form action={accion}>
      <Mensajes errores={estado.errores} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "3 1 220px" }}>
          <label htmlFor="ejercicio">Ejercicio</label>
          <select
            id="ejercicio"
            name="ejercicio"
            value={ejercicio}
            onChange={(e) => setEjercicio(e.target.value)}
          >
            <option value="">Elegí un ejercicio</option>
            {EJERCICIOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo" style={{ flex: "1 1 120px" }}>
          <label htmlFor="minutos">Duración (min)</label>
          <input id="minutos" name="minutos" type="number" step="1" defaultValue="30" />
        </div>

        <div className="campo" style={{ flex: "1 1 140px" }}>
          <label htmlFor="intensidad">Intensidad</label>
          <select
            id="intensidad"
            name="intensidad"
            value={intensidad}
            onChange={(e) => setIntensidad(e.target.value as Intensidad)}
          >
            {INTENSIDADES.map((i) => (
              <option key={i} value={i}>
                {ETIQUETA_INTENSIDAD[i]}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={pendiente}>
          {pendiente ? "Registrando..." : "Registrar ejercicio"}
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
