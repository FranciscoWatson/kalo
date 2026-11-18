/**
 * Exportacion del resumen semanal a CSV (KL-19).
 *
 * Modulo puro, igual que calc.ts: no toca la base de datos ni el navegador.
 * Recibe las filas ya armadas y devuelve el texto del archivo, asi se puede
 * verificar con un guion sin levantar la aplicacion.
 */

import { formatearFecha } from "./calc";

/** Un dia de la semana exportada. */
export interface FilaSemana {
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  consumido: number;
  gastado: number;
  metaDia: number;
  balance: number;
  /** Estado del dia, o null cuando el dia no tiene registros. */
  estado: string | null;
  agua: number;
  proteina: number;
  grasa: number;
  carbohidrato: number;
}

export const SEPARADOR_CSV = ";";
export const BOM = "﻿";
export const ESTADO_SIN_REGISTROS = "Sin registros";
export const DIAS_EXPORTADOS = 7;

export const ENCABEZADO_CSV = [
  "Fecha",
  "Consumido (kcal)",
  "Gastado (kcal)",
  "Meta del dia (kcal)",
  "Balance (kcal)",
  "Estado",
  "Agua (ml)",
  "Proteina (g)",
  "Grasa (g)",
  "Carbohidratos (g)",
].join(SEPARADOR_CSV);

export const LEYENDA_EXPORTAR =
  "Incluye los últimos 7 días, incluso los que no tienen registros.";
export const SIN_PLAN_EXPORTAR =
  "Necesitás definir tu perfil y tu objetivo para exportar la semana.";

export function nombreArchivoResumen(fecha: string): string {
  return `kalo-resumen-${fecha}.csv`;
}

/** Entero, tal como lo pide el criterio 8 de KL-19. */
function entero(valor: number): string {
  return String(Math.round(valor));
}

/** Un decimal con coma, para los macronutrientes. */
function conUnDecimal(valor: number): string {
  return (Math.round(valor * 10) / 10).toFixed(1).replace(".", ",");
}

function linea(fila: FilaSemana): string {
  return [
    formatearFecha(fila.fecha),
    entero(fila.consumido),
    entero(fila.gastado),
    entero(fila.metaDia),
    entero(fila.balance),
    fila.estado ?? ESTADO_SIN_REGISTROS,
    entero(fila.agua),
    conUnDecimal(fila.proteina),
    conUnDecimal(fila.grasa),
    conUnDecimal(fila.carbohidrato),
  ].join(SEPARADOR_CSV);
}

function totales(filas: FilaSemana[]): string {
  const suma = (tomar: (f: FilaSemana) => number) =>
    filas.reduce((total, fila) => total + tomar(fila), 0);

  return [
    "Totales",
    entero(suma((f) => f.consumido)),
    entero(suma((f) => f.gastado)),
    entero(suma((f) => f.metaDia)),
    entero(suma((f) => f.balance)),
    "",
    entero(suma((f) => f.agua)),
    conUnDecimal(suma((f) => f.proteina)),
    conUnDecimal(suma((f) => f.grasa)),
    conUnDecimal(suma((f) => f.carbohidrato)),
  ].join(SEPARADOR_CSV);
}

/**
 * Arma el contenido completo del archivo: BOM, encabezado, un renglon por dia
 * y el renglon de totales. Las lineas van separadas por CRLF, que es lo que
 * espera Excel.
 */
export function armarCsvSemana(filas: FilaSemana[]): string {
  return (
    BOM +
    [ENCABEZADO_CSV, ...filas.map(linea), totales(filas)].join("\r\n") +
    "\r\n"
  );
}
