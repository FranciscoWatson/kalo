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
  eliminarComida,
  fechaHoy,
  guardarObjetivo,
  guardarPerfil,
  leerPerfil,
} from "@/lib/datos";
import {
  LIMITES,
  MENSAJES,
  acotarTasa,
  calcularMetas,
  validarPerfil,
  validarTasa,
  type NivelActividad,
  type Objetivo,
  type Sexo,
} from "@/lib/calc";
import { buscarAlimento } from "@/lib/catalogo";

export interface EstadoFormulario {
  errores: string[];
  avisos: string[];
  ok: boolean;
}

function conErrores(...errores: string[]): EstadoFormulario {
  return { errores, avisos: [], ok: false };
}

/** Convierte un campo de formulario a numero. Devuelve NaN si esta vacio. */
function aNumero(valor: FormDataEntryValue | null): number {
  const texto = String(valor ?? "").trim();
  if (texto === "") return NaN;
  return Number(texto.replace(",", "."));
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
  revalidatePath("/perfil");
  revalidatePath("/hoy");
  return { errores: [], avisos: [], ok: true };
}

// --- KL-3: objetivo ----------------------------------------------------------

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

  const { tasa: tasaAplicada } = acotarTasa(tipo, tasaIngresada);
  guardarObjetivo(usuarioId, tipo, tasaAplicada);

  // Los avisos salen del motor, en orden: primero la tasa, despues el piso.
  const metas = calcularMetas(perfil, tipo, tasaIngresada);

  revalidatePath("/perfil");
  revalidatePath("/hoy");
  return { errores: [], avisos: metas.avisos, ok: true };
}

// --- KL-7: comidas -----------------------------------------------------------

export async function agregarComidaAccion(
  _prev: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const alimentoId = String(datos.get("alimento") ?? "");
  if (!buscarAlimento(alimentoId)) return conErrores("Elegí un alimento del catálogo.");

  const porciones = aNumero(datos.get("porciones"));
  if (Number.isNaN(porciones) || porciones <= LIMITES.porciones.min) {
    return conErrores(MENSAJES.porcionesMinimo);
  }
  if (porciones > LIMITES.porciones.max) {
    return conErrores(MENSAJES.porcionesMaximo);
  }

  agregarComida(usuarioId, fechaHoy(), alimentoId, porciones);
  revalidatePath("/hoy");
  return { errores: [], avisos: [], ok: true };
}

export async function eliminarComidaAccion(datos: FormData): Promise<void> {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const id = Number(datos.get("id"));
  if (Number.isInteger(id)) eliminarComida(usuarioId, id);
  revalidatePath("/hoy");
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
  revalidatePath("/hoy");
  return { errores: [], avisos: [], ok: true };
}
