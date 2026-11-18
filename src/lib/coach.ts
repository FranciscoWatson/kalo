/**
 * Coach de Kalo (KL-17 en la V2, ampliado por KL-20 en la V3).
 *
 * Motor de reglas deterministico: con los mismos datos devuelve siempre las
 * mismas recomendaciones, en el mismo orden. Las reglas se evaluan en el orden
 * en que estan escritas y se muestran las tres primeras que se cumplen. No
 * escribe nada: solo lee el dia y la semana.
 *
 * V3: se agregan cuatro reglas que miran el historial (tendencia del peso,
 * hidratacion despues de entrenar, adherencia de la semana y racha de dias en
 * rango).
 */

import type { EstadoDia, Objetivo } from "./calc";
import { formatearPeso } from "./calc";

export const MAXIMO_RECOMENDACIONES = 3;

/** Proporcion minima de la meta de proteina que no dispara recomendacion. */
export const UMBRAL_PROTEINA = 0.8;
/** Proporcion minima de la meta de agua que no dispara recomendacion. */
export const UMBRAL_AGUA = 0.6;
/** Dias sin ejercicio a partir de los cuales el Coach lo menciona. */
export const DIAS_SIN_EJERCICIO = 3;
/** Minutos de ejercicio a partir de los cuales el Coach mira la hidratacion. */
export const MINUTOS_PARA_HIDRATACION = 60;
/** Adherencia semanal por debajo de la cual el Coach lo menciona. */
export const UMBRAL_ADHERENCIA = 50;
/** Dias con registros minimos para que la adherencia semanal sea significativa. */
export const DIAS_PARA_ADHERENCIA = 3;
/** Dias seguidos en rango a partir de los cuales el Coach lo reconoce. */
export const RACHA_MINIMA = 3;
/** Variacion de peso, en kg, a partir de la cual el Coach mira la tendencia. */
export const TENDENCIA_MINIMA = 0.3;

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
  /** Minutos de ejercicio registrados hoy. */
  minutosEjercicio: number;
  /** Objetivo del plan, para leer la tendencia del peso. */
  objetivo: Objetivo | null;
  /** Peso de la ultima pesada menos el de la anterior. null si no hay dos. */
  tendenciaPeso: number | null;
  /** Dias de los ultimos 7 con al menos una comida registrada. */
  diasConRegistros: number;
  /** De esos dias, cuantos terminaron en rango. */
  diasEnRango: number;
  /** Dias seguidos terminando hoy con estado En rango. */
  rachaEnRango: number;
}

const ETIQUETA_OBJETIVO: Record<Objetivo, string> = {
  bajar: "bajar de peso",
  mantener: "mantener el peso",
  subir: "subir de peso",
};

/** La tendencia del peso va en contra del objetivo declarado. */
function tendenciaEnContra(d: DatosCoach): boolean {
  if (d.tendenciaPeso === null || !d.objetivo || d.objetivo === "mantener") {
    return false;
  }
  return d.objetivo === "bajar"
    ? d.tendenciaPeso >= TENDENCIA_MINIMA
    : d.tendenciaPeso <= -TENDENCIA_MINIMA;
}

export function recomendaciones(d: DatosCoach): string[] {
  if (!d.conPlan) return [SIN_PLAN];

  const candidatas: string[] = [];

  // 2 — piso calorico de seguridad
  if (d.consumido < d.piso) {
    candidatas.push(
      `Hoy estás por debajo del piso calórico de seguridad (${d.piso} kcal). Te faltan ${d.piso - d.consumido} kcal para llegar.`,
    );
  }

  // 3 — excedido
  if (d.estado === "Excedido") {
    candidatas.push(
      `Te pasaste de la meta del día por ${d.consumido - d.metaDia} kcal.`,
    );
  }

  // 4 — el peso se mueve en contra del objetivo (V3)
  if (tendenciaEnContra(d) && d.tendenciaPeso !== null && d.objetivo) {
    candidatas.push(
      `Tu peso varió ${formatearPeso(Math.abs(d.tendenciaPeso))} kg desde la pesada anterior y tu objetivo es ${ETIQUETA_OBJETIVO[d.objetivo]}. Revisá el balance de la semana.`,
    );
  }

  // 5 — proteina
  if (d.proteina < d.metaProteina * UMBRAL_PROTEINA) {
    candidatas.push(
      `Te faltan ${d.metaProteina - d.proteina} g de proteína para llegar a tu meta de ${d.metaProteina} g.`,
    );
  }

  // 6 y 7 — hidratacion. La 6 reemplaza a la 7 los dias que hubo entrenamiento.
  const faltaAgua = d.agua < d.metaAgua;
  if (d.minutosEjercicio >= MINUTOS_PARA_HIDRATACION && faltaAgua) {
    candidatas.push(
      `Hoy entrenaste ${d.minutosEjercicio} minutos: te faltan ${d.metaAgua - d.agua} ml de agua para la meta de ${d.metaAgua} ml.`,
    );
  } else if (d.agua < d.metaAgua * UMBRAL_AGUA) {
    candidatas.push(
      `Llevás ${d.agua} ml de agua de una meta de ${d.metaAgua} ml.`,
    );
  }

  // 8 — adherencia de la semana (V3)
  if (
    d.diasConRegistros >= DIAS_PARA_ADHERENCIA &&
    (d.diasEnRango / d.diasConRegistros) * 100 < UMBRAL_ADHERENCIA
  ) {
    candidatas.push(
      `Esta semana cumpliste la meta ${d.diasEnRango} de ${d.diasConRegistros} días. Planificá el día antes de empezarlo.`,
    );
  }

  // 9 — sin ejercicio
  if (d.diasSinEjercicio >= DIAS_SIN_EJERCICIO) {
    candidatas.push(
      `No registraste ejercicio en los últimos ${DIAS_SIN_EJERCICIO} días.`,
    );
  }

  // 10 — racha en rango (V3)
  if (d.rachaEnRango >= RACHA_MINIMA) {
    candidatas.push(`Llevás ${d.rachaEnRango} días seguidos en rango. Seguí así.`);
  }

  // 11 — en rango
  if (d.estado === "En rango") {
    candidatas.push(
      `Vas en rango: llevás ${d.consumido} kcal de una meta de ${d.metaDia} kcal.`,
    );
  }

  if (candidatas.length === 0) return [SIN_RECOMENDACIONES];
  return candidatas.slice(0, MAXIMO_RECOMENDACIONES);
}
