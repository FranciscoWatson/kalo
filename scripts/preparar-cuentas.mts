/**
 * Prepara las cuentas de prueba con el estado que cada caso pide en sus
 * pre-requisitos, para poder ejecutar cualquier caso sin tener que armar los
 * datos a mano.
 *
 * Uso (desde la carpeta kalo/, con el servidor levantado o no):
 *   node --import ./scripts/registrar-ts.mjs scripts/preparar-cuentas.mts
 *
 * Es idempotente: borra las cuentas que administra y las vuelve a crear.
 */

import { randomBytes, scryptSync } from "node:crypto";
import { getDb } from "../src/lib/db.ts";
import {
  agregarAgua,
  agregarComida,
  agregarEjercicio,
  crearAlimentoPropio,
  crearComidaGuardada,
  fechaHoy,
  fechaMenosDias,
  guardarObjetivo,
  guardarPerfil,
  listarAlimentosPropios,
  registrarPesada,
  reiniciarPlan,
  type OrigenAlimento,
} from "../src/lib/datos.ts";
import { calcularKcalEjercicio, type Objetivo, type Perfil } from "../src/lib/calc.ts";
import { buscarEjercicio } from "../src/lib/ejercicios.ts";

const CLAVE = "Grupo8.Kalo2026";
const hoy = fechaHoy();

const P_M: Perfil = { edad: 30, sexo: "masculino", peso: 80, altura: 180, actividad: "moderado" };
const P_F: Perfil = { edad: 28, sexo: "femenino", peso: 60, altura: 165, actividad: "sedentario" };
const P_ALT: Perfil = { edad: 40, sexo: "femenino", peso: 70, altura: 160, actividad: "sedentario" };

/** Cuentas que los casos necesitan que NO existan al empezar. */
const SIN_CREAR = [
  "altanueva@kalo.test",
  "cuentalibre@kalo.test",
  "sinregistrar@kalo.test",
];

function hash(clave: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(clave, salt, 64).toString("hex")}`;
}

function borrar(email: string): void {
  getDb().prepare("DELETE FROM usuarios WHERE email = ?").run(email);
}

function crearCuenta(email: string): number {
  borrar(email);
  const r = getDb()
    .prepare("INSERT INTO usuarios (email, password_hash) VALUES (?, ?)")
    .run(email, hash(CLAVE));
  return Number(r.lastInsertRowid);
}

function conPlan(email: string, perfil: Perfil, objetivo: Objetivo, tasa: number, pesoObjetivo: number | null = null): number {
  const id = crearCuenta(email);
  guardarPerfil(id, perfil);
  guardarObjetivo(id, objetivo, tasa);
  reiniciarPlan(id, pesoObjetivo);
  return id;
}

function comida(id: number, alimentoId: string, porciones: number, origen: OrigenAlimento = "catalogo"): void {
  agregarComida(id, hoy, origen, alimentoId, porciones);
}

function ejercicio(id: number, ejercicioId: string, minutos: number, intensidad: "suave" | "moderada" | "intensa", peso: number): void {
  const e = buscarEjercicio(ejercicioId)!;
  agregarEjercicio(id, hoy, e.id, minutos, intensidad, calcularKcalEjercicio(e.met, peso, minutos, intensidad));
}

const resumen: string[] = [];
const anotar = (cuenta: string, casos: string, estado: string) =>
  resumen.push(`${cuenta.padEnd(26)} | ${casos.padEnd(22)} | ${estado}`);

// --- Cuentas que no deben existir -------------------------------------------

for (const email of SIN_CREAR) borrar(email);

// --- Cuentas de la V1 --------------------------------------------------------

conPlan("perfilm@kalo.test", P_M, "bajar", 0.5);
anotar("perfilm@kalo.test", "TC-04 a TC-19", "Perfil P-M (80 kg) · objetivo Bajar 0.5 · meta 2209 kcal · día vacío");

conPlan("perfilf@kalo.test", P_F, "bajar", 0.5);
anotar("perfilf@kalo.test", "TC-11, TC-19", "Perfil P-F (60 kg) · objetivo Bajar 0.5 · meta 1200 (acotada al piso)");

conPlan("perfilalt@kalo.test", P_ALT, "bajar", 1.0);
anotar("perfilalt@kalo.test", "TC-14", "Perfil P-ALT (70 kg) · Bajar 1.0 · meta 1200 + reparto alternativo");

// --- Cuentas de la V2 --------------------------------------------------------

conPlan("ejercicio@kalo.test", P_M, "bajar", 0.5);
anotar("ejercicio@kalo.test", "TC-20 a TC-24", "Perfil P-M · Bajar 0.5 · día sin comidas ni ejercicio");

crearCuenta("sinperfil2@kalo.test");
anotar("sinperfil2@kalo.test", "TC-21, TC-38", "Cuenta creada SIN perfil cargado");

// alimentos@: queda con el alimento propio y la comida guardada ya creados,
// que es lo que piden TC-26 a TC-29.
const alimentos = conPlan("alimentos@kalo.test", P_M, "mantener", 0);
crearAlimentoPropio(alimentos, {
  nombre: "Tarta de jamón y queso",
  porcion: "1 porción (180 g)",
  kcal: 380,
  proteina: 18,
  grasa: 22,
  carbohidrato: 26,
});
const tarta = listarAlimentosPropios(alimentos)[0];
crearComidaGuardada(alimentos, "Mi desayuno", [
  { origen: "catalogo", alimentoId: "avena", porciones: 1 },
  { origen: "catalogo", alimentoId: "leche-descremada", porciones: 1 },
  { origen: "catalogo", alimentoId: "banana", porciones: 1 },
  { origen: "propio", alimentoId: tarta.id, porciones: 0.5 },
]);
anotar("alimentos@kalo.test", "TC-26 a TC-29", "Perfil P-M · Mantener · tarta propia y «Mi desayuno» cargadas · día vacío");

conPlan("alimentos2@kalo.test", P_M, "mantener", 0);
anotar("alimentos2@kalo.test", "TC-25", "Igual a la anterior pero SIN alimentos propios ni comidas guardadas");

// progreso@: con las dos pesadas que deja TC-30, que es lo que pide TC-32.
const progreso = conPlan("progreso@kalo.test", P_M, "bajar", 0.5);
registrarPesada(progreso, fechaMenosDias(hoy, 14), 80);
registrarPesada(progreso, hoy, 79.2);
comida(progreso, "hamburguesa-completa", 3);
comida(progreso, "pizza-muzzarella", 1);
anotar("progreso@kalo.test", "TC-32", "Pesadas de hace 14 días (80.0) y de hoy (79.2) · perfil en 79.2 kg · comidas del día cargadas");

conPlan("progreso2@kalo.test", P_M, "bajar", 0.5);
anotar("progreso2@kalo.test", "TC-30, TC-31", "Perfil P-M · Bajar 0.5 · SIN pesadas registradas");

conPlan("plan@kalo.test", P_M, "bajar", 0.5);
anotar("plan@kalo.test", "TC-33, TC-35, TC-36", "Perfil P-M · Bajar 0.5 recién guardado · plan Activo · sin pesadas");

conPlan("plan2@kalo.test", P_M, "bajar", 0.5);
anotar("plan2@kalo.test", "TC-34, TC-35", "Igual a plan@ · se usa como segunda cuenta de los casos del plan");

conPlan("planf@kalo.test", P_F, "bajar", 0.5);
anotar("planf@kalo.test", "TC-34", "Perfil P-F · Bajar 0.5 · meta 1200 (piso) · sin pesadas");

conPlan("coach@kalo.test", P_M, "bajar", 0.5);
anotar("coach@kalo.test", "TC-37", "Perfil P-M · Bajar 0.5 · día sin comidas, sin agua y sin ejercicio");

// ux@: necesita un registro de cada cosa para probar las confirmaciones.
const ux = conPlan("ux@kalo.test", P_M, "bajar", 0.5);
comida(ux, "banana", 1);
ejercicio(ux, "caminata", 30, "moderada", 80);
agregarAgua(ux, hoy, 500);
crearAlimentoPropio(ux, {
  nombre: "Budín casero",
  porcion: "1 porción (80 g)",
  kcal: 260,
  proteina: 10,
  grasa: 20,
  carbohidrato: 10,
});
crearComidaGuardada(ux, "Mi merienda", [
  { origen: "catalogo", alimentoId: "yogur-natural", porciones: 1 },
  { origen: "catalogo", alimentoId: "manzana", porciones: 1 },
]);
registrarPesada(ux, hoy, 80);
anotar("ux@kalo.test", "TC-38", "Perfil P-M · un registro de comida, ejercicio, agua, alimento propio, comida guardada y pesada");

// --- Cuentas para el testing exploratorio ------------------------------------
// Se dejan aparte a propósito: el exploratorio rompe cosas, y las cuentas de
// los casos de prueba tienen que conservar el estado de sus pre-requisitos.

const explora = conPlan("explora@kalo.test", P_M, "bajar", 0.5, 78);
comida(explora, "hamburguesa-completa", 2);
comida(explora, "banana", 1);
ejercicio(explora, "bicicleta", 60, "moderada", 80);
agregarAgua(explora, hoy, 750);
crearAlimentoPropio(explora, {
  nombre: "Tarta de jamón",
  porcion: "1 porción (180 g)",
  kcal: 380,
  proteina: 18,
  grasa: 22,
  carbohidrato: 26,
});
const tartaExplora = listarAlimentosPropios(explora)[0];
crearComidaGuardada(explora, "Mi desayuno", [
  { origen: "catalogo", alimentoId: "avena", porciones: 1 },
  { origen: "catalogo", alimentoId: "leche-descremada", porciones: 1 },
  { origen: "propio", alimentoId: tartaExplora.id, porciones: 0.5 },
]);
registrarPesada(explora, fechaMenosDias(hoy, 7), 80);
anotar("explora@kalo.test", "Exploratorio CH-1 a CH-5", "P-M · Bajar 0.5 · peso objetivo 78 · con comidas, ejercicio, agua, alimento propio, comida guardada y una pesada de referencia");

conPlan("exploraf@kalo.test", P_F, "bajar", 0.5);
anotar("exploraf@kalo.test", "Exploratorio", "P-F (60 kg) · Bajar 0.5 · meta 1200 (piso) · cuenta vacía para explorar");

conPlan("exploraalt@kalo.test", P_ALT, "bajar", 1.0);
anotar("exploraalt@kalo.test", "Exploratorio", "P-ALT (70 kg) · Bajar 1.0 · meta 1200 + reparto alternativo · cuenta vacía");

crearCuenta("exploravacia@kalo.test");
anotar("exploravacia@kalo.test", "Exploratorio CH-1", "Cuenta recién creada, sin perfil: para recorrer la app en blanco");

crearCuenta("confirmadf1@kalo.test");
anotar("confirmadf1@kalo.test", "TC-39", "Cuenta creada SIN perfil ni objetivo (confirma DF-01)");

crearCuenta("confirmadf2@kalo.test");
anotar("confirmadf2@kalo.test", "TC-40", "Cuenta creada SIN perfil ni objetivo (confirma DF-02)");

// --- Salida ------------------------------------------------------------------

console.log(`\nCuentas preparadas. La clave de todas es: ${CLAVE}\n`);
console.log("CUENTA".padEnd(26) + " | " + "CASOS".padEnd(22) + " | ESTADO");
console.log("-".repeat(120));
for (const linea of resumen) console.log(linea);
console.log("\nCuentas que quedaron SIN crear a propósito, porque los casos las dan de alta:");
for (const email of SIN_CREAR) console.log("  -", email);
console.log();
