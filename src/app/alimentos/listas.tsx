"use client";

import { eliminarAlimentoPropioAccion } from "../acciones";
import {
  BotonEliminarConMensaje,
  useEliminarConMensaje,
} from "../componentes/eliminar";
import type { AlimentoPropio } from "@/lib/datos";

/**
 * Tabla de alimentos propios (KL-21). El borrado puede quedar bloqueado porque
 * una comida guardada usa el alimento, asi que el mensaje se muestra dentro del
 * bloque y no en la fila: la fila desaparece cuando el borrado sale bien.
 */
export function TablaAlimentosPropios({ propios }: { propios: AlimentoPropio[] }) {
  const { despachar, mensajes } = useEliminarConMensaje(
    eliminarAlimentoPropioAccion,
  );

  if (propios.length === 0) {
    return (
      <>
        {mensajes}
        <p className="vacio">Todavía no cargaste alimentos propios.</p>
      </>
    );
  }

  return (
    <>
      {mensajes}
      <table style={{ marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>Alimento</th>
            <th>Porción</th>
            <th className="num">kcal</th>
            <th className="num">P / G / C</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {propios.map((a) => (
            <tr key={a.idNumerico}>
              <td>{a.nombre}</td>
              <td>{a.porcion}</td>
              <td className="num">{a.kcal}</td>
              <td className="num">
                {a.proteina} / {a.grasa} / {a.carbohidrato}
              </td>
              <td className="num">
                <BotonEliminarConMensaje despachar={despachar} id={a.idNumerico} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
