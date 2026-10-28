/**
 * Kalo V1 - Motor de metas.
 *
 * Modulo puro: sin acceso a base de datos, sin I/O. Toda la logica de negocio
 * de la V1 vive aca, segun la seccion 2 del documento de Historias de Usuario.
 */

export type Sexo = "femenino" | "masculino";
export type NivelActividad =
  | "sedentario"
  | "ligero"
  | "moderado"
  | "activo"
  | "muy_activo";
export type Objetivo = "bajar" | "mantener" | "subir";
export type EstadoDia =
  | "Por debajo del minimo"
  | "En rango"
  | "Excedido"
  | "Incompleto";

/** Etiquetas visibles del estado del dia (con acentos, para la interfaz). */
export const ETIQUETA_ESTADO: Record<EstadoDia, string> = {
  "Por debajo del minimo": "Por debajo del mínimo",
  "En rango": "En rango",
  Excedido: "Excedido",
  Incompleto: "Incompleto",
};

// --- Constantes de negocio (seccion 2) ---------------------------------------

export const FACTOR_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
};

export const ETIQUETA_ACTIVIDAD: Record<NivelActividad, string> = {
  sedentario: "Sedentario",
  ligero: "Ligero",
  moderado: "Moderado",
  activo: "Activo",
  muy_activo: "Muy activo",
};

/** Piso calorico de seguridad por sexo, en kcal. */
export const PISO_CALORICO: Record<Sexo, number> = {
  femenino: 1200,
  masculino: 1500,
};

/** Tasa maxima admisible en kg/semana, por objetivo. */
export const TASA_MAXIMA: Record<"bajar" | "subir", number> = {
  bajar: 1.0,
  subir: 0.5,
};

export const LIMITES = {
  edad: { min: 14, max: 100 },
  peso: { min: 30, max: 300 },
  altura: { min: 120, max: 250 },
  tasa: { min: 0, max: 1.5 },
  porciones: { min: 0, max: 20 },
  agua: { min: 1, max: 3000 },
} as const;

/** Equivalencia energetica de 1 kg de masa corporal, en kcal. */
export const KCAL_POR_KG = 7700;

/** kcal por gramo de cada macronutriente. */
export const KCAL_POR_GRAMO = { proteina: 4, carbohidrato: 4, grasa: 9 } as const;

/** Minimos de macronutrientes en gramos por kg de peso corporal. */
export const MINIMO_PROTEINA_G_KG = { bajar: 2.0, mantener: 1.6, subir: 1.6 };
export const MINIMO_GRASA_G_KG = 0.8;

/** Gramos minimos de carbohidrato que deben quedar para no aplicar la regla alternativa. */
export const CARBOS_MINIMOS_G = 50;

/** Reparto alternativo proporcional: proteina / grasa / carbohidrato. */
export const REPARTO_ALTERNATIVO = { proteina: 0.3, grasa: 0.3, carbohidrato: 0.4 };

/** Mililitros de agua por kg de peso corporal. */
export const ML_AGUA_POR_KG = 35;

/** Tolerancia del estado "En rango", como fraccion de la meta. */
export const TOLERANCIA_EN_RANGO = 0.05;

export const MENSAJES = {
  edadFueraDeRango: "La edad debe estar entre 14 y 100 años.",
  pesoFueraDeRango: "El peso debe estar entre 30 y 300 kg.",
  alturaFueraDeRango: "La altura debe estar entre 120 y 250 cm.",
  tasaFueraDeRango: "La tasa debe estar entre 0.0 y 1.5 kg/semana.",
  camposObligatorios: "Todos los campos del perfil son obligatorios.",
  sinPerfil: "Primero debés completar tu perfil.",
  porcionesMinimo: "La cantidad de porciones debe ser mayor a 0.",
  porcionesMaximo: "La cantidad de porciones no puede superar 20.",
  aguaFueraDeRango: "La cantidad de agua debe estar entre 1 y 3000 ml.",
  emailDuplicado: "El correo electrónico ya está registrado.",
  emailInvalido: "El correo electrónico no tiene un formato válido.",
  passwordCorta: "La contraseña debe tener al menos 8 caracteres.",
  passwordsNoCoinciden: "Las contraseñas no coinciden.",
  credencialesInvalidas: "Credenciales inválidas.",
  repartoAlternativo:
    "Los mínimos de proteína y grasa no entran en la meta calórica. Se aplicó el reparto alternativo 30/30/40.",
} as const;

export function mensajeTasaAcotada(objetivo: "bajar" | "subir"): string {
  const max = TASA_MAXIMA[objetivo].toFixed(1);
  const verbo = objetivo === "bajar" ? "bajar de peso" : "subir de peso";
  return `La tasa máxima admisible para ${verbo} es ${max} kg/semana. Se ajustó el valor ingresado a ${max} kg/semana.`;
}

export function mensajeMetaAcotada(metaCalculada: number, piso: number): string {
  return `La meta calculada (${metaCalculada} kcal) está por debajo del piso calórico de seguridad. Se ajustó la meta a ${piso} kcal.`;
}

// --- Tipos -------------------------------------------------------------------

export interface Perfil {
  edad: number;
  sexo: Sexo;
  peso: number;
  altura: number;
  actividad: NivelActividad;
}

export interface Macros {
  proteina: number;
  grasa: number;
  carbohidrato: number;
}

export interface ResultadoMacros extends Macros {
  /** true si hubo que descartar los minimos y aplicar el reparto 30/30/40. */
  alternativo: boolean;
  aviso: string | null;
}

export interface ResultadoMetas {
  tmb: number;
  get: number;
  /** Tasa efectivamente aplicada, ya acotada al maximo admisible. */
  tasaAplicada: number;
  /** Meta antes de aplicar el piso calorico de seguridad. */
  metaSinAcotar: number;
  /** Meta final, ya acotada al piso. */
  meta: number;
  piso: number;
  macros: ResultadoMacros;
  metaAgua: number;
  /** Mensajes descriptivos de los ajustes aplicados, en orden. */
  avisos: string[];
}

// --- Validaciones ------------------------------------------------------------

function dentroDeRango(valor: number, min: number, max: number): boolean {
  return Number.isFinite(valor) && valor >= min && valor <= max;
}

/** Valida un perfil y devuelve la lista de errores (vacia si es valido). */
export function validarPerfil(p: Partial<Perfil>): string[] {
  const errores: string[] = [];

  const faltaAlguno =
    p.edad === undefined ||
    p.edad === null ||
    Number.isNaN(p.edad) ||
    p.peso === undefined ||
    p.peso === null ||
    Number.isNaN(p.peso) ||
    p.altura === undefined ||
    p.altura === null ||
    Number.isNaN(p.altura) ||
    !p.sexo ||
    !p.actividad;

  if (faltaAlguno) {
    errores.push(MENSAJES.camposObligatorios);
    return errores;
  }

  if (!dentroDeRango(p.edad!, LIMITES.edad.min, LIMITES.edad.max)) {
    errores.push(MENSAJES.edadFueraDeRango);
  }
  if (!dentroDeRango(p.peso!, LIMITES.peso.min, LIMITES.peso.max)) {
    errores.push(MENSAJES.pesoFueraDeRango);
  }
  if (!dentroDeRango(p.altura!, LIMITES.altura.min, LIMITES.altura.max)) {
    errores.push(MENSAJES.alturaFueraDeRango);
  }

  return errores;
}

/** Valida la tasa de variacion en kg/semana. Devuelve errores (vacio si es valida). */
export function validarTasa(objetivo: Objetivo, tasa: number): string[] {
  if (objetivo === "mantener") return [];
  if (!dentroDeRango(tasa, LIMITES.tasa.min, LIMITES.tasa.max)) {
    return [MENSAJES.tasaFueraDeRango];
  }
  return [];
}

// --- Motor de metas ----------------------------------------------------------

/** TMB segun Mifflin-St Jeor. */
export function calcularTMB(p: Perfil): number {
  const base = 10 * p.peso + 6.25 * p.altura - 5 * p.edad;
  return p.sexo === "masculino" ? base + 5 : base - 161;
}

/** Gasto energetico total diario. */
export function calcularGET(p: Perfil): number {
  return calcularTMB(p) * FACTOR_ACTIVIDAD[p.actividad];
}

/**
 * Acota la tasa al maximo admisible del objetivo.
 * No rechaza: recorta y explica el criterio aplicado.
 */
export function acotarTasa(
  objetivo: Objetivo,
  tasa: number,
): { tasa: number; aviso: string | null } {
  if (objetivo === "mantener") return { tasa: 0, aviso: null };
  const max = TASA_MAXIMA[objetivo];
  if (tasa > max) return { tasa: max, aviso: mensajeTasaAcotada(objetivo) };
  return { tasa, aviso: null };
}

/** Reparto de macronutrientes con minimos por kg y regla alternativa. */
export function calcularMacros(
  meta: number,
  peso: number,
  objetivo: Objetivo,
): ResultadoMacros {
  const proteinaG = MINIMO_PROTEINA_G_KG[objetivo] * peso;
  const grasaG = MINIMO_GRASA_G_KG * peso;
  const kcalMinimos =
    proteinaG * KCAL_POR_GRAMO.proteina + grasaG * KCAL_POR_GRAMO.grasa;

  const kcalReservadaCarbos = CARBOS_MINIMOS_G * KCAL_POR_GRAMO.carbohidrato;

  if (kcalMinimos > meta - kcalReservadaCarbos) {
    // Los minimos no entran: reparto proporcional 30/30/40.
    return {
      proteina: Math.round(
        (meta * REPARTO_ALTERNATIVO.proteina) / KCAL_POR_GRAMO.proteina,
      ),
      grasa: Math.round((meta * REPARTO_ALTERNATIVO.grasa) / KCAL_POR_GRAMO.grasa),
      carbohidrato: Math.round(
        (meta * REPARTO_ALTERNATIVO.carbohidrato) / KCAL_POR_GRAMO.carbohidrato,
      ),
      alternativo: true,
      aviso: MENSAJES.repartoAlternativo,
    };
  }

  const carbosG = (meta - kcalMinimos) / KCAL_POR_GRAMO.carbohidrato;
  return {
    proteina: Math.round(proteinaG),
    grasa: Math.round(grasaG),
    carbohidrato: Math.round(carbosG),
    alternativo: false,
    aviso: null,
  };
}

/** Meta de hidratacion diaria en ml, redondeada a los 50 ml mas cercanos. */
export function calcularMetaAgua(peso: number): number {
  return Math.round((peso * ML_AGUA_POR_KG) / 50) * 50;
}

/**
 * Calcula todas las metas del dia a partir del perfil y el objetivo.
 * Los avisos se devuelven en orden: primero el de la tasa, despues el del piso.
 */
export function calcularMetas(
  perfil: Perfil,
  objetivo: Objetivo,
  tasaIngresada: number,
): ResultadoMetas {
  const avisos: string[] = [];

  const tmb = calcularTMB(perfil);
  const get = calcularGET(perfil);

  const { tasa: tasaAplicada, aviso: avisoTasa } = acotarTasa(
    objetivo,
    tasaIngresada,
  );
  if (avisoTasa) avisos.push(avisoTasa);

  const deltaDiario = (tasaAplicada * KCAL_POR_KG) / 7;
  let metaBruta = get;
  if (objetivo === "bajar") metaBruta = get - deltaDiario;
  if (objetivo === "subir") metaBruta = get + deltaDiario;

  const metaSinAcotar = Math.round(metaBruta);
  const piso = PISO_CALORICO[perfil.sexo];

  let meta = metaSinAcotar;
  if (metaSinAcotar < piso) {
    avisos.push(mensajeMetaAcotada(metaSinAcotar, piso));
    meta = piso;
  }

  const macros = calcularMacros(meta, perfil.peso, objetivo);
  // El aviso del reparto alternativo viaja con el resto: va despues del piso
  // calorico, que es el orden en el que se aplican las dos reglas.
  if (macros.aviso) avisos.push(macros.aviso);

  return {
    tmb: Math.round(tmb),
    get: Math.round(get),
    tasaAplicada,
    metaSinAcotar,
    meta,
    piso,
    macros,
    metaAgua: calcularMetaAgua(perfil.peso),
    avisos,
  };
}

// --- Balance del dia ---------------------------------------------------------

/**
 * Estado del dia. Las condiciones se evaluan en orden y la primera que se
 * cumple gana: cuando la meta coincide con el piso calorico, el estado de
 * seguridad prevalece sobre "En rango".
 */
export function estadoDelDia(
  consumido: number,
  meta: number,
  piso: number,
): EstadoDia {
  if (consumido < piso) return "Por debajo del minimo";
  if (Math.abs(consumido - meta) <= meta * TOLERANCIA_EN_RANGO) return "En rango";
  if (consumido > meta * (1 + TOLERANCIA_EN_RANGO)) return "Excedido";
  return "Incompleto";
}

/** Balance neto del dia: consumido menos meta. */
export function balanceDelDia(consumido: number, meta: number): number {
  return Math.round(consumido - meta);
}

// =============================================================================
// V2
// =============================================================================

export type Intensidad = "suave" | "moderada" | "intensa";
export type OrigenAlimento = "catalogo" | "propio";
export type ModoCalculo = "no_suma" | "suma";
export type EstadoPlan = "activo" | "pausado" | "recalculado" | "cumplido";

export const ETIQUETA_INTENSIDAD: Record<Intensidad, string> = {
  suave: "Suave",
  moderada: "Moderada",
  intensa: "Intensa",
};

export const ETIQUETA_ESTADO_PLAN: Record<EstadoPlan, string> = {
  activo: "Activo",
  pausado: "Pausado",
  recalculado: "Recalculado",
  cumplido: "Cumplido",
};

/** Factor por el que se multiplica el gasto segun la intensidad declarada. */
export const FACTOR_INTENSIDAD: Record<Intensidad, number> = {
  suave: 0.85,
  moderada: 1.0,
  intensa: 1.2,
};

export const LIMITES_V2 = {
  duracion: { min: 5, max: 300 },
  nombre: { min: 3, max: 40 },
  porcionTexto: { min: 1, max: 30 },
  kcalAlimento: { min: 0, max: 2000 },
  macroAlimento: { min: 0, max: 300 },
  itemsComida: { min: 1, max: 10 },
} as const;

/** Mililitros extra de hidratacion por cada hora de ejercicio. */
export const ML_AGUA_POR_HORA_EJERCICIO = 350;

/** Tolerancia de coherencia de un alimento propio: 10 %, nunca menos de 20 kcal. */
export const TOLERANCIA_ALIMENTO_RELATIVA = 0.1;
export const TOLERANCIA_ALIMENTO_MINIMA = 20;

/** Reglas del ajuste dinamico del plan. */
export const DIAS_MINIMOS_AJUSTE = 7;
export const DESVIO_TOLERADO_KG = 0.3;
export const LIMITE_CORRECCION = 0.15;

export const MENSAJES_V2 = {
  duracionFueraDeRango: "La duración debe estar entre 5 y 300 minutos.",
  duracionNoEntera: "La duración debe ser un número entero de minutos.",
  ejercicioInvalido: "Elegí un ejercicio del catálogo.",
  intensidadInvalida: "Elegí una intensidad.",
  preferenciaGuardada: "Preferencia de cálculo guardada.",
  camposAlimento: "Todos los campos del alimento son obligatorios.",
  valoresNegativos: "Las calorías y los macronutrientes no pueden ser negativos.",
  nombreAlimentoDuplicado: "Ya tenés un alimento propio con ese nombre.",
  nombreComidaDuplicado: "Ya tenés una comida guardada con ese nombre.",
  nombreLongitud: "El nombre debe tener entre 3 y 40 caracteres.",
  porcionLongitud: "La porción de referencia debe tener entre 1 y 30 caracteres.",
  kcalFueraDeRango: "Las calorías deben estar entre 0 y 2000.",
  macroFueraDeRango: "Cada macronutriente debe estar entre 0 y 300 g.",
  comidaSinItems: "Agregá al menos un alimento a la comida guardada.",
  comidaDemasiadosItems: "Una comida guardada puede tener hasta 10 alimentos.",
  fechaFutura: "La fecha no puede ser posterior a hoy.",
  planEnLinea:
    "El plan viene en línea con lo proyectado. No hizo falta ajustar la meta.",
  planPausado:
    "Tu plan está pausado: la meta no se va a recalcular hasta que lo reanudes.",
} as const;

/** Formato unico de los pesos en pantalla: siempre un decimal. */
export function formatearPeso(peso: number): string {
  return peso.toFixed(1);
}

/** Convierte una fecha ISO (AAAA-MM-DD) al formato DD/MM/AAAA de la interfaz. */
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Dias calendario entre dos fechas ISO. */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function mensajeAlimentoIncoherente(
  kcalMacros: number,
  kcalDeclaradas: number,
  diferencia: number,
  tolerancia: number,
): string {
  return `Los macronutrientes declarados suman ${kcalMacros} kcal y no coinciden con las ${kcalDeclaradas} kcal ingresadas (diferencia de ${diferencia} kcal, tolerancia +/- ${tolerancia} kcal).`;
}

export function mensajePesadaActualizada(fecha: string): string {
  return `Se actualizó la pesada del ${formatearFecha(fecha)}.`;
}

export function mensajeComidaRegistrada(cantidad: number, nombre: string): string {
  return `Se registraron ${cantidad} alimentos de «${nombre}».`;
}

export function mensajePlanRecalculado(
  pesoReal: number,
  pesoProyectado: number,
  metaAnterior: number,
  metaNueva: number,
): string {
  return `Tu peso real (${formatearPeso(pesoReal)} kg) difiere del proyectado (${formatearPeso(pesoProyectado)} kg). Se recalculó la meta de ${metaAnterior} a ${metaNueva} kcal.`;
}

export function mensajeCorreccionAcotada(
  correccion: number,
  aplicada: number,
): string {
  return `La corrección calculada (${correccion} kcal) supera el límite del 15 %. Se ajustó la meta en ${aplicada} kcal.`;
}

export function mensajeObjetivoCumplido(pesoObjetivo: number): string {
  return `¡Objetivo cumplido! Alcanzaste tu peso objetivo de ${formatearPeso(pesoObjetivo)} kg.`;
}

export function mensajePesoObjetivoInvalido(objetivo: "bajar" | "subir"): string {
  return objetivo === "bajar"
    ? "El peso objetivo debe ser menor que tu peso actual para el objetivo de bajar de peso."
    : "El peso objetivo debe ser mayor que tu peso actual para el objetivo de subir de peso.";
}

function redondearA50(ml: number): number {
  return Math.round(ml / 50) * 50;
}

/**
 * Parte el valor del select de alimentos ("origen:id") en sus dos partes.
 * Vive aca, en el modulo puro, para que lo puedan usar tambien los
 * componentes de cliente, que no acceden a la base de datos.
 */
export function partirValorAlimento(valor: string): {
  origen: OrigenAlimento;
  alimentoId: string;
} {
  const [origen, ...resto] = valor.split(":");
  return {
    origen: origen === "propio" ? "propio" : "catalogo",
    alimentoId: resto.join(":"),
  };
}

// --- KL-10: ejercicio --------------------------------------------------------

/** kcal = MET x peso x horas x factor de intensidad. */
export function calcularKcalEjercicio(
  met: number,
  peso: number,
  minutos: number,
  intensidad: Intensidad,
): number {
  return Math.round(met * peso * (minutos / 60) * FACTOR_INTENSIDAD[intensidad]);
}

/** Valida la duracion de un ejercicio. Devuelve errores (vacio si es valida). */
export function validarDuracion(minutos: number): string[] {
  if (!Number.isFinite(minutos)) return [MENSAJES_V2.duracionFueraDeRango];
  if (minutos < LIMITES_V2.duracion.min || minutos > LIMITES_V2.duracion.max) {
    return [MENSAJES_V2.duracionFueraDeRango];
  }
  if (!Number.isInteger(minutos)) return [MENSAJES_V2.duracionNoEntera];
  return [];
}

// --- KL-11: modo de calculo --------------------------------------------------

/**
 * Meta del dia segun el modo activo. En el modo "suma" el gasto del ejercicio
 * se agrega a la meta; en el modo por defecto la meta no se toca y el ejercicio
 * queda solo como informacion.
 */
export function metaDelDia(
  meta: number,
  gastado: number,
  modo: ModoCalculo,
): number {
  return modo === "suma" ? meta + gastado : meta;
}

// --- KL-12: hidratacion ------------------------------------------------------

/** Mililitros extra de la meta de hidratacion por el ejercicio del dia. */
export function extraAguaPorEjercicio(minutos: number): number {
  if (minutos <= 0) return 0;
  return redondearA50((ML_AGUA_POR_HORA_EJERCICIO * minutos) / 60);
}

export function mensajeAguaExtra(extra: number, minutos: number): string {
  return `Incluye ${extra} ml extra por los ${minutos} minutos de ejercicio de hoy.`;
}

// --- KL-13: alimentos propios ------------------------------------------------

export interface AlimentoPropioIngresado {
  nombre: string;
  porcion: string;
  kcal: number;
  proteina: number;
  grasa: number;
  carbohidrato: number;
}

/** Tolerancia admitida entre las kcal declaradas y las que suman los macros. */
export function toleranciaAlimento(kcal: number): number {
  return Math.max(
    Math.round(kcal * TOLERANCIA_ALIMENTO_RELATIVA),
    TOLERANCIA_ALIMENTO_MINIMA,
  );
}

/** kcal que suman los macronutrientes declarados. */
export function kcalDeLosMacros(m: Macros): number {
  return Math.round(
    m.proteina * KCAL_POR_GRAMO.proteina +
      m.carbohidrato * KCAL_POR_GRAMO.carbohidrato +
      m.grasa * KCAL_POR_GRAMO.grasa,
  );
}

/** Valida un alimento propio: campos, rangos y coherencia macros/kcal. */
export function validarAlimentoPropio(a: AlimentoPropioIngresado): string[] {
  const numeros = [a.kcal, a.proteina, a.grasa, a.carbohidrato];

  if (
    !a.nombre.trim() ||
    !a.porcion.trim() ||
    numeros.some((n) => Number.isNaN(n))
  ) {
    return [MENSAJES_V2.camposAlimento];
  }
  if (numeros.some((n) => n < 0)) return [MENSAJES_V2.valoresNegativos];

  const errores: string[] = [];
  const nombre = a.nombre.trim();
  if (
    nombre.length < LIMITES_V2.nombre.min ||
    nombre.length > LIMITES_V2.nombre.max
  ) {
    errores.push(MENSAJES_V2.nombreLongitud);
  }
  if (a.porcion.trim().length > LIMITES_V2.porcionTexto.max) {
    errores.push(MENSAJES_V2.porcionLongitud);
  }
  if (a.kcal > LIMITES_V2.kcalAlimento.max) {
    errores.push(MENSAJES_V2.kcalFueraDeRango);
  }
  if (
    [a.proteina, a.grasa, a.carbohidrato].some(
      (n) => n > LIMITES_V2.macroAlimento.max,
    )
  ) {
    errores.push(MENSAJES_V2.macroFueraDeRango);
  }
  if (errores.length > 0) return errores;

  const kcalMacros = kcalDeLosMacros(a);
  const diferencia = Math.abs(kcalMacros - a.kcal);
  const tolerancia = toleranciaAlimento(a.kcal);
  if (diferencia > tolerancia) {
    return [mensajeAlimentoIncoherente(kcalMacros, a.kcal, diferencia, tolerancia)];
  }

  return [];
}

// --- KL-16: ajuste dinamico del plan -----------------------------------------

export interface ResultadoAjuste {
  /** true si se evaluo el plan: hay referencia y pasaron los dias minimos. */
  evaluado: boolean;
  /** true si el desvio entro dentro de lo tolerado y no hubo que ajustar. */
  enLinea: boolean;
  pesoProyectado: number;
  desvio: number;
  /** Correccion antes de acotarla al limite y al piso. */
  correccion: number;
  /** Correccion efectivamente aplicada sobre la meta. */
  ajusteAplicado: number;
  metaAnterior: number;
  metaNueva: number;
  avisos: string[];
}

/**
 * Evalua el plan contra la pesada de referencia y devuelve la correccion a
 * aplicar sobre la meta vigente, ya acotada al limite del 15 % y al piso.
 */
export function evaluarAjustePlan(params: {
  objetivo: Objetivo;
  tasa: number;
  pesoReferencia: number;
  fechaReferencia: string;
  pesoReal: number;
  fechaPesada: string;
  metaVigente: number;
  piso: number;
}): ResultadoAjuste {
  const {
    objetivo,
    tasa,
    pesoReferencia,
    fechaReferencia,
    pesoReal,
    fechaPesada,
    metaVigente,
    piso,
  } = params;

  const dias = diasEntre(fechaReferencia, fechaPesada);
  const base: ResultadoAjuste = {
    evaluado: false,
    enLinea: false,
    pesoProyectado: pesoReferencia,
    desvio: 0,
    correccion: 0,
    ajusteAplicado: 0,
    metaAnterior: metaVigente,
    metaNueva: metaVigente,
    avisos: [],
  };

  if (dias < DIAS_MINIMOS_AJUSTE) return base;

  const semanas = dias / 7;
  let pesoProyectado = pesoReferencia;
  if (objetivo === "bajar") pesoProyectado = pesoReferencia - tasa * semanas;
  if (objetivo === "subir") pesoProyectado = pesoReferencia + tasa * semanas;

  const desvio = pesoReal - pesoProyectado;

  if (Math.abs(desvio) <= DESVIO_TOLERADO_KG) {
    return {
      ...base,
      evaluado: true,
      enLinea: true,
      pesoProyectado,
      desvio,
      avisos: [MENSAJES_V2.planEnLinea],
    };
  }

  const correccion = Math.round((-desvio * KCAL_POR_KG) / dias);
  const limite = Math.round(metaVigente * LIMITE_CORRECCION);

  let ajusteAplicado = correccion;
  let avisoLimite: string | null = null;
  if (Math.abs(correccion) > limite) {
    ajusteAplicado = correccion > 0 ? limite : -limite;
    avisoLimite = mensajeCorreccionAcotada(correccion, ajusteAplicado);
  }

  let metaNueva = metaVigente + ajusteAplicado;
  let avisoPiso: string | null = null;
  if (metaNueva < piso) {
    avisoPiso = mensajeMetaAcotada(metaNueva, piso);
    metaNueva = piso;
    ajusteAplicado = metaNueva - metaVigente;
  }

  const avisos = [
    mensajePlanRecalculado(pesoReal, pesoProyectado, metaVigente, metaNueva),
  ];
  if (avisoLimite) avisos.push(avisoLimite);
  if (avisoPiso) avisos.push(avisoPiso);

  return {
    evaluado: true,
    enLinea: false,
    pesoProyectado,
    desvio,
    correccion,
    ajusteAplicado,
    metaAnterior: metaVigente,
    metaNueva,
    avisos,
  };
}
