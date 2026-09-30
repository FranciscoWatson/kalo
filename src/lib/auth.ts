/**
 * Autenticacion minima de Kalo V1.
 *
 * Password hasheada con scrypt (node:crypto) y sesion en una cookie firmada con
 * HMAC. Es deliberadamente simple: la seguridad no es lo que evalua la materia,
 * pero la contrasena nunca se guarda en texto plano (criterio 9 de KL-1).
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

const COOKIE_SESION = "kalo_session";
const SECRETO = process.env.KALO_SECRET ?? "kalo-dev-secret-no-usar-en-produccion";

// --- Password ----------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarPassword(password: string, almacenado: string): boolean {
  const [salt, hash] = almacenado.split(":");
  if (!salt || !hash) return false;
  const calculado = scryptSync(password, salt, 64);
  const esperado = Buffer.from(hash, "hex");
  if (calculado.length !== esperado.length) return false;
  return timingSafeEqual(calculado, esperado);
}

// --- Sesion ------------------------------------------------------------------

function firmar(valor: string): string {
  return createHmac("sha256", SECRETO).update(valor).digest("hex");
}

export async function iniciarSesion(usuarioId: number): Promise<void> {
  const valor = String(usuarioId);
  const tienda = await cookies();
  tienda.set(COOKIE_SESION, `${valor}.${firmar(valor)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function cerrarSesion(): Promise<void> {
  const tienda = await cookies();
  tienda.delete(COOKIE_SESION);
}

/** Devuelve el id del usuario autenticado, o null si no hay sesion valida. */
export async function usuarioActualId(): Promise<number | null> {
  const tienda = await cookies();
  const cookie = tienda.get(COOKIE_SESION)?.value;
  if (!cookie) return null;

  const [valor, firma] = cookie.split(".");
  if (!valor || !firma) return null;
  if (firmar(valor) !== firma) return null;

  const id = Number(valor);
  if (!Number.isInteger(id)) return null;

  const fila = getDb()
    .prepare("SELECT id FROM usuarios WHERE id = ?")
    .get(id) as { id: number } | undefined;

  return fila ? fila.id : null;
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
