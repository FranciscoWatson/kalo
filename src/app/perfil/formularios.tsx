"use client";

import { useActionState, useState } from "react";
import {
  guardarObjetivoAccion,
  guardarPerfilAccion,
  type EstadoFormulario,
} from "../acciones";
import { Mensajes } from "../componentes/mensajes";
import { ETIQUETA_ACTIVIDAD, type NivelActividad, type Objetivo, type Perfil } from "@/lib/calc";
import type { ObjetivoGuardado } from "@/lib/datos";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

const NIVELES: NivelActividad[] = [
  "sedentario",
  "ligero",
  "moderado",
  "activo",
  "muy_activo",
];

export function FormularioPerfil({ perfil }: { perfil: Perfil | null }) {
  const [estado, accion, pendiente] = useActionState(guardarPerfilAccion, INICIAL);

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
          <select id="sexo" name="sexo" defaultValue={perfil?.sexo ?? "femenino"}>
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
            defaultValue={perfil?.actividad ?? "sedentario"}
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
}: {
  objetivo: ObjetivoGuardado | null;
}) {
  const [estado, accion, pendiente] = useActionState(
    guardarObjetivoAccion,
    INICIAL,
  );
  const [tipo, setTipo] = useState<Objetivo>(objetivo?.tipo ?? "mantener");

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
            defaultValue={objetivo?.tasa ?? ""}
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
      </div>

      <button type="submit" disabled={pendiente} style={{ marginTop: "0.5rem" }}>
        {pendiente ? "Guardando..." : "Guardar objetivo"}
      </button>
    </form>
  );
}
