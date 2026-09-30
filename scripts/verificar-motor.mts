/**
 * Verificacion rapida del motor de metas contra los casos de borde de la
 * seccion 2 del documento de Historias de Usuario.
 *
 * Uso:  node scripts/verificar-motor.mts
 *
 * No es la suite de pruebas de la materia (los casos de prueba se ejecutan a
 * mano sobre la aplicacion). Sirve para confirmar que los numeros que van a los
 * casos de prueba son los que efectivamente devuelve la aplicacion.
 */

import {
  calcularGET,
  calcularMacros,
  calcularMetaAgua,
  calcularMetas,
  calcularTMB,
  estadoDelDia,
  type Perfil,
} from "../src/lib/calc.ts";

let fallas = 0;

function chequear(descripcion: string, real: unknown, esperado: unknown): void {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas++;
  const marca = ok ? "OK  " : "FALLA";
  console.log(`${marca} | ${descripcion}`);
  if (!ok) {
    console.log(`       esperado: ${JSON.stringify(esperado)}`);
    console.log(`       obtenido: ${JSON.stringify(real)}`);
  }
}

// --- Perfiles de referencia usados en los casos de prueba --------------------

const PERFIL_M: Perfil = {
  edad: 30,
  sexo: "masculino",
  peso: 80,
  altura: 180,
  actividad: "moderado",
};

const PERFIL_F: Perfil = {
  edad: 28,
  sexo: "femenino",
  peso: 60,
  altura: 165,
  actividad: "sedentario",
};

/** Perfil chico pensado para forzar el piso calorico. */
const PERFIL_F_CHICO: Perfil = {
  edad: 55,
  sexo: "femenino",
  peso: 45,
  altura: 150,
  actividad: "sedentario",
};

console.log("=== TMB y GET ===");
chequear("TMB masculino 30a 80kg 180cm", Math.round(calcularTMB(PERFIL_M)), 1780);
chequear("GET masculino moderado", Math.round(calcularGET(PERFIL_M)), 2759);
chequear("TMB femenino 28a 60kg 165cm", Math.round(calcularTMB(PERFIL_F)), 1330);
chequear("GET femenino sedentario", Math.round(calcularGET(PERFIL_F)), 1596);

console.log("\n=== Meta calorica ===");
const mantener = calcularMetas(PERFIL_M, "mantener", 0);
chequear("Mantener: meta igual al GET", mantener.meta, mantener.get);
chequear("Mantener: sin avisos", mantener.avisos, []);

const bajar05 = calcularMetas(PERFIL_M, "bajar", 0.5);
chequear("Bajar 0.5 kg/sem: meta", bajar05.meta, 2209);
chequear("Bajar 0.5 kg/sem: sin avisos", bajar05.avisos, []);

const subir03 = calcularMetas(PERFIL_M, "subir", 0.3);
chequear("Subir 0.3 kg/sem: meta", subir03.meta, 3089);

console.log("\n=== Borde: tasa maxima admisible ===");
const bajar10 = calcularMetas(PERFIL_M, "bajar", 1.0);
chequear("Bajar 1.0 (limite exacto): sin aviso", bajar10.avisos, []);
chequear("Bajar 1.0: tasa aplicada", bajar10.tasaAplicada, 1.0);

const bajar12 = calcularMetas(PERFIL_M, "bajar", 1.2);
chequear("Bajar 1.2: tasa acotada a 1.0", bajar12.tasaAplicada, 1.0);
chequear("Bajar 1.2: emite un aviso", bajar12.avisos.length, 1);
chequear(
  "Bajar 1.2: texto del aviso",
  bajar12.avisos[0],
  "La tasa máxima admisible para bajar de peso es 1.0 kg/semana. Se ajustó el valor ingresado a 1.0 kg/semana.",
);
chequear("Bajar 1.2: misma meta que bajar 1.0", bajar12.meta, bajar10.meta);

const subir05 = calcularMetas(PERFIL_M, "subir", 0.5);
chequear("Subir 0.5 (limite exacto): sin aviso", subir05.avisos, []);
const subir08 = calcularMetas(PERFIL_M, "subir", 0.8);
chequear("Subir 0.8: tasa acotada a 0.5", subir08.tasaAplicada, 0.5);

console.log("\n=== Borde: piso calorico de seguridad ===");
const pisoF = calcularMetas(PERFIL_F_CHICO, "bajar", 1.0);
chequear("Perfil chico, bajar 1.0: meta sin acotar", pisoF.metaSinAcotar, 42);
chequear("Perfil chico: meta acotada al piso", pisoF.meta, 1200);
chequear(
  "Perfil chico: texto del aviso del piso",
  pisoF.avisos[pisoF.avisos.length - 1],
  "La meta calculada (42 kcal) está por debajo del piso calórico de seguridad. Se ajustó la meta a 1200 kcal.",
);

const dobleAviso = calcularMetas(PERFIL_F_CHICO, "bajar", 1.4);
chequear("Tasa y piso acotados: dos avisos", dobleAviso.avisos.length, 2);
chequear(
  "Tasa y piso: primero el aviso de la tasa",
  dobleAviso.avisos[0].startsWith("La tasa máxima"),
  true,
);

console.log("\n=== Macronutrientes ===");
const macrosNormal = calcularMacros(2200, 80, "bajar");
chequear("Bajar 80 kg: proteina 2.0 g/kg", macrosNormal.proteina, 160);
chequear("Bajar 80 kg: grasa 0.8 g/kg", macrosNormal.grasa, 64);
chequear("Bajar 80 kg: reparto normal", macrosNormal.alternativo, false);

const macrosMantener = calcularMacros(2759, 80, "mantener");
chequear("Mantener 80 kg: proteina 1.6 g/kg", macrosMantener.proteina, 128);

const macrosAlt = calcularMacros(1200, 90, "bajar");
chequear("Minimos que no entran: reparto alternativo", macrosAlt.alternativo, true);
chequear("Reparto alternativo: proteina 30 %", macrosAlt.proteina, 90);
chequear("Reparto alternativo: grasa 30 %", macrosAlt.grasa, 40);
chequear("Reparto alternativo: carbohidratos 40 %", macrosAlt.carbohidrato, 120);

console.log("\n=== Hidratacion ===");
chequear("80 kg -> 2800 ml", calcularMetaAgua(80), 2800);
chequear("60 kg -> 2100 ml", calcularMetaAgua(60), 2100);
chequear("73 kg -> redondeo a 50 ml", calcularMetaAgua(73), 2550);

console.log("\n=== Estados del dia (meta 2000, piso 1500) ===");
chequear("0 kcal", estadoDelDia(0, 2000, 1500), "Por debajo del minimo");
chequear("1499 kcal", estadoDelDia(1499, 2000, 1500), "Por debajo del minimo");
chequear("1500 kcal", estadoDelDia(1500, 2000, 1500), "Incompleto");
chequear("1899 kcal", estadoDelDia(1899, 2000, 1500), "Incompleto");
chequear("1900 kcal (limite inferior)", estadoDelDia(1900, 2000, 1500), "En rango");
chequear("2000 kcal", estadoDelDia(2000, 2000, 1500), "En rango");
chequear("2100 kcal (limite superior)", estadoDelDia(2100, 2000, 1500), "En rango");
chequear("2101 kcal", estadoDelDia(2101, 2000, 1500), "Excedido");

console.log("\n=== Precedencia: meta igual al piso (meta 1500, piso 1500) ===");
chequear(
  "1450 kcal cae en +-5 % pero esta bajo el piso",
  estadoDelDia(1450, 1500, 1500),
  "Por debajo del minimo",
);
chequear("1500 kcal", estadoDelDia(1500, 1500, 1500), "En rango");

console.log(
  `\n${fallas === 0 ? "Todas las verificaciones pasaron." : `${fallas} verificacion(es) fallaron.`}`,
);
process.exit(fallas === 0 ? 0 : 1);
