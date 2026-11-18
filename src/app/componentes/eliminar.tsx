"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "../acciones";
import { Mensajes } from "./mensajes";

/**
 * Boton de borrado con confirmacion previa (KL-18, criterio 1).
 * Recibe la accion de servidor que corresponde a lo que se esta eliminando.
 */
export const TEXTO_CONFIRMACION = "¿Querés eliminar este registro?";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

export function BotonEliminar({
  accion,
  id,
  etiqueta = "Eliminar",
}: {
  accion: (datos: FormData) => Promise<void>;
  id: number;
  etiqueta?: string;
}) {
  return (
    <form
      action={accion}
      onSubmit={(evento) => {
        if (!window.confirm(TEXTO_CONFIRMACION)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="enlace">
        {etiqueta}
      </button>
    </form>
  );
}

/**
 * V3 (KL-21): borrado que puede devolver un mensaje —porque quedo bloqueado o
 * porque cambio otra cosa, como la referencia del plan—. El estado vive en el
 * bloque y no en la fila, porque la fila desaparece junto con el registro y se
 * llevaria el mensaje con ella.
 */
export function useEliminarConMensaje(
  accion: (prev: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>,
) {
  const [estado, despachar] = useActionState(accion, INICIAL);

  return {
    despachar,
    mensajes: <Mensajes errores={estado.errores} ok={estado.mensaje ?? null} />,
  };
}

/** Fila de borrado que despacha sobre el estado del bloque. */
export function BotonEliminarConMensaje({
  despachar,
  id,
  etiqueta = "Eliminar",
}: {
  despachar: (datos: FormData) => void;
  id: number;
  etiqueta?: string;
}) {
  return (
    <form
      action={despachar}
      onSubmit={(evento) => {
        if (!window.confirm(TEXTO_CONFIRMACION)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="enlace">
        {etiqueta}
      </button>
    </form>
  );
}
