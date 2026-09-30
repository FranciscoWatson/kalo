/**
 * Acceso a datos de Kalo V1 y armado del resumen del dia.
 * La logica de calculo vive en calc.ts; aca solo se leen y escriben filas.
 */

import { getDb } from "./db";
import { buscarAlimento, type Alimento } from "./catalogo";
import {
  balanceDelDia,
  calcularMetas,
  estadoDelDia,
  type EstadoDia,
  type NivelActividad,
  type Objetivo,
  type Perfil,
  type ResultadoMetas,
  type Sexo,
} from "./calc";

export interface RegistroComida {
  id: number;
  alimento: Alimento;
  porciones: number;
  kcal: number;
  proteina: number;
  grasa: number;
  carbohidrato: number;
}

export interface ResumenDia {
  fecha: string;
  metas: ResultadoMetas | null;
  registros: RegistroComida[];
  consumido: number;
  proteina: number;
  grasa: number;
  carbohidrato: number;
  agua: number;
  balance: number;
  estado: EstadoDia | null;
}

export function fechaHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// --- Perfil ------------------------------------------------------------------

export function leerPerfil(usuarioId: number): Perfil | null {
  const fila = getDb()
    .prepare(
      "SELECT edad, sexo, peso, altura, actividad FROM perfiles WHERE usuario_id = ?",
    )
    .get(usuarioId) as
    | { edad: number; sexo: string; peso: number; altura: number; actividad: string }
    | undefined;

  if (!fila) return null;
  return {
    edad: fila.edad,
    sexo: fila.sexo as Sexo,
    peso: fila.peso,
    altura: fila.altura,
    actividad: fila.actividad as NivelActividad,
  };
}

export function guardarPerfil(usuarioId: number, p: Perfil): void {
  getDb()
    .prepare(
      `INSERT INTO perfiles (usuario_id, edad, sexo, peso, altura, actividad)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(usuario_id) DO UPDATE SET
         edad = excluded.edad, sexo = excluded.sexo, peso = excluded.peso,
         altura = excluded.altura, actividad = excluded.actividad`,
    )
    .run(usuarioId, p.edad, p.sexo, p.peso, p.altura, p.actividad);
}

// --- Objetivo ----------------------------------------------------------------

export interface ObjetivoGuardado {
  tipo: Objetivo;
  tasa: number;
}

export function leerObjetivo(usuarioId: number): ObjetivoGuardado | null {
  const fila = getDb()
    .prepare("SELECT tipo, tasa FROM objetivos WHERE usuario_id = ?")
    .get(usuarioId) as { tipo: string; tasa: number } | undefined;

  if (!fila) return null;
  return { tipo: fila.tipo as Objetivo, tasa: fila.tasa };
}

export function guardarObjetivo(
  usuarioId: number,
  tipo: Objetivo,
  tasa: number,
): void {
  getDb()
    .prepare(
      `INSERT INTO objetivos (usuario_id, tipo, tasa) VALUES (?, ?, ?)
       ON CONFLICT(usuario_id) DO UPDATE SET
         tipo = excluded.tipo, tasa = excluded.tasa`,
    )
    .run(usuarioId, tipo, tasa);
}

// --- Registros del dia -------------------------------------------------------

export function agregarComida(
  usuarioId: number,
  fecha: string,
  alimentoId: string,
  porciones: number,
): void {
  getDb()
    .prepare(
      "INSERT INTO registros_comida (usuario_id, fecha, alimento_id, porciones) VALUES (?, ?, ?, ?)",
    )
    .run(usuarioId, fecha, alimentoId, porciones);
}

export function eliminarComida(usuarioId: number, registroId: number): void {
  getDb()
    .prepare("DELETE FROM registros_comida WHERE id = ? AND usuario_id = ?")
    .run(registroId, usuarioId);
}

export function agregarAgua(usuarioId: number, fecha: string, ml: number): void {
  getDb()
    .prepare("INSERT INTO registros_agua (usuario_id, fecha, ml) VALUES (?, ?, ?)")
    .run(usuarioId, fecha, ml);
}

export function reiniciarAgua(usuarioId: number, fecha: string): void {
  getDb()
    .prepare("DELETE FROM registros_agua WHERE usuario_id = ? AND fecha = ?")
    .run(usuarioId, fecha);
}

function leerComidas(usuarioId: number, fecha: string): RegistroComida[] {
  const filas = getDb()
    .prepare(
      `SELECT id, alimento_id, porciones FROM registros_comida
       WHERE usuario_id = ? AND fecha = ? ORDER BY id`,
    )
    .all(usuarioId, fecha) as {
    id: number;
    alimento_id: string;
    porciones: number;
  }[];

  const registros: RegistroComida[] = [];
  for (const f of filas) {
    const alimento = buscarAlimento(f.alimento_id);
    if (!alimento) continue;
    registros.push({
      id: f.id,
      alimento,
      porciones: f.porciones,
      kcal: alimento.kcal * f.porciones,
      proteina: alimento.proteina * f.porciones,
      grasa: alimento.grasa * f.porciones,
      carbohidrato: alimento.carbohidrato * f.porciones,
    });
  }
  return registros;
}

function leerAgua(usuarioId: number, fecha: string): number {
  const fila = getDb()
    .prepare(
      "SELECT COALESCE(SUM(ml), 0) AS total FROM registros_agua WHERE usuario_id = ? AND fecha = ?",
    )
    .get(usuarioId, fecha) as { total: number };
  return fila.total;
}

/** Arma el resumen completo del dia: metas, registros, totales, balance y estado. */
export function resumenDelDia(usuarioId: number, fecha: string): ResumenDia {
  const perfil = leerPerfil(usuarioId);
  const objetivo = leerObjetivo(usuarioId);
  const registros = leerComidas(usuarioId, fecha);

  const consumido = Math.round(
    registros.reduce((total, r) => total + r.kcal, 0),
  );
  const proteina = Math.round(registros.reduce((t, r) => t + r.proteina, 0));
  const grasa = Math.round(registros.reduce((t, r) => t + r.grasa, 0));
  const carbohidrato = Math.round(
    registros.reduce((t, r) => t + r.carbohidrato, 0),
  );

  const metas =
    perfil && objetivo
      ? calcularMetas(perfil, objetivo.tipo, objetivo.tasa)
      : null;

  return {
    fecha,
    metas,
    registros,
    consumido,
    proteina,
    grasa,
    carbohidrato,
    agua: leerAgua(usuarioId, fecha),
    balance: metas ? balanceDelDia(consumido, metas.meta) : 0,
    estado: metas ? estadoDelDia(consumido, metas.meta, metas.piso) : null,
  };
}
