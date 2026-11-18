/**
 * Verificacion del motor de la V3 contra los valores esperados que figuran en
 * los casos de prueba (entrega-03/02-casos-de-prueba-v3.md).
 *
 * Uso:  node --import ./scripts/registrar-ts.mjs scripts/verificar-motor-v3.mts
 *
 * No reemplaza la ejecucion manual ni la automatizada: confirma que los
 * numeros y los textos escritos en los casos son los que devuelve el motor.
 */

import {
  DIAS_MAXIMOS_AJUSTE,
  evaluarAjustePlan,
  mensajeAlimentoEliminado,
  mensajeAlimentoEnUso,
  mensajePesadaEliminada,
  mensajeReferenciaVencida,
  normalizarNombre,
} from "../src/lib/calc.ts";
import {
  ENCABEZADO_CSV,
  armarCsvSemana,
  nombreArchivoResumen,
  type FilaSemana,
} from "../src/lib/exportar.ts";
import { recomendaciones, type DatosCoach } from "../src/lib/coach.ts";

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

// =============================================================================
titulo("KL-19 — exportacion del resumen semanal");

const dia = (
  fecha: string,
  consumido: number,
  gastado: number,
  metaDia: number,
  estado: string | null,
  agua: number,
  macros: [number, number, number],
): FilaSemana => ({
  fecha,
  consumido,
  gastado,
  metaDia,
  balance: estado === null ? 0 : consumido - metaDia,
  estado,
  agua,
  proteina: macros[0],
  grasa: macros[1],
  carbohidrato: macros[2],
});

const semana: FilaSemana[] = [
  dia("2026-11-09", 2150, 0, 2209, "En rango", 2800, [160.4, 60.2, 240.6]),
  dia("2026-11-10", 0, 0, 0, null, 0, [0, 0, 0]),
  dia("2026-11-11", 2600, 600, 2209, "Excedido", 1000, [120, 90, 300]),
  dia("2026-11-12", 0, 0, 0, null, 0, [0, 0, 0]),
  dia("2026-11-13", 0, 0, 0, null, 0, [0, 0, 0]),
  dia("2026-11-14", 0, 0, 0, null, 0, [0, 0, 0]),
  dia("2026-11-15", 1900, 300, 2209, "Incompleto", 1500, [140, 55, 200]),
];

const csv = armarCsvSemana(semana);
const lineas = csv.replace(/^﻿/, "").trimEnd().split("\r\n");

chequear("TC-41: el archivo se llama kalo-resumen-AAAA-MM-DD.csv",
  nombreArchivoResumen("2026-11-15"), "kalo-resumen-2026-11-15.csv");
chequear("TC-41: arranca con BOM", csv.startsWith("﻿"), true);
chequear("TC-41: encabezado literal", lineas[0], ENCABEZADO_CSV);
chequear("TC-41: 9 lineas (encabezado + 7 dias + totales)", lineas.length, 9);
chequear("TC-41: el primer dia es el mas viejo", lineas[1].split(";")[0], "09/11/2026");
chequear("TC-41: el ultimo dia es hoy", lineas[7].split(";")[0], "15/11/2026");
chequear(
  "TC-41: dia con registros",
  lineas[1],
  "09/11/2026;2150;0;2209;-59;En rango;2800;160,4;60,2;240,6",
);
chequear(
  "TC-42: dia sin registros va en cero y dice Sin registros",
  lineas[2],
  "10/11/2026;0;0;0;0;Sin registros;0;0,0;0,0;0,0",
);
chequear(
  "TC-41: fila de totales, con la columna Estado vacia",
  lineas[8],
  "Totales;6650;900;6627;23;;5300;420,4;205,2;740,6",
);

// =============================================================================
titulo("KL-20 — reglas nuevas del Coach");

const BASE: DatosCoach = {
  conPlan: true,
  consumido: 2150,
  metaDia: 2209,
  piso: 1500,
  estado: "En rango",
  proteina: 160,
  metaProteina: 160,
  agua: 2800,
  metaAgua: 2800,
  diasSinEjercicio: 0,
  minutosEjercicio: 0,
  objetivo: "bajar",
  tendenciaPeso: null,
  diasConRegistros: 1,
  diasEnRango: 1,
  rachaEnRango: 1,
};

chequear(
  "TC-43: sin plan, una sola recomendacion (regla 1 excluyente)",
  recomendaciones({ ...BASE, conPlan: false, estado: null }),
  ["Completá tu perfil y tu objetivo para que pueda darte recomendaciones."],
);

chequear(
  "TC-43: el peso sube y el objetivo es bajar (regla 4)",
  recomendaciones({ ...BASE, tendenciaPeso: 0.4 })[0],
  "Tu peso varió 0.4 kg desde la pesada anterior y tu objetivo es bajar de peso. Revisá el balance de la semana.",
);

chequear(
  "TC-43: una variacion de 0.2 kg no dispara la regla 4",
  recomendaciones({ ...BASE, tendenciaPeso: 0.2 })[0],
  "Vas en rango: llevás 2150 kcal de una meta de 2209 kcal.",
);

chequear(
  "TC-44: con 60 minutos de ejercicio, el agua se informa con el entrenamiento (regla 6)",
  recomendaciones({ ...BASE, minutosEjercicio: 90, agua: 1500, metaAgua: 3350 })[0],
  "Hoy entrenaste 90 minutos: te faltan 1850 ml de agua para la meta de 3350 ml.",
);

chequear(
  "TC-44: sin ejercicio, el agua usa la regla 7 y recien por debajo del 60 %",
  recomendaciones({ ...BASE, agua: 1500, metaAgua: 2800 })[0],
  "Llevás 1500 ml de agua de una meta de 2800 ml.",
);

chequear(
  "TC-45: adherencia por debajo del 50 % con 4 dias cargados (regla 8)",
  recomendaciones({ ...BASE, diasConRegistros: 4, diasEnRango: 1, rachaEnRango: 0 })[0],
  "Esta semana cumpliste la meta 1 de 4 días. Planificá el día antes de empezarlo.",
);

chequear(
  "TC-45: con 2 dias cargados la adherencia todavia no se informa",
  recomendaciones({ ...BASE, diasConRegistros: 2, diasEnRango: 0, rachaEnRango: 0 })[0],
  "Vas en rango: llevás 2150 kcal de una meta de 2209 kcal.",
);

chequear(
  "TC-46: racha de 3 dias en rango (regla 10)",
  recomendaciones({ ...BASE, diasConRegistros: 3, diasEnRango: 3, rachaEnRango: 3 }),
  [
    "Llevás 3 días seguidos en rango. Seguí así.",
    "Vas en rango: llevás 2150 kcal de una meta de 2209 kcal.",
  ],
);

chequear(
  "TC-46: nunca mas de tres recomendaciones, y en el orden de la tabla",
  recomendaciones({
    ...BASE,
    consumido: 1200,
    estado: "Por debajo del mínimo",
    proteina: 40,
    agua: 0,
    tendenciaPeso: 0.6,
    diasConRegistros: 4,
    diasEnRango: 0,
    rachaEnRango: 0,
  }),
  [
    "Hoy estás por debajo del piso calórico de seguridad (1500 kcal). Te faltan 300 kcal para llegar.",
    "Tu peso varió 0.6 kg desde la pesada anterior y tu objetivo es bajar de peso. Revisá el balance de la semana.",
    "Te faltan 120 g de proteína para llegar a tu meta de 160 g.",
  ],
);

chequear(
  "TC-46: el Coach es deterministico",
  recomendaciones(BASE),
  recomendaciones(BASE),
);

// =============================================================================
titulo("KL-21 — integridad al eliminar");

chequear(
  "TC-48: alimento usado por una comida guardada",
  mensajeAlimentoEnUso("Tarta de jamón", ["Mi desayuno"]),
  "No podés eliminar «Tarta de jamón» porque forma parte de la comida guardada «Mi desayuno».",
);
chequear(
  "TC-48: alimento usado por dos comidas guardadas",
  mensajeAlimentoEnUso("Tarta de jamón", ["Mi desayuno", "Mi merienda"]),
  "No podés eliminar «Tarta de jamón» porque forma parte de las comidas guardadas «Mi desayuno», «Mi merienda».",
);
chequear(
  "TC-48: alimento libre",
  mensajeAlimentoEliminado("Budín casero"),
  "Se eliminó el alimento «Budín casero».",
);
chequear(
  "TC-49: pesada que no era la referencia",
  mensajePesadaEliminada("2026-11-10"),
  "Se eliminó la pesada del 10/11/2026.",
);
chequear(
  "TC-49: pesada de referencia, el plan re-apunta",
  mensajePesadaEliminada("2026-11-01", "2026-11-08"),
  "Se eliminó la pesada del 01/11/2026. El plan toma como referencia la pesada del 08/11/2026.",
);
chequear(
  "TC-49: era la unica pesada",
  mensajePesadaEliminada("2026-11-01", null),
  "Se eliminó la pesada del 01/11/2026. El plan quedó sin pesada de referencia.",
);

// =============================================================================
titulo("DF-04 — nombres que solo difieren en mayusculas o tildes");

chequear("normaliza tildes y mayusculas",
  normalizarNombre("TARTA DE JAMON"), normalizarNombre("Tarta de jamón"));
chequear("normaliza espacios de mas",
  normalizarNombre("  Mi   desayuno "), "mi desayuno");
chequear("no confunde nombres distintos",
  normalizarNombre("Tarta de jamón") === normalizarNombre("Tarta de verduras"), false);

// =============================================================================
titulo("DF-07 — pesada de referencia vencida");

const vencida = evaluarAjustePlan({
  objetivo: "bajar",
  tasa: 0.5,
  pesoReferencia: 80,
  fechaReferencia: "2020-01-01",
  pesoReal: 79,
  fechaPesada: "2026-11-15",
  metaVigente: 2209,
  piso: 1500,
});
chequear("TC-50: con una referencia de 2020 el plan no recalcula",
  [vencida.evaluado, vencida.referenciaVencida, vencida.metaNueva],
  [true, true, 2209]);
chequear("TC-50: y avisa por que",
  vencida.avisos,
  [mensajeReferenciaVencida(2510)]);

const alLimite = evaluarAjustePlan({
  objetivo: "bajar",
  tasa: 0.5,
  pesoReferencia: 80,
  fechaReferencia: "2026-09-16",
  pesoReal: 79,
  fechaPesada: "2026-11-15",
  metaVigente: 2209,
  piso: 1500,
});
chequear(`TC-50: con ${DIAS_MAXIMOS_AJUSTE} dias justos todavia recalcula`,
  [alLimite.evaluado, alLimite.referenciaVencida],
  [true, false]);

const normal = evaluarAjustePlan({
  objetivo: "bajar",
  tasa: 0.5,
  pesoReferencia: 80,
  fechaReferencia: "2026-11-08",
  pesoReal: 79.8,
  fechaPesada: "2026-11-15",
  metaVigente: 2209,
  piso: 1500,
});
chequear("TC-50: el ajuste de siempre sigue funcionando igual que en la V2",
  [normal.evaluado, normal.referenciaVencida, normal.pesoProyectado],
  [true, false, 79.5]);

console.log(
  fallas === 0
    ? "\nTodas las verificaciones pasaron."
    : `\n${fallas} verificacion(es) fallaron.`,
);
process.exitCode = fallas === 0 ? 0 : 1;
