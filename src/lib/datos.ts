/**
 * Acceso a datos de Kalo y armado del resumen del dia.
 * La logica de calculo vive en calc.ts y en coach.ts; aca solo se leen y
 * escriben filas, y se arman las estructuras que consumen las pantallas.
 */

import { getDb } from "./db";
import { CATALOGO, buscarAlimento, type Alimento } from "./catalogo";
import { buscarEjercicio } from "./ejercicios";
import { recomendaciones } from "./coach";
import { DIAS_EXPORTADOS, type FilaSemana } from "./exportar";

export type { OrigenAlimento } from "./calc";
import {
  balanceDelDia,
  calcularMacros,
  calcularMetas,
  diasEntre,
  estadoDelDia,
  evaluarAjustePlan,
  extraAguaPorEjercicio,
  mensajeAlimentoEliminado,
  mensajeAlimentoEnUso,
  mensajeObjetivoCumplido,
  mensajePesadaActualizada,
  mensajePesadaEliminada,
  metaDelDia,
  normalizarNombre,
  type EstadoDia,
  type EstadoPlan,
  type Intensidad,
  type ModoCalculo,
  type NivelActividad,
  type Objetivo,
  type OrigenAlimento,
  type Perfil,
  type ResultadoMetas,
  type Sexo,
} from "./calc";

export interface RegistroComida {
  id: number;
  nombre: string;
  porcion: string;
  porciones: number;
  kcal: number;
  proteina: number;
  grasa: number;
  carbohidrato: number;
}

export interface RegistroEjercicio {
  id: number;
  nombre: string;
  minutos: number;
  intensidad: Intensidad;
  kcal: number;
}

export interface AlimentoPropio extends Alimento {
  idNumerico: number;
}

export interface OpcionAlimento {
  /** Valor del select: "catalogo:pollo-pechuga" o "propio:12". */
  valor: string;
  origen: OrigenAlimento;
  alimentoId: string;
  nombre: string;
  porcion: string;
  kcal: number;
  propio: boolean;
}

export interface ItemComidaGuardada {
  origen: OrigenAlimento;
  alimentoId: string;
  porciones: number;
  nombre: string;
  kcal: number;
}

export interface ComidaGuardada {
  id: number;
  nombre: string;
  items: ItemComidaGuardada[];
  kcal: number;
}

export interface Pesada {
  id: number;
  fecha: string;
  peso: number;
  /** Diferencia contra la pesada inmediatamente anterior; null en la primera. */
  variacion: number | null;
}

export interface Plan {
  estado: EstadoPlan;
  ajusteAcumulado: number;
  pesoObjetivo: number | null;
  referenciaFecha: string | null;
  referenciaPeso: number | null;
}

export interface AjustePlan {
  fecha: string;
  pesoReal: number;
  pesoProyectado: number;
  metaAnterior: number;
  metaNueva: number;
  motivo: string;
}

export interface ResumenSemanal {
  variacionTotal: number | null;
  balanceSemanal: number | null;
  adherencia: number | null;
  diasConRegistros: number;
}

export interface ResumenDia {
  fecha: string;
  metas: ResultadoMetas | null;
  registros: RegistroComida[];
  ejercicios: RegistroEjercicio[];
  consumido: number;
  gastado: number;
  minutosEjercicio: number;
  proteina: number;
  grasa: number;
  carbohidrato: number;
  agua: number;
  metaAgua: number;
  extraAgua: number;
  modo: ModoCalculo;
  /** Meta efectiva del dia segun el modo de calculo activo. */
  metaDia: number;
  balance: number;
  estado: EstadoDia | null;
  plan: Plan;
  coach: string[];
}

export function fechaHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Devuelve la fecha ISO que esta n dias antes de la indicada. */
export function fechaMenosDias(fecha: string, dias: number): string {
  const base = Date.parse(`${fecha}T00:00:00Z`) - dias * 86_400_000;
  return new Date(base).toISOString().slice(0, 10);
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

/** Actualiza solo el peso del perfil, como hace una pesada nueva (KL-15). */
export function actualizarPeso(usuarioId: number, peso: number): void {
  getDb()
    .prepare("UPDATE perfiles SET peso = ? WHERE usuario_id = ?")
    .run(peso, usuarioId);
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

// --- Preferencia de calculo (KL-11) ------------------------------------------

export function leerModo(usuarioId: number): ModoCalculo {
  const fila = getDb()
    .prepare("SELECT modo_ejercicio FROM preferencias WHERE usuario_id = ?")
    .get(usuarioId) as { modo_ejercicio: string } | undefined;
  return fila?.modo_ejercicio === "suma" ? "suma" : "no_suma";
}

export function guardarModo(usuarioId: number, modo: ModoCalculo): void {
  getDb()
    .prepare(
      `INSERT INTO preferencias (usuario_id, modo_ejercicio) VALUES (?, ?)
       ON CONFLICT(usuario_id) DO UPDATE SET modo_ejercicio = excluded.modo_ejercicio`,
    )
    .run(usuarioId, modo);
}

// --- Plan (KL-16) ------------------------------------------------------------

const PLAN_INICIAL: Plan = {
  estado: "activo",
  ajusteAcumulado: 0,
  pesoObjetivo: null,
  referenciaFecha: null,
  referenciaPeso: null,
};

export function leerPlan(usuarioId: number): Plan {
  const fila = getDb()
    .prepare(
      `SELECT estado, ajuste_acumulado, peso_objetivo, referencia_fecha, referencia_peso
       FROM planes WHERE usuario_id = ?`,
    )
    .get(usuarioId) as
    | {
        estado: string;
        ajuste_acumulado: number;
        peso_objetivo: number | null;
        referencia_fecha: string | null;
        referencia_peso: number | null;
      }
    | undefined;

  if (!fila) return { ...PLAN_INICIAL };
  return {
    estado: fila.estado as EstadoPlan,
    ajusteAcumulado: fila.ajuste_acumulado,
    pesoObjetivo: fila.peso_objetivo,
    referenciaFecha: fila.referencia_fecha,
    referenciaPeso: fila.referencia_peso,
  };
}

/** Reinicia el plan: pasa a activo, sin ajustes ni pesada de referencia. */
export function reiniciarPlan(usuarioId: number, pesoObjetivo: number | null): void {
  getDb()
    .prepare(
      `INSERT INTO planes (usuario_id, estado, ajuste_acumulado, peso_objetivo,
                           referencia_fecha, referencia_peso)
       VALUES (?, 'activo', 0, ?, NULL, NULL)
       ON CONFLICT(usuario_id) DO UPDATE SET
         estado = 'activo', ajuste_acumulado = 0, peso_objetivo = excluded.peso_objetivo,
         referencia_fecha = NULL, referencia_peso = NULL`,
    )
    .run(usuarioId, pesoObjetivo);
}

export function guardarPlan(usuarioId: number, plan: Plan): void {
  getDb()
    .prepare(
      `INSERT INTO planes (usuario_id, estado, ajuste_acumulado, peso_objetivo,
                           referencia_fecha, referencia_peso)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(usuario_id) DO UPDATE SET
         estado = excluded.estado,
         ajuste_acumulado = excluded.ajuste_acumulado,
         peso_objetivo = excluded.peso_objetivo,
         referencia_fecha = excluded.referencia_fecha,
         referencia_peso = excluded.referencia_peso`,
    )
    .run(
      usuarioId,
      plan.estado,
      plan.ajusteAcumulado,
      plan.pesoObjetivo,
      plan.referenciaFecha,
      plan.referenciaPeso,
    );
}

export function registrarAjuste(usuarioId: number, a: AjustePlan): void {
  getDb()
    .prepare(
      `INSERT INTO ajustes_plan
         (usuario_id, fecha, peso_real, peso_proyectado, meta_anterior, meta_nueva, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      usuarioId,
      a.fecha,
      a.pesoReal,
      a.pesoProyectado,
      a.metaAnterior,
      a.metaNueva,
      a.motivo,
    );
}

export function listarAjustes(usuarioId: number): AjustePlan[] {
  const filas = getDb()
    .prepare(
      `SELECT fecha, peso_real, peso_proyectado, meta_anterior, meta_nueva, motivo
       FROM ajustes_plan WHERE usuario_id = ? ORDER BY id DESC`,
    )
    .all(usuarioId) as {
    fecha: string;
    peso_real: number;
    peso_proyectado: number;
    meta_anterior: number;
    meta_nueva: number;
    motivo: string;
  }[];

  return filas.map((f) => ({
    fecha: f.fecha,
    pesoReal: f.peso_real,
    pesoProyectado: f.peso_proyectado,
    metaAnterior: f.meta_anterior,
    metaNueva: f.meta_nueva,
    motivo: f.motivo,
  }));
}

/**
 * Metas vigentes: las del perfil y el objetivo, mas el ajuste acumulado del
 * plan. El ajuste nunca puede dejar la meta por debajo del piso de seguridad.
 */
export function metasVigentes(
  perfil: Perfil,
  objetivo: ObjetivoGuardado,
  ajusteAcumulado: number,
): ResultadoMetas {
  const base = calcularMetas(perfil, objetivo.tipo, objetivo.tasa);
  if (ajusteAcumulado === 0) return base;

  const meta = Math.max(base.piso, base.meta + ajusteAcumulado);
  return {
    ...base,
    meta,
    macros: calcularMacros(meta, perfil.peso, objetivo.tipo),
  };
}

// --- Alimentos propios (KL-13) -----------------------------------------------

export function listarAlimentosPropios(usuarioId: number): AlimentoPropio[] {
  const filas = getDb()
    .prepare(
      `SELECT id, nombre, porcion, kcal, proteina, grasa, carbohidrato
       FROM alimentos_propios WHERE usuario_id = ? ORDER BY nombre`,
    )
    .all(usuarioId) as {
    id: number;
    nombre: string;
    porcion: string;
    kcal: number;
    proteina: number;
    grasa: number;
    carbohidrato: number;
  }[];

  return filas.map((f) => ({
    id: String(f.id),
    idNumerico: f.id,
    nombre: f.nombre,
    porcion: f.porcion,
    kcal: f.kcal,
    proteina: f.proteina,
    grasa: f.grasa,
    carbohidrato: f.carbohidrato,
  }));
}

/**
 * V3 (DF-04): la comparacion ignora mayusculas, tildes y espacios de mas, que
 * es como la hace una persona. "TARTA DE JAMON" y "Tarta de jamón" son el
 * mismo nombre.
 */
export function existeAlimentoPropio(usuarioId: number, nombre: string): boolean {
  const buscado = normalizarNombre(nombre);
  return listarAlimentosPropios(usuarioId).some(
    (a) => normalizarNombre(a.nombre) === buscado,
  );
}

export function crearAlimentoPropio(
  usuarioId: number,
  a: Omit<AlimentoPropio, "id" | "idNumerico">,
): void {
  getDb()
    .prepare(
      `INSERT INTO alimentos_propios
         (usuario_id, nombre, porcion, kcal, proteina, grasa, carbohidrato)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      usuarioId,
      a.nombre.trim(),
      a.porcion.trim(),
      a.kcal,
      a.proteina,
      a.grasa,
      a.carbohidrato,
    );
}

/** Comidas guardadas que usan un alimento propio (KL-21). */
export function comidasQueUsan(usuarioId: number, id: number): string[] {
  return listarComidasGuardadas(usuarioId)
    .filter((c) =>
      c.items.some((i) => i.origen === "propio" && i.alimentoId === String(id)),
    )
    .map((c) => c.nombre);
}

/**
 * V3 (KL-21, corrige DF-05): un alimento propio que forma parte de una comida
 * guardada no se puede eliminar. Antes se borraba y la comida quedaba con un
 * item roto.
 */
export function eliminarAlimentoPropio(
  usuarioId: number,
  id: number,
): { eliminado: boolean; mensaje: string } {
  const alimento = listarAlimentosPropios(usuarioId).find(
    (a) => a.idNumerico === id,
  );
  if (!alimento) return { eliminado: false, mensaje: "" };

  const enUso = comidasQueUsan(usuarioId, id);
  if (enUso.length > 0) {
    return { eliminado: false, mensaje: mensajeAlimentoEnUso(alimento.nombre, enUso) };
  }

  getDb()
    .prepare("DELETE FROM alimentos_propios WHERE id = ? AND usuario_id = ?")
    .run(id, usuarioId);

  return { eliminado: true, mensaje: mensajeAlimentoEliminado(alimento.nombre) };
}

function buscarAlimentoPropio(
  usuarioId: number,
  id: string,
): AlimentoPropio | undefined {
  return listarAlimentosPropios(usuarioId).find((a) => a.id === id);
}

/** Resuelve un alimento del catalogo o uno propio del usuario. */
export function resolverAlimento(
  usuarioId: number,
  origen: OrigenAlimento,
  alimentoId: string,
): Alimento | undefined {
  return origen === "propio"
    ? buscarAlimentoPropio(usuarioId, alimentoId)
    : buscarAlimento(alimentoId);
}

/** Opciones del select de comidas: primero el catalogo, despues los propios. */
export function opcionesAlimentos(usuarioId: number): OpcionAlimento[] {
  const delCatalogo: OpcionAlimento[] = CATALOGO.map((a) => ({
    valor: `catalogo:${a.id}`,
    origen: "catalogo",
    alimentoId: a.id,
    nombre: a.nombre,
    porcion: a.porcion,
    kcal: a.kcal,
    propio: false,
  }));

  const propios: OpcionAlimento[] = listarAlimentosPropios(usuarioId).map((a) => ({
    valor: `propio:${a.id}`,
    origen: "propio",
    alimentoId: a.id,
    nombre: a.nombre,
    porcion: a.porcion,
    kcal: a.kcal,
    propio: true,
  }));

  return [...delCatalogo, ...propios];
}

// --- Comidas guardadas (KL-14) -----------------------------------------------

export function listarComidasGuardadas(usuarioId: number): ComidaGuardada[] {
  const comidas = getDb()
    .prepare(
      "SELECT id, nombre FROM comidas_guardadas WHERE usuario_id = ? ORDER BY nombre",
    )
    .all(usuarioId) as { id: number; nombre: string }[];

  return comidas.map((c) => {
    const filas = getDb()
      .prepare(
        `SELECT origen, alimento_id, porciones FROM comidas_guardadas_items
         WHERE comida_id = ? ORDER BY id`,
      )
      .all(c.id) as {
      origen: string;
      alimento_id: string;
      porciones: number;
    }[];

    const items: ItemComidaGuardada[] = [];
    for (const f of filas) {
      const origen = f.origen === "propio" ? "propio" : "catalogo";
      const alimento = resolverAlimento(usuarioId, origen, f.alimento_id);
      items.push({
        origen,
        alimentoId: f.alimento_id,
        porciones: f.porciones,
        nombre: alimento?.nombre ?? "(alimento eliminado)",
        kcal: Math.round((alimento?.kcal ?? 0) * f.porciones),
      });
    }

    return {
      id: c.id,
      nombre: c.nombre,
      items,
      kcal: items.reduce((total, i) => total + i.kcal, 0),
    };
  });
}

/** V3 (DF-04): misma normalizacion que los alimentos propios. */
export function existeComidaGuardada(usuarioId: number, nombre: string): boolean {
  const buscado = normalizarNombre(nombre);
  return listarComidasGuardadas(usuarioId).some(
    (c) => normalizarNombre(c.nombre) === buscado,
  );
}

export function crearComidaGuardada(
  usuarioId: number,
  nombre: string,
  items: { origen: OrigenAlimento; alimentoId: string; porciones: number }[],
): void {
  const db = getDb();
  const resultado = db
    .prepare("INSERT INTO comidas_guardadas (usuario_id, nombre) VALUES (?, ?)")
    .run(usuarioId, nombre.trim());

  const comidaId = Number(resultado.lastInsertRowid);
  for (const item of items) {
    db.prepare(
      `INSERT INTO comidas_guardadas_items (comida_id, origen, alimento_id, porciones)
       VALUES (?, ?, ?, ?)`,
    ).run(comidaId, item.origen, item.alimentoId, item.porciones);
  }
}

export function eliminarComidaGuardada(usuarioId: number, id: number): void {
  const db = getDb();
  const fila = db
    .prepare("SELECT id FROM comidas_guardadas WHERE id = ? AND usuario_id = ?")
    .get(id, usuarioId);
  if (!fila) return;
  db.prepare("DELETE FROM comidas_guardadas_items WHERE comida_id = ?").run(id);
  db.prepare("DELETE FROM comidas_guardadas WHERE id = ?").run(id);
}

// --- Registros del dia -------------------------------------------------------

/**
 * Agrega una comida al dia. Se guarda una copia de los valores del alimento:
 * asi, borrar un alimento propio no altera lo que ya estaba registrado
 * (criterio 12 de KL-13).
 */
export function agregarComida(
  usuarioId: number,
  fecha: string,
  origen: OrigenAlimento,
  alimentoId: string,
  porciones: number,
): boolean {
  const alimento = resolverAlimento(usuarioId, origen, alimentoId);
  if (!alimento) return false;

  getDb()
    .prepare(
      `INSERT INTO registros_comida
         (usuario_id, fecha, alimento_id, porciones, origen, nombre, porcion,
          kcal, proteina, grasa, carbohidrato)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      usuarioId,
      fecha,
      alimentoId,
      porciones,
      origen,
      alimento.nombre,
      alimento.porcion,
      alimento.kcal,
      alimento.proteina,
      alimento.grasa,
      alimento.carbohidrato,
    );
  return true;
}

/** Registra de una sola vez todos los items de una comida guardada. */
export function registrarComidaGuardada(
  usuarioId: number,
  fecha: string,
  comidaId: number,
): { nombre: string; cantidad: number } | null {
  const comida = listarComidasGuardadas(usuarioId).find((c) => c.id === comidaId);
  if (!comida) return null;

  let cantidad = 0;
  for (const item of comida.items) {
    if (agregarComida(usuarioId, fecha, item.origen, item.alimentoId, item.porciones)) {
      cantidad += 1;
    }
  }
  return { nombre: comida.nombre, cantidad };
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

export function agregarEjercicio(
  usuarioId: number,
  fecha: string,
  ejercicioId: string,
  minutos: number,
  intensidad: Intensidad,
  kcal: number,
): void {
  getDb()
    .prepare(
      `INSERT INTO registros_ejercicio
         (usuario_id, fecha, ejercicio_id, minutos, intensidad, kcal)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(usuarioId, fecha, ejercicioId, minutos, intensidad, kcal);
}

export function eliminarEjercicio(usuarioId: number, registroId: number): void {
  getDb()
    .prepare("DELETE FROM registros_ejercicio WHERE id = ? AND usuario_id = ?")
    .run(registroId, usuarioId);
}

function leerComidas(usuarioId: number, fecha: string): RegistroComida[] {
  const filas = getDb()
    .prepare(
      `SELECT id, alimento_id, porciones, origen, nombre, porcion,
              kcal, proteina, grasa, carbohidrato
       FROM registros_comida
       WHERE usuario_id = ? AND fecha = ? ORDER BY id`,
    )
    .all(usuarioId, fecha) as {
    id: number;
    alimento_id: string;
    porciones: number;
    origen: string | null;
    nombre: string | null;
    porcion: string | null;
    kcal: number | null;
    proteina: number | null;
    grasa: number | null;
    carbohidrato: number | null;
  }[];

  const registros: RegistroComida[] = [];
  for (const f of filas) {
    // Los registros de la V1 no tienen copia de los valores: se resuelven
    // contra el catalogo, como antes.
    const base =
      f.nombre !== null
        ? {
            nombre: f.nombre,
            porcion: f.porcion ?? "",
            kcal: f.kcal ?? 0,
            proteina: f.proteina ?? 0,
            grasa: f.grasa ?? 0,
            carbohidrato: f.carbohidrato ?? 0,
          }
        : buscarAlimento(f.alimento_id);

    if (!base) continue;
    registros.push({
      id: f.id,
      nombre: base.nombre,
      porcion: base.porcion,
      porciones: f.porciones,
      kcal: base.kcal * f.porciones,
      proteina: base.proteina * f.porciones,
      grasa: base.grasa * f.porciones,
      carbohidrato: base.carbohidrato * f.porciones,
    });
  }
  return registros;
}

function leerEjercicios(usuarioId: number, fecha: string): RegistroEjercicio[] {
  const filas = getDb()
    .prepare(
      `SELECT id, ejercicio_id, minutos, intensidad, kcal FROM registros_ejercicio
       WHERE usuario_id = ? AND fecha = ? ORDER BY id`,
    )
    .all(usuarioId, fecha) as {
    id: number;
    ejercicio_id: string;
    minutos: number;
    intensidad: string;
    kcal: number;
  }[];

  return filas.map((f) => ({
    id: f.id,
    nombre: buscarEjercicio(f.ejercicio_id)?.nombre ?? f.ejercicio_id,
    minutos: f.minutos,
    intensidad: f.intensidad as Intensidad,
    kcal: f.kcal,
  }));
}

function leerAgua(usuarioId: number, fecha: string): number {
  const fila = getDb()
    .prepare(
      "SELECT COALESCE(SUM(ml), 0) AS total FROM registros_agua WHERE usuario_id = ? AND fecha = ?",
    )
    .get(usuarioId, fecha) as { total: number };
  return fila.total;
}

/** Dias seguidos, contando el de hoy, sin ningun ejercicio registrado. */
function diasSinEjercicio(usuarioId: number, fecha: string): number {
  let dias = 0;
  // Mas de 30 dias no aporta nada: la regla del Coach mira los ultimos 3.
  for (let i = 0; i < 30; i += 1) {
    const fila = getDb()
      .prepare(
        "SELECT COUNT(*) AS cantidad FROM registros_ejercicio WHERE usuario_id = ? AND fecha = ?",
      )
      .get(usuarioId, fechaMenosDias(fecha, i)) as { cantidad: number };
    if (fila.cantidad > 0) break;
    dias += 1;
  }
  return dias;
}

// --- Pesadas e historial (KL-15) ---------------------------------------------

export function listarPesadas(usuarioId: number): Pesada[] {
  const filas = getDb()
    .prepare(
      "SELECT id, fecha, peso FROM pesadas WHERE usuario_id = ? ORDER BY fecha",
    )
    .all(usuarioId) as { id: number; fecha: string; peso: number }[];

  return filas.map((f, indice) => ({
    id: f.id,
    fecha: f.fecha,
    peso: f.peso,
    variacion:
      indice === 0
        ? null
        : Math.round((f.peso - filas[indice - 1].peso) * 10) / 10,
  }));
}

export function guardarPesada(
  usuarioId: number,
  fecha: string,
  peso: number,
): { actualizada: boolean } {
  const existente = getDb()
    .prepare("SELECT id FROM pesadas WHERE usuario_id = ? AND fecha = ?")
    .get(usuarioId, fecha);

  getDb()
    .prepare(
      `INSERT INTO pesadas (usuario_id, fecha, peso) VALUES (?, ?, ?)
       ON CONFLICT(usuario_id, fecha) DO UPDATE SET peso = excluded.peso`,
    )
    .run(usuarioId, fecha, peso);

  return { actualizada: Boolean(existente) };
}

/**
 * V3 (KL-21, corrige DF-06): al eliminar la pesada que el plan usa como
 * referencia, el plan toma la mas antigua que queda, o se queda sin referencia.
 */
export function eliminarPesada(usuarioId: number, id: number): string {
  const pesada = listarPesadas(usuarioId).find((p) => p.id === id);
  if (!pesada) return "";

  getDb()
    .prepare("DELETE FROM pesadas WHERE id = ? AND usuario_id = ?")
    .run(id, usuarioId);

  const plan = leerPlan(usuarioId);
  const eraReferencia = plan.referenciaFecha === pesada.fecha;
  if (!eraReferencia) return mensajePesadaEliminada(pesada.fecha);

  const quedan = listarPesadas(usuarioId);
  const nueva = quedan[0] ?? null;

  guardarPlan(usuarioId, {
    ...plan,
    referenciaFecha: nueva ? nueva.fecha : null,
    referenciaPeso: nueva ? nueva.peso : null,
  });

  return mensajePesadaEliminada(pesada.fecha, nueva ? nueva.fecha : null);
}

/** Numeros de la semana que usan el resumen, el Coach y la exportacion. */
export interface MetricasSemana {
  balance: number;
  diasConRegistros: number;
  diasEnRango: number;
  /** Dias seguidos terminando hoy con estado En rango (KL-20, regla 10). */
  rachaEnRango: number;
}

/**
 * Recorre los ultimos 7 dias una sola vez y arma las filas del dia a dia y las
 * metricas de la semana. Lo usan resumenSemanal, el Coach (KL-20) y la
 * exportacion (KL-19). El balance usa la meta vigente de hoy para todos los
 * dias, porque la aplicacion no guarda historico de metas.
 */
function recorrerSemana(
  usuarioId: number,
  fecha: string,
): { filas: FilaSemana[]; metricas: MetricasSemana } {
  const perfil = leerPerfil(usuarioId);
  const objetivo = leerObjetivo(usuarioId);
  const plan = leerPlan(usuarioId);
  const modo = leerModo(usuarioId);
  const metas =
    perfil && objetivo ? metasVigentes(perfil, objetivo, plan.ajusteAcumulado) : null;

  const filas: FilaSemana[] = [];
  const metricas: MetricasSemana = {
    balance: 0,
    diasConRegistros: 0,
    diasEnRango: 0,
    rachaEnRango: 0,
  };
  let rachaCortada = false;

  // i = 0 es hoy. Se recorre hacia atras y despues se da vuelta, para que el
  // archivo exportado quede del dia mas viejo al mas nuevo (KL-19, criterio 4).
  for (let i = 0; i < DIAS_EXPORTADOS; i += 1) {
    const dia = fechaMenosDias(fecha, i);
    const registros = leerComidas(usuarioId, dia);
    const ejercicios = leerEjercicios(usuarioId, dia);
    const gastado = ejercicios.reduce((t, e) => t + e.kcal, 0);
    const agua = leerAgua(usuarioId, dia);
    const consumido = Math.round(registros.reduce((t, r) => t + r.kcal, 0));
    const metaDiaCalculada = metas ? metaDelDia(metas.meta, gastado, modo) : 0;
    const hayRegistros = registros.length > 0;
    // KL-19, criterio 6: un dia sin nada cargado va todo en cero.
    const diaVacio = !hayRegistros && ejercicios.length === 0 && agua === 0;
    const estado =
      metas && !diaVacio
        ? estadoDelDia(consumido, metaDiaCalculada, metas.piso)
        : null;

    filas.push({
      fecha: dia,
      consumido,
      gastado,
      metaDia: diaVacio ? 0 : metaDiaCalculada,
      balance: diaVacio ? 0 : consumido - metaDiaCalculada,
      estado,
      agua,
      proteina: registros.reduce((t, r) => t + r.proteina, 0),
      grasa: registros.reduce((t, r) => t + r.grasa, 0),
      carbohidrato: registros.reduce((t, r) => t + r.carbohidrato, 0),
    });

    if (hayRegistros && metas) {
      metricas.diasConRegistros += 1;
      metricas.balance += consumido - metaDiaCalculada;
      if (estado === "En rango") {
        metricas.diasEnRango += 1;
        if (!rachaCortada) metricas.rachaEnRango += 1;
      } else {
        rachaCortada = true;
      }
    } else {
      rachaCortada = true;
    }
  }

  filas.reverse();
  return { filas, metricas };
}

/** Filas del resumen semanal listas para exportar a CSV (KL-19). */
export function filasDeLaSemana(usuarioId: number, fecha: string): FilaSemana[] {
  return recorrerSemana(usuarioId, fecha).filas;
}

/**
 * Variacion de peso entre las dos ultimas pesadas (KL-20, regla 4).
 * null cuando todavia no hay dos pesadas.
 */
export function tendenciaPeso(usuarioId: number): number | null {
  const pesadas = listarPesadas(usuarioId);
  if (pesadas.length < 2) return null;
  const ultima = pesadas[pesadas.length - 1];
  const anterior = pesadas[pesadas.length - 2];
  return Math.round((ultima.peso - anterior.peso) * 10) / 10;
}

/**
 * Resumen semanal: variacion de peso, balance de los ultimos 7 dias con
 * registros y adherencia.
 */
export function resumenSemanal(usuarioId: number, fecha: string): ResumenSemanal {
  const pesadas = listarPesadas(usuarioId);
  const variacionTotal =
    pesadas.length >= 2
      ? Math.round((pesadas[pesadas.length - 1].peso - pesadas[0].peso) * 10) / 10
      : null;

  const { diasConRegistros, diasEnRango, balance } = recorrerSemana(
    usuarioId,
    fecha,
  ).metricas;

  return {
    variacionTotal,
    balanceSemanal: diasConRegistros > 0 ? Math.round(balance) : null,
    adherencia:
      diasConRegistros > 0
        ? Math.round((diasEnRango / diasConRegistros) * 100)
        : null,
    diasConRegistros,
  };
}

/**
 * Registra una pesada y, si corresponde, evalua el plan (KL-15 y KL-16).
 * Devuelve los avisos a mostrar, en el orden en que se aplican las reglas.
 */
export function registrarPesada(
  usuarioId: number,
  fecha: string,
  peso: number,
): string[] {
  const pesadasPrevias = listarPesadas(usuarioId);
  const fechaMasReciente = pesadasPrevias.at(-1)?.fecha ?? null;

  const { actualizada } = guardarPesada(usuarioId, fecha, peso);

  const avisos: string[] = [];
  if (actualizada) avisos.push(mensajePesadaActualizada(fecha));

  // Solo la pesada mas reciente del historial actualiza el peso del perfil.
  if (!fechaMasReciente || fecha >= fechaMasReciente) {
    actualizarPeso(usuarioId, peso);
  }

  avisos.push(...evaluarPlanConPesada(usuarioId, fecha, peso));
  return avisos;
}

/**
 * Evalua el plan despues de registrar una pesada. El peso del perfil ya fue
 * actualizado, asi que la meta vigente se recalcula antes de medir la
 * correccion (criterio 16 de KL-16).
 */
function evaluarPlanConPesada(
  usuarioId: number,
  fecha: string,
  peso: number,
): string[] {
  const perfil = leerPerfil(usuarioId);
  const objetivo = leerObjetivo(usuarioId);
  const plan = leerPlan(usuarioId);
  if (!perfil || !objetivo) return [];

  // Primera pesada del plan: queda como referencia y no dispara evaluacion.
  if (!plan.referenciaFecha || plan.referenciaPeso === null) {
    guardarPlan(usuarioId, {
      ...plan,
      referenciaFecha: fecha,
      referenciaPeso: peso,
    });
    return [];
  }

  if (plan.estado === "pausado" || plan.estado === "cumplido") return [];

  // Objetivo cumplido: se evalua antes que el ajuste y cierra el plan.
  if (plan.pesoObjetivo !== null && objetivo.tipo !== "mantener") {
    const alcanzado =
      objetivo.tipo === "bajar"
        ? peso <= plan.pesoObjetivo
        : peso >= plan.pesoObjetivo;
    if (alcanzado) {
      guardarPlan(usuarioId, { ...plan, estado: "cumplido" });
      return [mensajeObjetivoCumplido(plan.pesoObjetivo)];
    }
  }

  const metas = metasVigentes(perfil, objetivo, plan.ajusteAcumulado);
  const resultado = evaluarAjustePlan({
    objetivo: objetivo.tipo,
    tasa: objetivo.tasa,
    pesoReferencia: plan.referenciaPeso,
    fechaReferencia: plan.referenciaFecha,
    pesoReal: peso,
    fechaPesada: fecha,
    metaVigente: metas.meta,
    piso: metas.piso,
  });

  if (!resultado.evaluado) return [];

  // V3 (DF-07): la referencia era demasiado vieja. El plan no recalcula nada:
  // toma esta pesada como nueva referencia y avisa.
  if (resultado.referenciaVencida) {
    guardarPlan(usuarioId, {
      ...plan,
      referenciaFecha: fecha,
      referenciaPeso: peso,
    });
    return resultado.avisos;
  }

  if (resultado.enLinea) return resultado.avisos;

  guardarPlan(usuarioId, {
    ...plan,
    estado: "recalculado",
    ajusteAcumulado: plan.ajusteAcumulado + resultado.ajusteAplicado,
    referenciaFecha: fecha,
    referenciaPeso: peso,
  });

  registrarAjuste(usuarioId, {
    fecha,
    pesoReal: peso,
    pesoProyectado: Math.round(resultado.pesoProyectado * 10) / 10,
    metaAnterior: resultado.metaAnterior,
    metaNueva: resultado.metaNueva,
    motivo:
      resultado.desvio > 0
        ? "El peso real quedó por encima del proyectado"
        : "El peso real quedó por debajo del proyectado",
  });

  return resultado.avisos;
}

/** Dias transcurridos entre la pesada de referencia del plan y una fecha. */
export function diasDesdeReferencia(plan: Plan, fecha: string): number | null {
  if (!plan.referenciaFecha) return null;
  return diasEntre(plan.referenciaFecha, fecha);
}

// --- Resumen del dia ---------------------------------------------------------

/** Arma el resumen completo del dia: metas, registros, totales, balance y estado. */
export function resumenDelDia(usuarioId: number, fecha: string): ResumenDia {
  const perfil = leerPerfil(usuarioId);
  const objetivo = leerObjetivo(usuarioId);
  const plan = leerPlan(usuarioId);
  const modo = leerModo(usuarioId);

  const registros = leerComidas(usuarioId, fecha);
  const ejercicios = leerEjercicios(usuarioId, fecha);

  const consumido = Math.round(registros.reduce((total, r) => total + r.kcal, 0));
  const proteina = Math.round(registros.reduce((t, r) => t + r.proteina, 0));
  const grasa = Math.round(registros.reduce((t, r) => t + r.grasa, 0));
  const carbohidrato = Math.round(
    registros.reduce((t, r) => t + r.carbohidrato, 0),
  );

  const gastado = ejercicios.reduce((t, e) => t + e.kcal, 0);
  const minutosEjercicio = ejercicios.reduce((t, e) => t + e.minutos, 0);

  const metas =
    perfil && objetivo
      ? metasVigentes(perfil, objetivo, plan.ajusteAcumulado)
      : null;

  const semana = recorrerSemana(usuarioId, fecha).metricas;
  const extraAgua = extraAguaPorEjercicio(minutosEjercicio);
  const metaAgua = metas ? metas.metaAgua + extraAgua : 0;
  const metaDiaCalculada = metas ? metaDelDia(metas.meta, gastado, modo) : 0;
  const agua = leerAgua(usuarioId, fecha);

  return {
    fecha,
    metas,
    registros,
    ejercicios,
    consumido,
    gastado,
    minutosEjercicio,
    proteina,
    grasa,
    carbohidrato,
    agua,
    metaAgua,
    extraAgua,
    modo,
    metaDia: metaDiaCalculada,
    balance: metas ? balanceDelDia(consumido, metaDiaCalculada) : 0,
    estado: metas
      ? estadoDelDia(consumido, metaDiaCalculada, metas.piso)
      : null,
    plan,
    coach: recomendaciones({
      conPlan: Boolean(metas),
      consumido,
      metaDia: metaDiaCalculada,
      piso: metas?.piso ?? 0,
      estado: metas ? estadoDelDia(consumido, metaDiaCalculada, metas.piso) : null,
      proteina,
      metaProteina: metas?.macros.proteina ?? 0,
      agua,
      metaAgua,
      diasSinEjercicio: diasSinEjercicio(usuarioId, fecha),
      // V3 (KL-20): el Coach mira tambien la semana y el historial de peso.
      minutosEjercicio,
      objetivo: objetivo?.tipo ?? null,
      tendenciaPeso: tendenciaPeso(usuarioId),
      diasConRegistros: semana.diasConRegistros,
      diasEnRango: semana.diasEnRango,
      rachaEnRango: semana.rachaEnRango,
    }),
  };
}
