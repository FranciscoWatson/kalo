"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  guardarModoAccion,
  guardarObjetivoAccion,
  guardarPerfilAccion,
  type EstadoFormulario,
} from "../acciones";
import { Mensajes } from "../componentes/mensajes";
import {
  ETIQUETA_ACTIVIDAD,
  type ModoCalculo,
  type NivelActividad,
  type Objetivo,
  type Perfil,
} from "@/lib/calc";
import type { ObjetivoGuardado } from "@/lib/datos";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

/**
 * DF-03: al guardar, la pantalla se vuelve a renderizar y el <select> del DOM
 * quedaba mostrando una opcion distinta de la que React tenia seleccionada.
 * Este gancho repara esa diferencia despues de cada render.
 */
function useSelectSincronizado(valor: string) {
  const referencia = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (referencia.current && referencia.current.value !== valor) {
      referencia.current.value = valor;
    }
  });
  return referencia;
}

const NIVELES: NivelActividad[] = [
  "sedentario",
  "ligero",
  "moderado",
  "activo",
  "muy_activo",
];

export function FormularioPerfil({ perfil }: { perfil: Perfil | null }) {
  const [estado, accion, pendiente] = useActionState(guardarPerfilAccion, INICIAL);

  // Los selects muestran siempre el valor guardado, incluso despues de guardar
  // (criterio 2 de KL-18).
  const [sexo, setSexo] = useState(perfil?.sexo ?? "femenino");
  const [actividad, setActividad] = useState<NivelActividad>(
    perfil?.actividad ?? "sedentario",
  );

  // Los selects muestran siempre el valor guardado (criterio 2 de KL-18).
  // Despues de guardar manda lo que devolvio la accion, porque la pantalla
  // puede volver a renderizarse con los datos anteriores.
  const refSexo = useSelectSincronizado(sexo);
  const refActividad = useSelectSincronizado(actividad);

  const guardado = estado.guardado
    ? `${estado.guardado.sexo}|${estado.guardado.actividad}`
    : `${perfil?.sexo ?? ""}|${perfil?.actividad ?? ""}`;
  const [ultimoGuardado, setUltimoGuardado] = useState(guardado);
  if (guardado !== ultimoGuardado) {
    setUltimoGuardado(guardado);
    const [sexoGuardado, actividadGuardada] = guardado.split("|");
    if (sexoGuardado) setSexo(sexoGuardado as Perfil["sexo"]);
    if (actividadGuardada) setActividad(actividadGuardada as NivelActividad);
  }

  return (
    <form action={accion}>
      <Mensajes
        errores={estado.errores}
        ok={estado.ok ? "Perfil guardado." : null}
      />

      <div className="grilla">
        <div className="campo">
          <label htmlFor="edad">Edad (años)</label>
          <input
            id="edad"
            name="edad"
            type="number"
            step="1"
            defaultValue={perfil?.edad ?? ""}
          />
        </div>

        <div className="campo">
          <label htmlFor="sexo">Sexo</label>
          <select
            id="sexo"
            name="sexo"
            ref={refSexo}
            value={sexo}
            onChange={(e) => setSexo(e.target.value as Perfil["sexo"])}
          >
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="peso">Peso (kg)</label>
          <input
            id="peso"
            name="peso"
            type="number"
            step="0.1"
            defaultValue={perfil?.peso ?? ""}
          />
        </div>

        <div className="campo">
          <label htmlFor="altura">Altura (cm)</label>
          <input
            id="altura"
            name="altura"
            type="number"
            step="1"
            defaultValue={perfil?.altura ?? ""}
          />
        </div>

        <div className="campo">
          <label htmlFor="actividad">Nivel de actividad</label>
          <select
            id="actividad"
            name="actividad"
            ref={refActividad}
            value={actividad}
            onChange={(e) => setActividad(e.target.value as NivelActividad)}
          >
            {NIVELES.map((nivel) => (
              <option key={nivel} value={nivel}>
                {ETIQUETA_ACTIVIDAD[nivel]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" disabled={pendiente} style={{ marginTop: "0.5rem" }}>
        {pendiente ? "Guardando..." : "Guardar perfil"}
      </button>
    </form>
  );
}

export function FormularioObjetivo({
  objetivo,
  pesoObjetivo,
}: {
  objetivo: ObjetivoGuardado | null;
  pesoObjetivo: number | null;
}) {
  const [estado, accion, pendiente] = useActionState(
    guardarObjetivoAccion,
    INICIAL,
  );
  const [tipo, setTipo] = useState<Objetivo>(objetivo?.tipo ?? "mantener");
  const [tasa, setTasa] = useState(
    objetivo ? String(objetivo.tasa.toFixed(1)) : "",
  );
  const [objetivoPeso, setObjetivoPeso] = useState(
    pesoObjetivo !== null ? String(pesoObjetivo) : "",
  );

  // DF-03: los campos vuelven a mostrar lo guardado cuando el objetivo cambia,
  // y solo entonces. Con un efecto, el formulario llegaba a re-renderizarse con
  // los props viejos y pisaba el objetivo que el usuario acababa de elegir.
  const refTipo = useSelectSincronizado(tipo);

  const guardado = estado.guardado
    ? `${estado.guardado.tipo}|${estado.guardado.tasa}|${estado.guardado.pesoObjetivo}`
    : `${objetivo?.tipo ?? ""}|${objetivo ? objetivo.tasa.toFixed(1) : ""}|${pesoObjetivo ?? ""}`;
  const [ultimoGuardado, setUltimoGuardado] = useState(guardado);
  if (guardado !== ultimoGuardado) {
    setUltimoGuardado(guardado);
    const [tipoGuardado, tasaGuardada, pesoGuardado] = guardado.split("|");
    setTipo((tipoGuardado || "mantener") as Objetivo);
    setTasa(tasaGuardada);
    setObjetivoPeso(pesoGuardado);
  }

  return (
    <form action={accion}>
      <Mensajes
        errores={estado.errores}
        avisos={estado.avisos}
        ok={estado.ok && estado.avisos.length === 0 ? "Objetivo guardado." : null}
      />

      <div className="grilla">
        <div className="campo">
          <label htmlFor="tipo">Objetivo</label>
          <select
            id="tipo"
            name="tipo"
            ref={refTipo}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Objetivo)}
          >
            <option value="bajar">Bajar de peso</option>
            <option value="mantener">Mantener el peso</option>
            <option value="subir">Subir de peso</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="tasa">Ritmo (kg/semana)</label>
          <input
            id="tasa"
            name="tasa"
            type="number"
            step="0.1"
            disabled={tipo === "mantener"}
            value={tipo === "mantener" ? "" : tasa}
            onChange={(e) => setTasa(e.target.value)}
            placeholder={tipo === "mantener" ? "0.0" : ""}
          />
          <p className="pie-nota">
            {tipo === "bajar"
              ? "Máximo admisible: 1.0 kg/semana."
              : tipo === "subir"
                ? "Máximo admisible: 0.5 kg/semana."
                : "En mantenimiento el ritmo es 0.0 kg/semana."}
          </p>
        </div>

        <div className="campo">
          <label htmlFor="pesoObjetivo">Peso objetivo (kg, opcional)</label>
          <input
            id="pesoObjetivo"
            name="pesoObjetivo"
            type="number"
            step="0.1"
            disabled={tipo === "mantener"}
            value={tipo === "mantener" ? "" : objetivoPeso}
            onChange={(e) => setObjetivoPeso(e.target.value)}
          />
          <p className="pie-nota">
            Cuando una pesada lo alcanza, el plan pasa al estado Cumplido.
          </p>
        </div>
      </div>

      <button type="submit" disabled={pendiente} style={{ marginTop: "0.5rem" }}>
        {pendiente ? "Guardando..." : "Guardar objetivo"}
      </button>
    </form>
  );
}

export function FormularioPreferencias({ modo }: { modo: ModoCalculo }) {
  const [estado, accion, pendiente] = useActionState(guardarModoAccion, INICIAL);
  const [elegido, setElegido] = useState<ModoCalculo>(modo);

  const modoGuardado = (estado.guardado?.modo as ModoCalculo) ?? modo;
  const [ultimoModo, setUltimoModo] = useState(modoGuardado);
  if (modoGuardado !== ultimoModo) {
    setUltimoModo(modoGuardado);
    setElegido(modoGuardado);
  }

  return (
    <form action={accion}>
      <Mensajes errores={estado.errores} ok={estado.mensaje ?? null} />

      <div className="campo">
        <label>
          <input
            type="radio"
            name="modo"
            value="no_suma"
            checked={elegido === "no_suma"}
            onChange={() => setElegido("no_suma")}
          />{" "}
          El ejercicio no suma a la meta (recomendado)
        </label>
      </div>

      <div className="campo">
        <label>
          <input
            type="radio"
            name="modo"
            value="suma"
            checked={elegido === "suma"}
            onChange={() => setElegido("suma")}
          />{" "}
          El ejercicio suma a la meta del día
        </label>
      </div>

      <button type="submit" disabled={pendiente} style={{ marginTop: "0.5rem" }}>
        {pendiente ? "Guardando..." : "Guardar preferencia"}
      </button>
    </form>
  );
}
