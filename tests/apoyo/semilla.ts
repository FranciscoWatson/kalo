/**
 * Semilla de datos para los casos automatizados.
 *
 * Cada caso automatizado **se crea su propia cuenta**, con un correo distinto
 * en cada corrida, y deja la base en el estado que pide el pre-requisito del
 * caso escrito. Asi el caso se puede correr todas las veces que haga falta, en
 * cualquier maquina, sin depender de cuentas cargadas a mano ni de lo que haya
 * dejado la corrida anterior.
 *
 * Escribe directo sobre kalo.db reutilizando las funciones de src/lib/datos.ts,
 * que son las mismas que usa la aplicacion.
 */

import { randomBytes, scryptSync } from "node:crypto";
import { getDb } from "../../src/lib/db";
import {
  agregarAgua,
  agregarComida,
  agregarEjercicio,
  crearAlimentoPropio,
  crearComidaGuardada,
  fechaHoy,
  fechaMenosDias,
  guardarModo,
  guardarObjetivo,
  guardarPerfil,
  registrarPesada,
  reiniciarPlan,
  type OrigenAlimento,
} from "../../src/lib/datos";
import {
  calcularKcalEjercicio,
  type Intensidad,
  type ModoCalculo,
  type Objetivo,
  type Perfil,
} from "../../src/lib/calc";
import { buscarEjercicio } from "../../src/lib/ejercicios";

export const CLAVE = "Grupo8.Kalo2026";

/** Los tres perfiles de referencia que usan los casos escritos. */
export const P_M: Perfil = {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
};
export const P_F: Perfil = {
  edad: 28,
  sexo: "femenino",
  peso: 60,
  altura: 165,
  actividad: "sedentario",
};
export const P_ALT: Perfil = {
  edad: 40,
  sexo: "femenino",
  peso: 70,
  altura: 160,
  actividad: "sedentario",
};

export interface Cuenta {
  id: number;
  email: string;
  clave: string;
}

function hash(clave: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(clave, salt, 64).toString("hex")}`;
}

/** Correo distinto en cada corrida, para que los tests no se pisen. */
export function emailUnico(caso: string): string {
  const sufijo = `${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
  return `auto-${caso.toLowerCase()}-${sufijo}@kalo.test`;
}

/** Crea una cuenta vacia, sin perfil ni objetivo. */
export function crearCuenta(caso: string): Cuenta {
  const email = emailUnico(caso);
  const resultado = getDb()
    .prepare("INSERT INTO usuarios (email, password_hash) VALUES (?, ?)")
    .run(email, hash(CLAVE));

  return { id: Number(resultado.lastInsertRowid), email, clave: CLAVE };
}

/** Cuenta con perfil y objetivo ya cargados, y el plan recien iniciado. */
export function crearCuentaConPlan(
  caso: string,
  opciones: {
    perfil?: Perfil;
    objetivo?: Objetivo;
    tasa?: number;
    pesoObjetivo?: number | null;
    modo?: ModoCalculo;
  } = {},
): Cuenta {
  const cuenta = crearCuenta(caso);
  guardarPerfil(cuenta.id, opciones.perfil ?? P_M);
  guardarObjetivo(
    cuenta.id,
    opciones.objetivo ?? "bajar",
    opciones.tasa ?? 0.5,
  );
  reiniciarPlan(cuenta.id, opciones.pesoObjetivo ?? null);
  if (opciones.modo) guardarModo(cuenta.id, opciones.modo);
  return cuenta;
}

export function sumarComida(
  cuenta: Cuenta,
  alimentoId: string,
  porciones: number,
  origen: OrigenAlimento = "catalogo",
): void {
  agregarComida(cuenta.id, fechaHoy(), origen, alimentoId, porciones);
}

export function sumarEjercicio(
  cuenta: Cuenta,
  ejercicioId: string,
  minutos: number,
  intensidad: Intensidad,
  peso: number,
): void {
  const ejercicio = buscarEjercicio(ejercicioId);
  if (!ejercicio) throw new Error(`Ejercicio inexistente: ${ejercicioId}`);
  agregarEjercicio(
    cuenta.id,
    fechaHoy(),
    ejercicio.id,
    minutos,
    intensidad,
    calcularKcalEjercicio(ejercicio.met, peso, minutos, intensidad),
  );
}

export function sumarAgua(cuenta: Cuenta, ml: number): void {
  agregarAgua(cuenta.id, fechaHoy(), ml);
}

/** Pesada de referencia con la antiguedad que pida el caso. */
export function sumarPesada(
  cuenta: Cuenta,
  diasAtras: number,
  peso: number,
): void {
  registrarPesada(cuenta.id, fechaMenosDias(fechaHoy(), diasAtras), peso);
}

export function sumarAlimentoPropio(
  cuenta: Cuenta,
  alimento: {
    nombre: string;
    porcion: string;
    kcal: number;
    proteina: number;
    grasa: number;
    carbohidrato: number;
  },
): void {
  crearAlimentoPropio(cuenta.id, alimento);
}

export function sumarComidaGuardada(
  cuenta: Cuenta,
  nombre: string,
  items: { origen: OrigenAlimento; alimentoId: string; porciones: number }[],
): void {
  crearComidaGuardada(cuenta.id, nombre, items);
}

/** Borra la cuenta creada por un caso. El resto de las filas cae por cascada. */
export function borrarCuenta(cuenta: Cuenta): void {
  getDb().prepare("DELETE FROM usuarios WHERE id = ?").run(cuenta.id);
}

/** Borra una cuenta por correo, para los casos que la crean desde la pantalla. */
export function borrarPorEmail(email: string): void {
  getDb().prepare("DELETE FROM usuarios WHERE email = ?").run(email);
}
