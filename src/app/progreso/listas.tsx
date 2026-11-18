"use client";

import { eliminarPesadaAccion } from "../acciones";
import {
  BotonEliminarConMensaje,
  useEliminarConMensaje,
} from "../componentes/eliminar";
import { formatearFecha, formatearPeso } from "@/lib/calc";
import type { Pesada } from "@/lib/datos";

/**
 * Historial de pesadas (KL-21). Al eliminar la pesada que el plan usa como
 * referencia, el plan re-apunta y hay que decirlo: el mensaje vive en el bloque
 * porque la fila ya no existe cuando el mensaje llega.
 */
export function TablaPesadas({ pesadas }: { pesadas: Pesada[] }) {
  const { despachar, mensajes } = useEliminarConMensaje(eliminarPesadaAccion);

  if (pesadas.length === 0) {
    return (
      <>
        {mensajes}
        <p className="vacio">Todavía no registraste ninguna pesada.</p>
      </>
    );
  }

  return (
    <>
      {mensajes}
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th className="num">Peso</th>
            <th className="num">Variación</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {pesadas.map((p) => (
            <tr key={p.id}>
              <td>{formatearFecha(p.fecha)}</td>
              <td className="num">{formatearPeso(p.peso)} kg</td>
              <td className="num">
                {p.variacion === null
                  ? ""
                  : `${p.variacion > 0 ? "+" : ""}${p.variacion.toFixed(1)} kg`}
              </td>
              <td className="num">
                <BotonEliminarConMensaje despachar={despachar} id={p.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
