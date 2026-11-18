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

/** Comida cargada en un dia anterior, para las reglas semanales de la V3. */
function comidaEn(id: number, dias: number, alimentoId: string, porciones: number): void {
  agregarComida(id, fechaMenosDias(hoy, dias), "catalogo", alimentoId, porciones);
}

/** Deja un dia en 2194 kcal: dentro de la franja En rango de la meta 2209. */
function diaEnRango(id: number, dias: number): void {
  comidaEn(id, dias, "hamburguesa-completa", 3);
  comidaEn(id, dias, "pizza-muzzarella", 1);
  comidaEn(id, dias, "arroz-cocido", 1);
}

/** Deja un dia en 1620 kcal: pasa el piso pero no llega al rango. */
function diaIncompleto(id: number, dias: number): void {
  comidaEn(id, dias, "hamburguesa-completa", 3);
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

// --- Cuentas de la V3 --------------------------------------------------------

const exportar = conPlan("exportar@kalo.test", P_M, "bajar", 0.5);
diaEnRango(exportar, 0);
diaIncompleto(exportar, 1);
diaEnRango(exportar, 3);
ejercicio(exportar, "bicicleta", 60, "moderada", 80);
agregarAgua(exportar, hoy, 1500);
anotar("exportar@kalo.test", "TC-41", "Perfil P-M · Bajar 0.5 · tres dias de la semana con registros, ejercicio y agua de hoy");

conPlan("exportar2@kalo.test", P_M, "bajar", 0.5);
anotar("exportar2@kalo.test", "TC-42", "Perfil P-M · Bajar 0.5 · SIN ningun registro en los ultimos 7 dias");

crearCuenta("sinperfil3@kalo.test");
anotar("sinperfil3@kalo.test", "TC-42", "Cuenta creada SIN perfil ni objetivo");

const coachPeso = conPlan("coachpeso@kalo.test", P_M, "bajar", 0.5);
registrarPesada(coachPeso, fechaMenosDias(hoy, 3), 79);
registrarPesada(coachPeso, hoy, 79.6);
diaEnRango(coachPeso, 0);
anotar("coachpeso@kalo.test", "TC-43", "Pesadas de hace 3 dias (79.0) y de hoy (79.6): el peso sube y el objetivo es bajar");

const coachAgua = conPlan("coachagua@kalo.test", P_M, "bajar", 0.5);
ejercicio(coachAgua, "bicicleta", 90, "moderada", 80);
agregarAgua(coachAgua, hoy, 500);
diaEnRango(coachAgua, 0);
anotar("coachagua@kalo.test", "TC-44", "90 minutos de bicicleta y 500 ml de agua: meta de agua ajustada a 3350 ml");

const coachSemana = conPlan("coachsemana@kalo.test", P_M, "bajar", 0.5);
diaEnRango(coachSemana, 3);
diaIncompleto(coachSemana, 2);
diaIncompleto(coachSemana, 1);
diaIncompleto(coachSemana, 0);
anotar("coachsemana@kalo.test", "TC-45", "Cuatro dias con registros, uno solo En rango: adherencia 25 %");

const coachRacha = conPlan("coachracha@kalo.test", P_M, "bajar", 0.5);
diaEnRango(coachRacha, 2);
diaEnRango(coachRacha, 1);
// El dia de hoy queda En rango (2140 kcal) y ademas con la proteina, el agua y
// el ejercicio cubiertos a proposito: asi las reglas 5, 7 y 9 no se llevan los
// tres lugares y el caso puede mirar la regla de la racha.
comida(coachRacha, "pollo-pechuga", 4);
comida(coachRacha, "arroz-cocido", 2);
comida(coachRacha, "pizza-muzzarella", 2);
ejercicio(coachRacha, "caminata", 30, "moderada", 80);
agregarAgua(coachRacha, hoy, 3000);
anotar("coachracha@kalo.test", "TC-46", "Tres dias seguidos En rango, con agua, proteina y ejercicio cubiertos hoy");

const selects = conPlan("selects@kalo.test", P_M, "bajar", 0.5);
crearAlimentoPropio(selects, {
  nombre: "Budín casero",
  porcion: "1 porción (80 g)",
  kcal: 260,
  proteina: 10,
  grasa: 20,
  carbohidrato: 10,
});
anotar("selects@kalo.test", "TC-47", "Perfil P-M · Bajar 0.5 · con el alimento propio «Budín casero»");

const integridad = conPlan("integridad@kalo.test", P_M, "bajar", 0.5);
crearAlimentoPropio(integridad, {
  nombre: "Tarta de jamón y queso",
  porcion: "1 porción (180 g)",
  kcal: 380,
  proteina: 18,
  grasa: 22,
  carbohidrato: 26,
});
crearAlimentoPropio(integridad, {
  nombre: "Budín casero",
  porcion: "1 porción (80 g)",
  kcal: 260,
  proteina: 10,
  grasa: 20,
  carbohidrato: 10,
});
const tartaIntegridad = listarAlimentosPropios(integridad).find((a) => a.nombre.startsWith("Tarta"))!;
crearComidaGuardada(integridad, "Mi desayuno", [
  { origen: "catalogo", alimentoId: "avena", porciones: 1 },
  { origen: "catalogo", alimentoId: "leche-descremada", porciones: 1 },
  { origen: "catalogo", alimentoId: "banana", porciones: 1 },
  { origen: "propio", alimentoId: tartaIntegridad.id, porciones: 0.5 },
]);
agregarComida(integridad, hoy, "propio", tartaIntegridad.id, 1);
anotar("integridad@kalo.test", "TC-48", "«Tarta de jamón y queso» usada por «Mi desayuno» y registrada en el dia · «Budín casero» libre");

const integridad2 = conPlan("integridad2@kalo.test", P_M, "bajar", 0.5);
registrarPesada(integridad2, fechaMenosDias(hoy, 3), 80);
registrarPesada(integridad2, hoy, 79.8);
anotar("integridad2@kalo.test", "TC-49", "Pesadas de hace 3 dias (80.0, la de referencia) y de hoy (79.8)");

const planViejo = conPlan("planviejo@kalo.test", P_M, "bajar", 0.5);
registrarPesada(planViejo, fechaMenosDias(hoy, 400), 80);
anotar("planviejo@kalo.test", "TC-50", "Unica pesada de hace 400 dias (80.0): la referencia esta vencida");

const duplicado = conPlan("duplicado@kalo.test", P_M, "bajar", 0.5);
crearAlimentoPropio(duplicado, {
  nombre: "Tarta de jamón",
  porcion: "1 porción (180 g)",
  kcal: 380,
  proteina: 18,
  grasa: 22,
  carbohidrato: 26,
});
crearComidaGuardada(duplicado, "Mi desayuno", [
  { origen: "catalogo", alimentoId: "avena", porciones: 1 },
  { origen: "catalogo", alimentoId: "leche-descremada", porciones: 1 },
]);
anotar("duplicado@kalo.test", "TC-51", "Con «Tarta de jamón» y la comida guardada «Mi desayuno» ya cargadas");

conPlan("validacion@kalo.test", P_M, "bajar", 0.5);
anotar("validacion@kalo.test", "TC-52", "Perfil P-M · Bajar 0.5 · dia vacio, para probar los mensajes propios");

conPlan("decimales@kalo.test", P_M, "bajar", 0.5);
anotar("decimales@kalo.test", "TC-53", "Perfil P-M · Bajar 0.5 · dia vacio y sin pesadas, para los decimales con coma");

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
