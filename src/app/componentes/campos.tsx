"use client";

import { useEffect, useRef, useState } from "react";
import type { EstadoFormulario } from "../acciones";

/**
 * KL-22 (y DF-03, DF-09): React vuelve a renderizar el formulario cuando la
 * accion de servidor termina y, al hacerlo, el DOM queda mostrando un valor
 * distinto del que el componente tiene en su estado. La pantalla muestra una
 * opcion y el formulario manda otra.
 *
 * Este gancho repara esa diferencia despues de cada render. Sirve para selects
 * y para inputs: devolver la referencia y ponerla en el campo alcanza.
 *
 * En la V2 esto existia solo dentro de la pantalla Perfil, y por eso el resto
 * de los formularios seguia perdiendo el valor elegido.
 */
export function useCampoSincronizado<
  T extends HTMLInputElement | HTMLSelectElement,
>(valor: string) {
  const referencia = useRef<T>(null);
  useEffect(() => {
    if (referencia.current && referencia.current.value !== valor) {
      referencia.current.value = valor;
    }
  });
  return referencia;
}

/** Lo mismo, para un grupo de botones de radio (KL-22, criterio 1). */
export function useRadioSincronizado(marcado: boolean) {
  const referencia = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (referencia.current && referencia.current.checked !== marcado) {
      referencia.current.checked = marcado;
    }
  });
  return referencia;
}

/**
 * KL-22, criterios 2 y 4: despues de un alta correcta los campos de texto y
 * numericos vuelven a su valor por defecto; si el alta termino en error, no se
 * limpia nada. Ejecuta `limpiar` una sola vez por cada alta correcta.
 */
export function useLimpiarTrasAlta(
  estado: EstadoFormulario,
  limpiar: () => void,
) {
  const [ultimo, setUltimo] = useState(estado);
  if (estado !== ultimo) {
    setUltimo(estado);
    if (estado.ok) limpiar();
  }
}
