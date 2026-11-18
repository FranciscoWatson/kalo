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
import {
  useCampoSincronizado,
  useLimpiarTrasAlta,
} from "../componentes/campos";
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
  const [porciones, setPorciones] = useState("1");

  // KL-22: el select conserva lo elegido y las porciones vuelven a 1.
  useLimpiarTrasAlta(estado, () => setPorciones("1"));

  const refAlimento = useCampoSincronizado<HTMLSelectElement>(alimento);
  const refPorciones = useCampoSincronizado<HTMLInputElement>(porciones);

  const delCatalogo = opciones.filter((o) => !o.propio);
  const propios = opciones.filter((o) => o.propio);

  return (
    <form action={accion} noValidate>
      <Mensajes errores={estado.errores} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "3 1 260px" }}>
          <label htmlFor="alimento">Alimento</label>
          <select
            id="alimento"
            name="alimento"
            ref={refAlimento}
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
            type="text"
            inputMode="decimal"
            ref={refPorciones}
            value={porciones}
            onChange={(e) => setPorciones(e.target.value)}
          />
        </div>

        <button type="submit" disabled={pendiente}>
          {pendiente ? "Agregando..." : "Agregar comida"}
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
  const [comida, setComida] = useState(
    comidas[0] ? String(comidas[0].id) : "",
  );
  const refComida = useCampoSincronizado<HTMLSelectElement>(comida);

  if (comidas.length === 0) {
    return (
      <p className="vacio">
        Todavía no guardaste ninguna comida. Podés crearlas desde la pantalla
        Alimentos.
      </p>
    );
  }

  return (
    <form action={accion} noValidate>
      <Mensajes errores={estado.errores} ok={estado.mensaje ?? null} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "3 1 260px" }}>
          <label htmlFor="comida">Mis comidas guardadas</label>
          <select
            id="comida"
            name="comida"
            ref={refComida}
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
  const [minutos, setMinutos] = useState("30");
  const [intensidad, setIntensidad] = useState<Intensidad>("moderada");

  // KL-22: los selects conservan lo elegido, la duración vuelve a 30.
  useLimpiarTrasAlta(estado, () => setMinutos("30"));

  const refEjercicio = useCampoSincronizado<HTMLSelectElement>(ejercicio);
  const refMinutos = useCampoSincronizado<HTMLInputElement>(minutos);
  const refIntensidad = useCampoSincronizado<HTMLSelectElement>(intensidad);

  return (
    <form action={accion} noValidate>
      <Mensajes errores={estado.errores} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "3 1 220px" }}>
          <label htmlFor="ejercicio">Ejercicio</label>
          <select
            id="ejercicio"
            name="ejercicio"
            ref={refEjercicio}
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
          {/* DF-08: sin step ni min, para que el mensaje lo dé la aplicación. */}
          <input
            id="minutos"
            name="minutos"
            type="text"
            inputMode="decimal"
            ref={refMinutos}
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
          />
        </div>

        <div className="campo" style={{ flex: "1 1 140px" }}>
          <label htmlFor="intensidad">Intensidad</label>
          <select
            id="intensidad"
            name="intensidad"
            ref={refIntensidad}
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
  const [ml, setMl] = useState("250");

  useLimpiarTrasAlta(estado, () => setMl("250"));
  const refMl = useCampoSincronizado<HTMLInputElement>(ml);

  return (
    <form action={accion} noValidate>
      <Mensajes errores={estado.errores} />

      <div className="fila-form">
        <div className="campo" style={{ flex: "1 1 140px" }}>
          <label htmlFor="ml">Agua (ml)</label>
          <input
            id="ml"
            name="ml"
            type="text"
            inputMode="decimal"
            ref={refMl}
            value={ml}
            onChange={(e) => setMl(e.target.value)}
          />
        </div>

        <button type="submit" disabled={pendiente}>
          {pendiente ? "Registrando..." : "Registrar agua"}
        </button>
      </div>
    </form>
  );
}
