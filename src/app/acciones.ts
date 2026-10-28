"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  cerrarSesion,
  emailValido,
  hashPassword,
  iniciarSesion,
  usuarioActualId,
  verificarPassword,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  agregarAgua,
  agregarComida,
  agregarEjercicio,
  crearAlimentoPropio,
  crearComidaGuardada,
  eliminarAlimentoPropio,
  eliminarComida,
  eliminarComidaGuardada,
  eliminarEjercicio,
  eliminarPesada,
  existeAlimentoPropio,
  existeComidaGuardada,
  fechaHoy,
  guardarModo,
  guardarObjetivo,
  guardarPerfil,
  guardarPlan,
  registrarPesada,
  leerModo,
  leerObjetivo,
  leerPerfil,
  leerPlan,
  registrarComidaGuardada,
  reiniciarPlan,
  type OrigenAlimento,
} from "@/lib/datos";
import {
  LIMITES,
  LIMITES_V2,
  MENSAJES,
  MENSAJES_V2,
  acotarTasa,
  calcularKcalEjercicio,
  calcularMetas,
  mensajeComidaRegistrada,
  mensajePesoObjetivoInvalido,
  partirValorAlimento,
  validarAlimentoPropio,
  validarDuracion,
  validarPerfil,
  validarTasa,
  type Intensidad,
  type ModoCalculo,
  type NivelActividad,
  type Objetivo,
  type Sexo,
} from "@/lib/calc";
import { buscarEjercicio } from "@/lib/ejercicios";

export interface EstadoFormulario {
  errores: string[];
  avisos: string[];
  ok: boolean;
  /** Confirmacion con texto propio, cuando el mensaje no es el generico. */
  mensaje?: string | null;
  /**
   * Lo que quedo efectivamente guardado. Los formularios muestran esto y no
   * los datos de la pantalla: despues de guardar puede llegar un render con
   * los datos anteriores, y eso pisaba lo que el usuario acababa de elegir
   * (DF-03).
   */
  guardado?: Record<string, string> | null;
}

function conErrores(...errores: string[]): EstadoFormulario {
  return { errores, avisos: [], ok: false };
}

function conExito(
  mensaje?: string,
  avisos: string[] = [],
  guardado?: Record<string, string>,
): EstadoFormulario {
  return {
    errores: [],
    avisos,
    ok: true,
    mensaje: mensaje ?? null,
    guardado: guardado ?? null,
  };
}

/** Convierte un campo de formulario a numero. Devuelve NaN si esta vacio. */
function aNumero(valor: FormDataEntryValue | null): number {
  const texto = String(valor ?? "").trim();
  if (texto === "") return NaN;
  return Number(texto.replace(",", "."));
}

function aTexto(valor: FormDataEntryValue | null): string {
  return String(valor ?? "").trim();
}

function revalidarTodo(): void {
  revalidatePath("/hoy");
  revalidatePath("/perfil");
  revalidatePath("/alimentos");
  revalidatePath("/progreso");
}

// --- KL-1: registro, login y logout ------------------------------------------

export async function registrarUsuario(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "").trim().toLowerCase();
  const password = String(datos.get("password") ?? "");
  const confirmacion = String(datos.get("confirmacion") ?? "");

  if (!email || !password || !confirmacion) {
    return conErrores("Completá todos los campos.");
  }
  if (!emailValido(email)) return conErrores(MENSAJES.emailInvalido);
  if (password.length < 8) return conErrores(MENSAJES.passwordCorta);
  if (password !== confirmacion) return conErrores(MENSAJES.passwordsNoCoinciden);

  const db = getDb();
  const existente = db
    .prepare("SELECT id FROM usuarios WHERE email = ?")
    .get(email);
  if (existente) return conErrores(MENSAJES.emailDuplicado);

  const resultado = db
    .prepare("INSERT INTO usuarios (email, password_hash) VALUES (?, ?)")
    .run(email, hashPassword(password));

  await iniciarSesion(Number(resultado.lastInsertRowid));
  redirect("/perfil");
}

export async function loginUsuario(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "").trim().toLowerCase();
  const password = String(datos.get("password") ?? "");

  if (!email || !password) return conErrores(MENSAJES.credencialesInvalidas);

  const fila = getDb()
    .prepare("SELECT id, password_hash FROM usuarios WHERE email = ?")
    .get(email) as { id: number; password_hash: string } | undefined;

  if (!fila || !verificarPassword(password, fila.password_hash)) {
    return conErrores(MENSAJES.credencialesInvalidas);
  }

  await iniciarSesion(fila.id);
  redirect("/hoy");
}

export async function logout(): Promise<void> {
  await cerrarSesion();
  redirect("/login");
}

// --- KL-2: perfil ------------------------------------------------------------

export async function guardarPerfilAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const perfil = {
    edad: aNumero(datos.get("edad")),
    sexo: String(datos.get("sexo") ?? "") as Sexo,
    peso: aNumero(datos.get("peso")),
    altura: aNumero(datos.get("altura")),
    actividad: String(datos.get("actividad") ?? "") as NivelActividad,
  };

  const errores = validarPerfil(perfil);
  if (errores.length > 0) return { errores, avisos: [], ok: false };

  guardarPerfil(usuarioId, perfil);
  revalidarTodo();
  return conExito(undefined, [], {
    sexo: perfil.sexo,
    actividad: perfil.actividad,
  });
}

// --- KL-3 y KL-16: objetivo y plan -------------------------------------------

export async function guardarObjetivoAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const perfil = leerPerfil(usuarioId);
  if (!perfil) return conErrores(MENSAJES.sinPerfil);

  const tipo = String(datos.get("tipo") ?? "") as Objetivo;
  if (tipo !== "bajar" && tipo !== "mantener" && tipo !== "subir") {
    return conErrores("Elegí un objetivo válido.");
  }

  const tasaIngresada = tipo === "mantener" ? 0 : aNumero(datos.get("tasa"));

  const erroresTasa = validarTasa(tipo, tasaIngresada);
  if (erroresTasa.length > 0) return { errores: erroresTasa, avisos: [], ok: false };

  // Peso objetivo: opcional, y solo para los objetivos de bajar y subir.
  const pesoObjetivoIngresado = aNumero(datos.get("pesoObjetivo"));
  let pesoObjetivo: number | null = null;
  if (tipo !== "mantener" && !Number.isNaN(pesoObjetivoIngresado)) {
    if (
      pesoObjetivoIngresado < LIMITES.peso.min ||
      pesoObjetivoIngresado > LIMITES.peso.max
    ) {
      return conErrores(MENSAJES.pesoFueraDeRango);
    }
    if (tipo === "bajar" && pesoObjetivoIngresado >= perfil.peso) {
      return conErrores(mensajePesoObjetivoInvalido("bajar"));
    }
    if (tipo === "subir" && pesoObjetivoIngresado <= perfil.peso) {
      return conErrores(mensajePesoObjetivoInvalido("subir"));
    }
    pesoObjetivo = pesoObjetivoIngresado;
  }

  const { tasa: tasaAplicada } = acotarTasa(tipo, tasaIngresada);
  guardarObjetivo(usuarioId, tipo, tasaAplicada);
  // Un objetivo nuevo reinicia el plan: sin ajustes ni pesada de referencia.
  reiniciarPlan(usuarioId, pesoObjetivo);

  // Los avisos salen del motor, en orden: primero la tasa, despues el piso.
  const metas = calcularMetas(perfil, tipo, tasaIngresada);

  revalidarTodo();
  return conExito(undefined, metas.avisos, {
    tipo,
    tasa: tasaAplicada.toFixed(1),
    pesoObjetivo: pesoObjetivo === null ? "" : String(pesoObjetivo),
  });
}

// --- KL-11: preferencia de calculo -------------------------------------------

export async function guardarModoAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const modo: ModoCalculo = datos.get("modo") === "suma" ? "suma" : "no_suma";
  guardarModo(usuarioId, modo);
  revalidarTodo();
  return conExito(MENSAJES_V2.preferenciaGuardada, [], { modo });
}

// --- KL-7, KL-13 y KL-14: comidas del dia ------------------------------------

export async function agregarComidaAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const { origen, alimentoId } = partirValorAlimento(aTexto(datos.get("alimento")));

  const porciones = aNumero(datos.get("porciones"));
  if (Number.isNaN(porciones) || porciones <= LIMITES.porciones.min) {
    return conErrores(MENSAJES.porcionesMinimo);
  }
  if (porciones > LIMITES.porciones.max) {
    return conErrores(MENSAJES.porcionesMaximo);
  }

  const agregado = agregarComida(
    usuarioId,
    fechaHoy(),
    origen,
    alimentoId,
    porciones,
  );
  if (!agregado) return conErrores("Elegí un alimento del catálogo.");

  revalidarTodo();
  return conExito();
}

export async function eliminarComidaAccion(datos: FormData): Promise<void> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const id = Number(datos.get("id"));
  if (Number.isInteger(id)) eliminarComida(usuarioId, id);
  revalidarTodo();
}

export async function registrarComidaGuardadaAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const comidaId = Number(datos.get("comida"));
  if (!Number.isInteger(comidaId)) {
    return conErrores("Elegí una comida guardada.");
  }

  const resultado = registrarComidaGuardada(usuarioId, fechaHoy(), comidaId);
  if (!resultado) return conErrores("Elegí una comida guardada.");

  revalidarTodo();
  return conExito(mensajeComidaRegistrada(resultado.cantidad, resultado.nombre));
}

// --- KL-8: agua --------------------------------------------------------------

export async function agregarAguaAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const ml = aNumero(datos.get("ml"));
  if (
    Number.isNaN(ml) ||
    ml < LIMITES.agua.min ||
    ml > LIMITES.agua.max ||
    !Number.isInteger(ml)
  ) {
    return conErrores(MENSAJES.aguaFueraDeRango);
  }

  agregarAgua(usuarioId, fechaHoy(), ml);
  revalidarTodo();
  return conExito();
}

// --- KL-10: ejercicio --------------------------------------------------------

export async function agregarEjercicioAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const perfil = leerPerfil(usuarioId);
  if (!perfil) return conErrores(MENSAJES.sinPerfil);

  const ejercicio = buscarEjercicio(aTexto(datos.get("ejercicio")));
  if (!ejercicio) return conErrores(MENSAJES_V2.ejercicioInvalido);

  const intensidad = aTexto(datos.get("intensidad")) as Intensidad;
  if (
    intensidad !== "suave" &&
    intensidad !== "moderada" &&
    intensidad !== "intensa"
  ) {
    return conErrores(MENSAJES_V2.intensidadInvalida);
  }

  const minutos = aNumero(datos.get("minutos"));
  const erroresDuracion = validarDuracion(minutos);
  if (erroresDuracion.length > 0) {
    return { errores: erroresDuracion, avisos: [], ok: false };
  }

  const kcal = calcularKcalEjercicio(
    ejercicio.met,
    perfil.peso,
    minutos,
    intensidad,
  );
  agregarEjercicio(usuarioId, fechaHoy(), ejercicio.id, minutos, intensidad, kcal);

  revalidarTodo();
  return conExito();
}

export async function eliminarEjercicioAccion(datos: FormData): Promise<void> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const id = Number(datos.get("id"));
  if (Number.isInteger(id)) eliminarEjercicio(usuarioId, id);
  revalidarTodo();
}

// --- KL-13: alimentos propios ------------------------------------------------

export async function crearAlimentoPropioAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const alimento = {
    nombre: aTexto(datos.get("nombre")),
    porcion: aTexto(datos.get("porcion")),
    kcal: aNumero(datos.get("kcal")),
    proteina: aNumero(datos.get("proteina")),
    grasa: aNumero(datos.get("grasa")),
    carbohidrato: aNumero(datos.get("carbohidrato")),
  };

  const errores = validarAlimentoPropio(alimento);
  if (errores.length > 0) return { errores, avisos: [], ok: false };

  if (existeAlimentoPropio(usuarioId, alimento.nombre)) {
    return conErrores(MENSAJES_V2.nombreAlimentoDuplicado);
  }

  crearAlimentoPropio(usuarioId, alimento);
  revalidarTodo();
  return conExito("Alimento guardado.");
}

export async function eliminarAlimentoPropioAccion(datos: FormData): Promise<void> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const id = Number(datos.get("id"));
  if (Number.isInteger(id)) eliminarAlimentoPropio(usuarioId, id);
  revalidarTodo();
}

// --- KL-14: comidas guardadas ------------------------------------------------

export async function crearComidaGuardadaAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const nombre = aTexto(datos.get("nombre"));
  if (
    nombre.length < LIMITES_V2.nombre.min ||
    nombre.length > LIMITES_V2.nombre.max
  ) {
    return conErrores(MENSAJES_V2.nombreLongitud);
  }

  let items: { origen: OrigenAlimento; alimentoId: string; porciones: number }[];
  try {
    items = JSON.parse(String(datos.get("items") ?? "[]"));
  } catch {
    items = [];
  }

  if (!Array.isArray(items) || items.length < LIMITES_V2.itemsComida.min) {
    return conErrores(MENSAJES_V2.comidaSinItems);
  }
  if (items.length > LIMITES_V2.itemsComida.max) {
    return conErrores(MENSAJES_V2.comidaDemasiadosItems);
  }
  if (
    items.some(
      (i) => !(i.porciones > LIMITES.porciones.min) || Number.isNaN(i.porciones),
    )
  ) {
    return conErrores(MENSAJES.porcionesMinimo);
  }
  if (items.some((i) => i.porciones > LIMITES.porciones.max)) {
    return conErrores(MENSAJES.porcionesMaximo);
  }

  if (existeComidaGuardada(usuarioId, nombre)) {
    return conErrores(MENSAJES_V2.nombreComidaDuplicado);
  }

  crearComidaGuardada(usuarioId, nombre, items);
  revalidarTodo();
  return conExito("Comida guardada.");
}

export async function eliminarComidaGuardadaAccion(datos: FormData): Promise<void> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const id = Number(datos.get("id"));
  if (Number.isInteger(id)) eliminarComidaGuardada(usuarioId, id);
  revalidarTodo();
}

// --- KL-15 y KL-16: pesadas, progreso y ajuste del plan ----------------------

export async function guardarPesadaAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const perfil = leerPerfil(usuarioId);
  if (!perfil) return conErrores(MENSAJES.sinPerfil);

  const fecha = aTexto(datos.get("fecha"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return conErrores("Cargá una fecha válida.");
  }
  if (fecha > fechaHoy()) return conErrores(MENSAJES_V2.fechaFutura);

  const peso = aNumero(datos.get("peso"));
  if (Number.isNaN(peso) || peso < LIMITES.peso.min || peso > LIMITES.peso.max) {
    return conErrores(MENSAJES.pesoFueraDeRango);
  }

  const avisos = registrarPesada(usuarioId, fecha, peso);

  revalidarTodo();
  return conExito(undefined, avisos);
}

export async function eliminarPesadaAccion(datos: FormData): Promise<void> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const id = Number(datos.get("id"));
  if (Number.isInteger(id)) eliminarPesada(usuarioId, id);
  revalidarTodo();
}

export async function cambiarEstadoPlanAccion(datos: FormData): Promise<void> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const plan = leerPlan(usuarioId);
  const accion = String(datos.get("accion") ?? "");

  if (accion === "pausar" && plan.estado !== "cumplido") {
    guardarPlan(usuarioId, { ...plan, estado: "pausado" });
  }
  if (accion === "reanudar" && plan.estado === "pausado") {
    guardarPlan(usuarioId, { ...plan, estado: "activo" });
  }

  revalidarTodo();
}

/** Lectura auxiliar para las pantallas que necesitan el modo activo. */
export async function modoActual(): Promise<ModoCalculo> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) return "no_suma";
  return leerModo(usuarioId);
}
