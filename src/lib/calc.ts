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

  return {
    tmb: Math.round(tmb),
    get: Math.round(get),
    tasaAplicada,
    metaSinAcotar,
    meta,
    piso,
    macros: calcularMacros(meta, perfil.peso, objetivo),
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
