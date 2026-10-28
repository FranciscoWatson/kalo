/**
 * Verificacion rapida del motor de la V2 contra los valores esperados que
 * figuran en los casos de prueba (entrega-02/02-casos-de-prueba-v2.md).
 *
 * Uso:  node scripts/verificar-motor-v2.mts
 *
 * No reemplaza la ejecucion manual de los casos: confirma que los numeros
 * escritos en los casos de prueba son los que devuelve el motor.
 */

import {
  calcularKcalEjercicio,
  calcularMetaAgua,
  calcularMetas,
  estadoDelDia,
  evaluarAjustePlan,
  extraAguaPorEjercicio,
  kcalDeLosMacros,
  metaDelDia,
  toleranciaAlimento,
  validarAlimentoPropio,
  validarDuracion,
  type Perfil,
} from "../src/lib/calc.ts";
import { recomendaciones } from "../src/lib/coach.ts";
import { buscarEjercicio } from "../src/lib/ejercicios.ts";

let fallas = 0;

function chequear(descripcion: string, real: unknown, esperado: unknown): void {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas++;
  console.log(`${ok ? "OK  " : "FALLA"} | ${descripcion}`);
  if (!ok) {
    console.log(`       esperado: ${JSON.stringify(esperado)}`);
    console.log(`       obtenido: ${JSON.stringify(real)}`);
  }
}

function titulo(texto: string): void {
  console.log(`\n=== ${texto} ===`);
}

const P_M: Perfil = {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
};

const P_F: Perfil = {
  edad: 28,
  sexo: "femenino",
  peso: 60,
  altura: 165,
  actividad: "sedentario",
};

function met(id: string): number {
  return buscarEjercicio(id)!.met;
}

// --- KL-10 -------------------------------------------------------------------

titulo("Calorias del ejercicio (80 kg)");
chequear(
  "TC-20: caminata 30 min moderada = 140 kcal",
  calcularKcalEjercicio(met("caminata"), 80, 30, "moderada"),
  140,
);
chequear(
  "TC-20: musculacion 60 min suave = 340 kcal",
  calcularKcalEjercicio(met("musculacion"), 80, 60, "suave"),
  340,
);
chequear(
  "Bicicleta 60 min moderada = 600 kcal",
  calcularKcalEjercicio(met("bicicleta"), 80, 60, "moderada"),
  600,
);
chequear(
  "Trote 45 min intensa = 576 kcal",
  calcularKcalEjercicio(met("trote"), 80, 45, "intensa"),
  576,
);
chequear(
  "TC-21: correr 5 min moderada = 73 kcal",
  calcularKcalEjercicio(met("correr"), 80, 5, "moderada"),
  73,
);
chequear(
  "TC-21: correr 300 min moderada = 4400 kcal",
  calcularKcalEjercicio(met("correr"), 80, 300, "moderada"),
  4400,
);

titulo("Validacion de la duracion");
chequear("TC-21: 5 min es valido", validarDuracion(5), []);
chequear("TC-21: 300 min es valido", validarDuracion(300), []);
chequear("TC-21: 4 min se rechaza", validarDuracion(4).length, 1);
chequear("TC-21: 301 min se rechaza", validarDuracion(301).length, 1);
chequear("TC-21: 0 min se rechaza", validarDuracion(0).length, 1);
chequear("TC-21: -10 min se rechaza", validarDuracion(-10).length, 1);
chequear(
  "TC-21: 30.5 min pide numero entero",
  validarDuracion(30.5),
  ["La duración debe ser un número entero de minutos."],
);

// --- KL-11 -------------------------------------------------------------------

titulo("Modo de calculo (P-M bajar 0.5: meta 2209, piso 1500)");
const metasPM = calcularMetas(P_M, "bajar", 0.5);
chequear("Meta de P-M bajar 0.5", metasPM.meta, 2209);
chequear("Macros de P-M bajar 0.5", [
  metasPM.macros.proteina,
  metasPM.macros.grasa,
  metasPM.macros.carbohidrato,
], [160, 64, 248]);

chequear(
  "TC-22: modo no_suma, meta del dia sigue en 2209",
  metaDelDia(2209, 600, "no_suma"),
  2209,
);
chequear(
  "TC-22: modo no_suma, consumido 2194 queda En rango",
  estadoDelDia(2194, metaDelDia(2209, 600, "no_suma"), 1500),
  "En rango",
);
chequear(
  "TC-23: modo suma, meta del dia 2809",
  metaDelDia(2209, 600, "suma"),
  2809,
);
chequear(
  "TC-23: modo suma, consumido 2194 queda Incompleto",
  estadoDelDia(2194, metaDelDia(2209, 600, "suma"), 1500),
  "Incompleto",
);
chequear(
  "TC-23: modo suma, consumido 1420 queda Por debajo del minimo",
  estadoDelDia(1420, metaDelDia(2209, 600, "suma"), 1500),
  "Por debajo del minimo",
);
chequear(
  "TC-23: modo suma, consumido 1654 pasa a Incompleto",
  estadoDelDia(1654, metaDelDia(2209, 600, "suma"), 1500),
  "Incompleto",
);

// --- KL-12 -------------------------------------------------------------------

titulo("Hidratacion ajustada por ejercicio");
chequear("Meta base de 80 kg", calcularMetaAgua(80), 2800);
chequear("TC-24: 30 min suman 200 ml", extraAguaPorEjercicio(30), 200);
chequear("TC-24: 90 min suman 550 ml", extraAguaPorEjercicio(90), 550);
chequear("TC-24: meta con 90 min = 3350 ml", 2800 + extraAguaPorEjercicio(90), 3350);
chequear("Sin ejercicio no hay extra", extraAguaPorEjercicio(0), 0);

// --- KL-13 -------------------------------------------------------------------

titulo("Coherencia de los alimentos propios");
const tarta = {
  nombre: "Tarta de jamón y queso",
  porcion: "1 porción (180 g)",
  kcal: 380,
  proteina: 18,
  grasa: 22,
  carbohidrato: 26,
};
chequear("TC-25: la tarta suma 374 kcal de macros", kcalDeLosMacros(tarta), 374);
chequear("TC-25: la tarta se acepta", validarAlimentoPropio(tarta), []);

const budin = {
  nombre: "Budín casero",
  porcion: "1 porción (80 g)",
  kcal: 200,
  proteina: 10,
  grasa: 20,
  carbohidrato: 10,
};
chequear("TC-26: el budin suma 260 kcal de macros", kcalDeLosMacros(budin), 260);
chequear(
  "TC-26: mensaje exacto del rechazo",
  validarAlimentoPropio(budin),
  [
    "Los macronutrientes declarados suman 260 kcal y no coinciden con las 200 kcal ingresadas (diferencia de 60 kcal, tolerancia +/- 20 kcal).",
  ],
);

chequear("TC-26: tolerancia de 300 kcal es 30", toleranciaAlimento(300), 30);
chequear("TC-26: tolerancia de 100 kcal es 20, no 10", toleranciaAlimento(100), 20);
chequear(
  "TC-26: diferencia igual a la tolerancia se acepta",
  validarAlimentoPropio({
    nombre: "Borde justo",
    porcion: "1 porción",
    kcal: 300,
    proteina: 30,
    grasa: 10,
    carbohidrato: 30,
  }),
  [],
);
chequear(
  "TC-26: diferencia de 34 sobre tolerancia 30 se rechaza",
  validarAlimentoPropio({
    nombre: "Borde pasado",
    porcion: "1 porción",
    kcal: 300,
    proteina: 31,
    grasa: 10,
    carbohidrato: 30,
  }),
  [
    "Los macronutrientes declarados suman 334 kcal y no coinciden con las 300 kcal ingresadas (diferencia de 34 kcal, tolerancia +/- 30 kcal).",
  ],
);
chequear(
  "TC-26: 100 kcal con 120 de macros se acepta por la tolerancia minima",
  validarAlimentoPropio({
    nombre: "Infusión liviana",
    porcion: "1 taza",
    kcal: 100,
    proteina: 0,
    grasa: 0,
    carbohidrato: 30,
  }),
  [],
);
chequear(
  "TC-27: valores negativos",
  validarAlimentoPropio({ ...tarta, proteina: -5 }),
  ["Las calorías y los macronutrientes no pueden ser negativos."],
);
chequear(
  "TC-27: campos vacios",
  validarAlimentoPropio({ ...tarta, nombre: "" }),
  ["Todos los campos del alimento son obligatorios."],
);
chequear(
  "TC-27: nombre de 2 caracteres",
  validarAlimentoPropio({ ...tarta, nombre: "Pa" }),
  ["El nombre debe tener entre 3 y 40 caracteres."],
);

// --- KL-15 y KL-16 -----------------------------------------------------------

titulo("Pesadas y metas recalculadas");
const metas792 = calcularMetas({ ...P_M, peso: 79.2 }, "bajar", 0.5);
chequear("TC-30: meta con 79.2 kg", metas792.meta, 2197);
chequear("TC-30: meta de agua con 79.2 kg", metas792.metaAgua, 2750);
chequear("TC-30: macros con 79.2 kg", [
  metas792.macros.proteina,
  metas792.macros.grasa,
  metas792.macros.carbohidrato,
], [158, 63, 248]);

titulo("Ajuste dinamico del plan");
const ajuste14 = evaluarAjustePlan({
  objetivo: "bajar",
  tasa: 0.5,
  pesoReferencia: 80,
  fechaReferencia: "2026-10-12",
  pesoReal: 79.4,
  fechaPesada: "2026-10-26",
  metaVigente: calcularMetas({ ...P_M, peso: 79.4 }, "bajar", 0.5).meta,
  piso: 1500,
});
chequear("TC-33: meta vigente con 79.4 kg", ajuste14.metaAnterior, 2200);
chequear("TC-33: peso proyectado a 14 dias", ajuste14.pesoProyectado, 79);
chequear("TC-33: correccion de -220 kcal", ajuste14.correccion, -220);
chequear("TC-33: meta nueva 1980", ajuste14.metaNueva, 1980);
chequear(
  "TC-33: aviso del recalculo",
  ajuste14.avisos,
  [
    "Tu peso real (79.4 kg) difiere del proyectado (79.0 kg). Se recalculó la meta de 2200 a 1980 kcal.",
  ],
);

const ajusteLimite = evaluarAjustePlan({
  objetivo: "bajar",
  tasa: 0.5,
  pesoReferencia: 80,
  fechaReferencia: "2026-10-19",
  pesoReal: 80,
  fechaPesada: "2026-10-26",
  metaVigente: 2209,
  piso: 1500,
});
chequear("TC-34: correccion calculada -550", ajusteLimite.correccion, -550);
chequear("TC-34: ajuste acotado a -331", ajusteLimite.ajusteAplicado, -331);
chequear("TC-34: meta nueva 1878", ajusteLimite.metaNueva, 1878);
chequear(
  "TC-34: los dos avisos, en orden",
  ajusteLimite.avisos,
  [
    "Tu peso real (80.0 kg) difiere del proyectado (79.5 kg). Se recalculó la meta de 2209 a 1878 kcal.",
    "La corrección calculada (-550 kcal) supera el límite del 15 %. Se ajustó la meta en -331 kcal.",
  ],
);

const enLinea = evaluarAjustePlan({
  objetivo: "bajar",
  tasa: 0.5,
  pesoReferencia: 80,
  fechaReferencia: "2026-10-19",
  pesoReal: 79.6,
  fechaPesada: "2026-10-26",
  metaVigente: 2203,
  piso: 1500,
});
chequear("TC-35: desvio de 0.1 kg no ajusta", enLinea.enLinea, true);
chequear("TC-35: la meta no cambia", enLinea.metaNueva, 2203);
chequear("TC-35: meta con 79.6 kg", calcularMetas({ ...P_M, peso: 79.6 }, "bajar", 0.5).meta, 2203);

const sinDias = evaluarAjustePlan({
  objetivo: "bajar",
  tasa: 0.5,
  pesoReferencia: 80,
  fechaReferencia: "2026-10-20",
  pesoReal: 79,
  fechaPesada: "2026-10-26",
  metaVigente: 2209,
  piso: 1500,
});
chequear("TC-35: con 6 dias no se evalua", sinDias.evaluado, false);

const metasPF = calcularMetas(P_F, "bajar", 0.5);
chequear("TC-34: meta de P-F acotada al piso", metasPF.meta, 1200);
const ajustePiso = evaluarAjustePlan({
  objetivo: "bajar",
  tasa: 0.5,
  pesoReferencia: 60,
  fechaReferencia: "2026-10-19",
  pesoReal: 60,
  fechaPesada: "2026-10-26",
  metaVigente: 1200,
  piso: 1200,
});
chequear("TC-34: la meta queda en el piso", ajustePiso.metaNueva, 1200);
chequear("TC-34: se muestran tres avisos", ajustePiso.avisos.length, 3);

// --- KL-17 -------------------------------------------------------------------

titulo("Coach");
chequear(
  "TC-37: dia vacio, tres recomendaciones en orden",
  recomendaciones({
    conPlan: true,
    consumido: 0,
    metaDia: 2209,
    piso: 1500,
    estado: "Por debajo del minimo",
    proteina: 0,
    metaProteina: 160,
    agua: 0,
    metaAgua: 2800,
    diasSinEjercicio: 5,
  }),
  [
    "Hoy estás por debajo del piso calórico de seguridad (1500 kcal). Te faltan 1500 kcal para llegar.",
    "Te faltan 160 g de proteína para llegar a tu meta de 160 g.",
    "Llevás 0 ml de agua de una meta de 2800 ml.",
  ],
);
chequear(
  "TC-37: dia en rango con agua cargada",
  recomendaciones({
    conPlan: true,
    consumido: 2194,
    metaDia: 2209,
    piso: 1500,
    estado: "En rango",
    proteina: 100,
    metaProteina: 160,
    agua: 2000,
    metaAgua: 2800,
    diasSinEjercicio: 5,
  }),
  [
    "Te faltan 60 g de proteína para llegar a tu meta de 160 g.",
    "No registraste ejercicio en los últimos 3 días.",
    "Vas en rango: llevás 2194 kcal de una meta de 2209 kcal.",
  ],
);
chequear(
  "Sin perfil, el Coach pide completarlo",
  recomendaciones({
    conPlan: false,
    consumido: 0,
    metaDia: 0,
    piso: 0,
    estado: null,
    proteina: 0,
    metaProteina: 0,
    agua: 0,
    metaAgua: 0,
    diasSinEjercicio: 0,
  }),
  ["Completá tu perfil y tu objetivo para que pueda darte recomendaciones."],
);

// --- DF-02 -------------------------------------------------------------------

titulo("Confirmacion de DF-02 (aviso del reparto alternativo)");
const pAlt: Perfil = {
  edad: 40,
  sexo: "femenino",
  peso: 70,
  altura: 160,
  actividad: "sedentario",
};
const metasAlt = calcularMetas(pAlt, "bajar", 1.0);
chequear(
  "TC-40: los dos avisos, piso primero y reparto despues",
  metasAlt.avisos,
  [
    "La meta calculada (507 kcal) está por debajo del piso calórico de seguridad. Se ajustó la meta a 1200 kcal.",
    "Los mínimos de proteína y grasa no entran en la meta calórica. Se aplicó el reparto alternativo 30/30/40.",
  ],
);
chequear("TC-40: reparto 30/30/40 sobre 1200 kcal", [
  metasAlt.macros.proteina,
  metasAlt.macros.grasa,
  metasAlt.macros.carbohidrato,
], [90, 40, 120]);

console.log(
  fallas === 0
    ? "\nTodas las verificaciones pasaron."
    : `\n${fallas} verificacion(es) fallaron.`,
);
process.exitCode = fallas === 0 ? 0 : 1;
