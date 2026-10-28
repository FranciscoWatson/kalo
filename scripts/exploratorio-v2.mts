/**
 * Recorrido exploratorio sobre Kalo V2.
 *
 * Usa la misma capa de datos que las pantallas, sobre la base kalo.db del
 * servidor de desarrollo, y despues se verifica lo renderizado por HTTP.
 * Uso (desde la carpeta kalo/):  node scripts/exploratorio-v2.mts
 */

import { createHmac, randomBytes, scryptSync } from "node:crypto";
import { getDb } from "../src/lib/db.ts";
import {
  agregarAgua,
  agregarComida,
  agregarEjercicio,
  crearAlimentoPropio,
  crearComidaGuardada,
  eliminarAlimentoPropio,
  eliminarPesada,
  existeAlimentoPropio,
  fechaMenosDias,
  guardarModo,
  guardarObjetivo,
  guardarPerfil,
  leerPlan,
  listarAlimentosPropios,
  listarComidasGuardadas,
  listarPesadas,
  registrarComidaGuardada,
  registrarPesada,
  reiniciarPlan,
  resumenDelDia,
  resumenSemanal,
  fechaHoy,
} from "../src/lib/datos.ts";
import { calcularKcalEjercicio } from "../src/lib/calc.ts";

const SECRETO = "kalo-dev-secret-no-usar-en-produccion";

function hash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function cookie(usuarioId: number): string {
  const valor = String(usuarioId);
  const firma = createHmac("sha256", SECRETO).update(valor).digest("hex");
  return `kalo_session=${valor}.${firma}`;
}

function crearUsuario(email: string): number {
  const db = getDb();
  db.prepare("DELETE FROM usuarios WHERE email = ?").run(email);
  const r = db
    .prepare("INSERT INTO usuarios (email, password_hash) VALUES (?, ?)")
    .run(email, hash("Grupo8.Kalo2026"));
  return Number(r.lastInsertRowid);
}

let hallazgos = 0;
function chequear(descripcion: string, real: unknown, esperado: unknown): void {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) hallazgos++;
  console.log(`${ok ? "OK  " : "REVISAR"} | ${descripcion}`);
  if (!ok) {
    console.log(`          esperado: ${JSON.stringify(esperado)}`);
    console.log(`          obtenido: ${JSON.stringify(real)}`);
  }
}

function nota(texto: string): void {
  console.log(`   ·  ${texto}`);
}

function titulo(texto: string): void {
  console.log(`\n=== ${texto} ===`);
}

const hoy = fechaHoy();

// --- Charter 1: cuenta nueva sin perfil --------------------------------------

titulo("Charter 1 — cuenta nueva sin perfil");
const sinPerfil = crearUsuario("sinperfil2@kalo.test");
const resumenSinPerfil = resumenDelDia(sinPerfil, hoy);
chequear("Sin perfil no hay metas", resumenSinPerfil.metas, null);
chequear(
  "El Coach pide completar el perfil",
  resumenSinPerfil.coach,
  ["Completá tu perfil y tu objetivo para que pueda darte recomendaciones."],
);
chequear("Plan inicial en activo", leerPlan(sinPerfil).estado, "activo");

// --- Charter 2: ejercicio y modos de calculo ---------------------------------

titulo("Charter 2 — ejercicio y modo de cálculo (TC-20, TC-22 a TC-24)");
const ej = crearUsuario("ejercicio@kalo.test");
guardarPerfil(ej, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(ej, "bajar", 0.5);
reiniciarPlan(ej, null);

agregarComida(ej, hoy, "catalogo", "hamburguesa-completa", 3);
agregarComida(ej, hoy, "catalogo", "pizza-muzzarella", 1);
agregarComida(ej, hoy, "catalogo", "arroz-cocido", 1);

let r = resumenDelDia(ej, hoy);
chequear("TC-22: consumido 2194 kcal", r.consumido, 2194);
chequear("TC-22: meta del día 2209", r.metaDia, 2209);
chequear("TC-22: balance -15", r.balance, -15);
chequear("TC-22: estado En rango", r.estado, "En rango");

agregarEjercicio(ej, hoy, "bicicleta", 60, "moderada", calcularKcalEjercicio(7.5, 80, 60, "moderada"));
r = resumenDelDia(ej, hoy);
chequear("TC-22: gastado 600 kcal", r.gastado, 600);
chequear("TC-22: con el modo por defecto la meta no cambia", r.metaDia, 2209);
chequear("TC-22: el balance tampoco", r.balance, -15);
chequear("TC-24: meta de agua 2800 + 350 = 3150", r.metaAgua, 3150);

guardarModo(ej, "suma");
r = resumenDelDia(ej, hoy);
chequear("TC-23: modo suma, meta del día 2809", r.metaDia, 2809);
chequear("TC-23: modo suma, balance -615", r.balance, -615);
chequear("TC-23: modo suma, estado Incompleto", r.estado, "Incompleto");
guardarModo(ej, "no_suma");

agregarEjercicio(ej, hoy, "caminata", 30, "moderada", calcularKcalEjercicio(3.5, 80, 30, "moderada"));
r = resumenDelDia(ej, hoy);
chequear("TC-24: 90 minutos -> meta de agua 3350", r.metaAgua, 3350);
chequear("TC-24: extra de 550 ml", r.extraAgua, 550);
agregarAgua(ej, hoy, 1500);
r = resumenDelDia(ej, hoy);
chequear("TC-24: agua tomada 1500", r.agua, 1500);
nota(`Cumplimiento de agua: ${Math.round((1500 / r.metaAgua) * 100)} %`);

// --- Charter 3: alimentos propios y comidas guardadas ------------------------

titulo("Charter 3 — alimentos propios y comidas guardadas (TC-25, TC-25, TC-28)");
const al = crearUsuario("alimentos@kalo.test");
guardarPerfil(al, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(al, "mantener", 0);
reiniciarPlan(al, null);

crearAlimentoPropio(al, {
  nombre: "Tarta de jamón y queso",
  porcion: "1 porción (180 g)",
  kcal: 380,
  proteina: 18,
  grasa: 22,
  carbohidrato: 26,
});
const propios = listarAlimentosPropios(al);
chequear("TC-25: la tarta queda guardada", propios.length, 1);

agregarComida(al, hoy, "propio", propios[0].id, 2);
let rAl = resumenDelDia(al, hoy);
chequear("TC-25: 2 porciones = 760 kcal", rAl.consumido, 760);
chequear("TC-25: macros 36 / 44 / 52", [rAl.proteina, rAl.grasa, rAl.carbohidrato], [36, 44, 52]);

crearComidaGuardada(al, "Mi desayuno", [
  { origen: "catalogo", alimentoId: "avena", porciones: 1 },
  { origen: "catalogo", alimentoId: "leche-descremada", porciones: 1 },
  { origen: "catalogo", alimentoId: "banana", porciones: 1 },
  { origen: "propio", alimentoId: propios[0].id, porciones: 0.5 },
]);
const comidas = listarComidasGuardadas(al);
chequear("TC-28: la comida guardada tiene 4 ítems", comidas[0].items.length, 4);
chequear("TC-28: la comida suma 519 kcal", comidas[0].kcal, 519);

const registrada = registrarComidaGuardada(al, hoy, comidas[0].id);
chequear("TC-28: se registran 4 alimentos", registrada?.cantidad, 4);
rAl = resumenDelDia(al, hoy);
chequear("TC-28: el consumido sube 519 kcal", rAl.consumido, 760 + 519);

eliminarAlimentoPropio(al, propios[0].idNumerico);
rAl = resumenDelDia(al, hoy);
chequear(
  "TC-25: al borrar el alimento propio los registros se conservan",
  rAl.consumido,
  760 + 519,
);
chequear(
  "TC-25: el registro conserva el nombre",
  rAl.registros[0].nombre,
  "Tarta de jamón y queso",
);
nota(
  `La comida guardada queda con un ítem huérfano: "${listarComidasGuardadas(al)[0].items[3].nombre}"`,
);

// --- Charter 4: pesadas y ajuste del plan ------------------------------------

titulo("Charter 4 — pesadas y ajuste del plan (TC-30, TC-33 a TC-36)");
const pr = crearUsuario("progreso@kalo.test");
guardarPerfil(pr, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(pr, "bajar", 0.5);
reiniciarPlan(pr, null);

chequear(
  "TC-33: la primera pesada no dispara ajuste",
  registrarPesada(pr, fechaMenosDias(hoy, 14), 80),
  [],
);
chequear("TC-33: queda como referencia", leerPlan(pr).referenciaPeso, 80);

const avisos14 = registrarPesada(pr, hoy, 79.4);
chequear(
  "TC-33: aviso del recálculo",
  avisos14,
  [
    "Tu peso real (79.4 kg) difiere del proyectado (79.0 kg). Se recalculó la meta de 2200 a 1980 kcal.",
  ],
);
chequear("TC-33: el plan pasa a recalculado", leerPlan(pr).estado, "recalculado");
chequear("TC-33: ajuste acumulado -220", leerPlan(pr).ajusteAcumulado, -220);
chequear("TC-33: la meta vigente es 1980", resumenDelDia(pr, hoy).metas?.meta, 1980);

// Limite del 15 %
const lim = crearUsuario("limite@kalo.test");
guardarPerfil(lim, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(lim, "bajar", 0.5);
reiniciarPlan(lim, null);
registrarPesada(lim, fechaMenosDias(hoy, 7), 80);
chequear(
  "TC-34: los dos avisos, en orden",
  registrarPesada(lim, hoy, 80),
  [
    "Tu peso real (80.0 kg) difiere del proyectado (79.5 kg). Se recalculó la meta de 2209 a 1878 kcal.",
    "La corrección calculada (-550 kcal) supera el límite del 15 %. Se ajustó la meta en -331 kcal.",
  ],
);

// Sin ajuste: desvio chico y menos de 7 dias
const enl = crearUsuario("enlinea@kalo.test");
guardarPerfil(enl, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(enl, "bajar", 0.5);
reiniciarPlan(enl, null);
registrarPesada(enl, fechaMenosDias(hoy, 7), 80);
chequear(
  "TC-35: desvío de 0.1 kg no ajusta",
  registrarPesada(enl, hoy, 79.6),
  ["El plan viene en línea con lo proyectado. No hizo falta ajustar la meta."],
);
chequear("TC-35: el plan sigue activo", leerPlan(enl).estado, "activo");

const seis = crearUsuario("seisdias@kalo.test");
guardarPerfil(seis, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(seis, "bajar", 0.5);
reiniciarPlan(seis, null);
registrarPesada(seis, fechaMenosDias(hoy, 6), 80);
chequear("TC-35: con 6 días no se evalúa", registrarPesada(seis, hoy, 79), []);

// Piso calorico
const pf = crearUsuario("planf@kalo.test");
guardarPerfil(pf, {
  edad: 28,
  sexo: "femenino",
  peso: 60,
  altura: 165,
  actividad: "sedentario",
});
guardarObjetivo(pf, "bajar", 0.5);
reiniciarPlan(pf, null);
registrarPesada(pf, fechaMenosDias(hoy, 7), 60);
const avisosPiso = registrarPesada(pf, hoy, 60);
chequear("TC-34: tres avisos", avisosPiso.length, 3);
chequear("TC-34: la meta queda en el piso", resumenDelDia(pf, hoy).metas?.meta, 1200);

// Estados del plan
const est = crearUsuario("estados@kalo.test");
guardarPerfil(est, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(est, "bajar", 0.5);
reiniciarPlan(est, 78);
registrarPesada(est, fechaMenosDias(hoy, 7), 80);
chequear(
  "TC-36: pesada que alcanza el peso objetivo",
  registrarPesada(est, hoy, 77.9),
  ["¡Objetivo cumplido! Alcanzaste tu peso objetivo de 78.0 kg."],
);
chequear("TC-36: el plan queda cumplido", leerPlan(est).estado, "cumplido");
chequear(
  "TC-36: con el plan cumplido no se evalúan más ajustes",
  registrarPesada(est, hoy, 77.0),
  ["Se actualizó la pesada del " + hoy.split("-").reverse().join("/") + "."],
);

// Pesada retroactiva
const retro = crearUsuario("retro@kalo.test");
guardarPerfil(retro, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(retro, "bajar", 0.5);
reiniciarPlan(retro, null);
registrarPesada(retro, hoy, 79.5);
registrarPesada(retro, fechaMenosDias(hoy, 10), 79.8);
chequear(
  "TC-32: una pesada vieja no cambia el peso del perfil",
  resumenDelDia(retro, hoy).metas?.meta,
  2201, // la meta que corresponde a 79.5 kg, no a 79.8 kg
);

// --- Charter 5: datos limite y entradas raras --------------------------------

titulo("Charter 5 — entradas límite y casos raros");
const raro = crearUsuario("raro@kalo.test");
guardarPerfil(raro, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(raro, "bajar", 0.5);
reiniciarPlan(raro, null);

agregarComida(raro, hoy, "catalogo", "correr-no-existe", 1);
chequear(
  "Un alimento inexistente no crea registro",
  resumenDelDia(raro, hoy).registros.length,
  0,
);

agregarEjercicio(raro, hoy, "correr", 300, "intensa", calcularKcalEjercicio(11, 80, 300, "intensa"));
const rRaro = resumenDelDia(raro, hoy);
nota(`300 min de correr intensos: ${rRaro.gastado} kcal gastadas`);
nota(`Meta de agua resultante: ${rRaro.metaAgua} ml`);
chequear(
  "Con el día vacío y mucho ejercicio el estado sigue Por debajo del mínimo",
  rRaro.estado,
  "Por debajo del minimo",
);

// Nombres repetidos que solo difieren en una letra acentuada.
const dup = crearUsuario("duplicados@kalo.test");
crearAlimentoPropio(dup, {
  nombre: "Tarta de jamón",
  porcion: "1 porción",
  kcal: 380,
  proteina: 18,
  grasa: 22,
  carbohidrato: 26,
});
nota(
  `¿"TARTA DE JAMÓN" se detecta como duplicado de "Tarta de jamón"? ${
    existeAlimentoPropio(dup, "TARTA DE JAMÓN") ? "sí" : "NO"
  }`,
);
nota(
  `¿"tarta de jamon" (sin tilde) se detecta como duplicado? ${
    existeAlimentoPropio(dup, "tarta de jamon") ? "sí" : "no"
  }`,
);

// Que pasa si se borra la pesada que el plan usa como referencia.
const borrada = crearUsuario("referencia@kalo.test");
guardarPerfil(borrada, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(borrada, "bajar", 0.5);
reiniciarPlan(borrada, null);
registrarPesada(borrada, fechaMenosDias(hoy, 7), 80);
const refPesadas = listarPesadas(borrada);
eliminarPesada(borrada, refPesadas[0].id);
nota(
  `Tras borrar la pesada de referencia, el plan sigue apuntando a ${
    leerPlan(borrada).referenciaFecha
  } con ${leerPlan(borrada).referenciaPeso} kg, aunque esa pesada ya no está en el historial.`,
);
nota(
  `Y la pesada siguiente igual dispara el ajuste: ${JSON.stringify(
    registrarPesada(borrada, hoy, 80),
  )}`,
);

// Comida guardada con un alimento propio que despues se borra.
const huerfana = listarComidasGuardadas(al)[0];
const registroHuerfano = registrarComidaGuardada(al, hoy, huerfana.id);
nota(
  `La comida "${huerfana.nombre}" muestra ${huerfana.items.length} ítems pero registró ${registroHuerfano?.cantidad}.`,
);

// Alimento propio sin calorias ni macros.
const vacio = crearUsuario("aguaalimento@kalo.test");
crearAlimentoPropio(vacio, {
  nombre: "Agua mineral",
  porcion: "1 vaso (250 ml)",
  kcal: 0,
  proteina: 0,
  grasa: 0,
  carbohidrato: 0,
});
nota(
  `Un alimento de 0 kcal se acepta: ${listarAlimentosPropios(vacio)[0]?.nombre}`,
);

// Pesada muy antigua.
const antigua = crearUsuario("antigua@kalo.test");
guardarPerfil(antigua, {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
});
guardarObjetivo(antigua, "bajar", 0.5);
reiniciarPlan(antigua, null);
registrarPesada(antigua, "2020-01-01", 95);
nota(
  `Una pesada de 2020 se acepta y pasa a ser la referencia del plan (${
    leerPlan(antigua).referenciaFecha
  }).`,
);
nota(
  `Pesada de hoy contra esa referencia: ${JSON.stringify(
    registrarPesada(antigua, hoy, 80),
  )}`,
);

const sem = resumenSemanal(ej, hoy);
nota(
  `Resumen semanal de ejercicio@: variación ${sem.variacionTotal}, balance ${sem.balanceSemanal}, adherencia ${sem.adherencia} %`,
);

console.log(
  hallazgos === 0
    ? "\nRecorrido completo: todo coincidió con lo esperado."
    : `\n${hallazgos} punto(s) a revisar.`,
);

console.log("\nCookies de sesión para revisar por HTTP:");
for (const [nombre, id] of [
  ["ejercicio", ej],
  ["alimentos", al],
  ["progreso", pr],
  ["planf", pf],
] as const) {
  console.log(`  ${nombre}: ${cookie(id)}`);
}
