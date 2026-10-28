/**
 * Coach de Kalo V2 (KL-17).
 *
 * Motor de reglas deterministico: con los mismos datos del dia devuelve
 * siempre las mismas recomendaciones, en el mismo orden. Las reglas se evaluan
 * en el orden en que estan escritas y se muestran las tres primeras que se
 * cumplen. No escribe nada: solo lee el resumen del dia.
 */

import type { EstadoDia } from "./calc";

export const MAXIMO_RECOMENDACIONES = 3;

/** Proporcion minima de la meta de proteina que no dispara recomendacion. */
export const UMBRAL_PROTEINA = 0.8;
/** Proporcion minima de la meta de agua que no dispara recomendacion. */
export const UMBRAL_AGUA = 0.6;
/** Dias sin ejercicio a partir de los cuales el Coach lo menciona. */
export const DIAS_SIN_EJERCICIO = 3;

export const SIN_RECOMENDACIONES = "No tengo recomendaciones para hoy. Seguí así.";
export const SIN_PLAN =
  "Completá tu perfil y tu objetivo para que pueda darte recomendaciones.";

export interface DatosCoach {
  /** false cuando falta el perfil o el objetivo. */
  conPlan: boolean;
  consumido: number;
  metaDia: number;
  piso: number;
  estado: EstadoDia | null;
  proteina: number;
  metaProteina: number;
  agua: number;
  metaAgua: number;
  /** Dias seguidos, contando hoy, sin ningun ejercicio registrado. */
  diasSinEjercicio: number;
}

export function recomendaciones(d: DatosCoach): string[] {
  if (!d.conPlan) return [SIN_PLAN];

  const candidatas: string[] = [];

  if (d.consumido < d.piso) {
    candidatas.push(
      `Hoy estás por debajo del piso calórico de seguridad (${d.piso} kcal). Te faltan ${d.piso - d.consumido} kcal para llegar.`,
    );
  }

  if (d.estado === "Excedido") {
    candidatas.push(
      `Te pasaste de la meta del día por ${d.consumido - d.metaDia} kcal.`,
    );
  }

  if (d.proteina < d.metaProteina * UMBRAL_PROTEINA) {
    candidatas.push(
      `Te faltan ${d.metaProteina - d.proteina} g de proteína para llegar a tu meta de ${d.metaProteina} g.`,
    );
  }

  if (d.agua < d.metaAgua * UMBRAL_AGUA) {
    candidatas.push(
      `Llevás ${d.agua} ml de agua de una meta de ${d.metaAgua} ml.`,
    );
  }

  if (d.diasSinEjercicio >= DIAS_SIN_EJERCICIO) {
    candidatas.push(
      `No registraste ejercicio en los últimos ${DIAS_SIN_EJERCICIO} días.`,
    );
  }

  if (d.estado === "En rango") {
    candidatas.push(
      `Vas en rango: llevás ${d.consumido} kcal de una meta de ${d.metaDia} kcal.`,
    );
  }

  if (candidatas.length === 0) return [SIN_RECOMENDACIONES];
  return candidatas.slice(0, MAXIMO_RECOMENDACIONES);
}
