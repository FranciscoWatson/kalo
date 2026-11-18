/**
 * Apoyo de los casos automatizados: navegacion y validaciones comunes.
 *
 * La parte importante de un caso automatizado son las validaciones. Un script
 * que solo mira si cambio la URL no encuentra defectos: tiene que comprobar lo
 * mismo que miraria una persona ejecutando el caso a mano —el titulo de la
 * pantalla, los numeros de cada metrica, el texto de los mensajes, las filas de
 * las tablas— y ademas que no haya quedado ningun error en la pantalla.
 */

import { expect, type Locator, type Page } from "@playwright/test";
import type { Cuenta } from "./semilla";

export const RUTAS = {
  login: "/login",
  registro: "/registro",
  hoy: "/hoy",
  perfil: "/perfil",
  alimentos: "/alimentos",
  progreso: "/progreso",
} as const;

/** Inicia sesion por la pantalla de login, como lo haria una persona. */
export async function iniciarSesion(page: Page, cuenta: Cuenta): Promise<void> {
  await page.goto(RUTAS.login);
  await expect(page.locator("h1")).toHaveText("Kalo");
  await page.fill("#email", cuenta.email);
  await page.fill("#password", cuenta.clave);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/(hoy|perfil)/);
  // La barra superior muestra la cuenta con la sesion iniciada.
  await expect(page.locator("header")).toContainText(cuenta.email);
}

/**
 * Espera a que React haya hidratado la pantalla. Sin esto, un clic muy rapido
 * sobre un formulario lo envia como HTML plano —antes de que React tome el
 * control— y la pantalla se recarga entera: el caso fallaria por una carrera
 * del test, no por un defecto de la aplicacion.
 */
export async function esperarHidratacion(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const formulario = document.querySelector("form");
    return (
      !!formulario &&
      Object.keys(formulario).some((clave) => clave.startsWith("__react"))
    );
  });
}

/** Abre una pantalla, espera el titulo y la hidratacion. */
export async function irA(page: Page, ruta: string): Promise<void> {
  await page.goto(ruta);
  await expect(page.locator("h1")).toBeVisible();
  await esperarHidratacion(page);
}

/** Abre una pantalla y espera a que haya terminado de cargar. */
export async function abrir(page: Page, ruta: string, titulo: string) {
  await page.goto(ruta);
  await expect(page.locator("h1")).toHaveText(titulo);
  await expect(page.locator("nav a").first()).toBeVisible();
}

/** Valor de una metrica, buscada por su etiqueta ("Consumido", "Meta del día"…). */
export function metrica(page: Page, etiqueta: string): Locator {
  return page
    .locator(".metrica")
    .filter({ has: page.locator(".etiqueta", { hasText: new RegExp(`^${etiqueta}$`) }) })
    .locator(".valor");
}

/** Celda de la tabla de macronutrientes: fila por nombre, columna por indice. */
export function celdaMacro(page: Page, macro: string, columna: number): Locator {
  return page
    .locator("tr")
    .filter({ hasText: new RegExp(`^${macro}`) })
    .locator("td")
    .nth(columna);
}

/** Bloque (tarjeta) de la pantalla, buscado por su titulo. */
export function bloque(page: Page, titulo: string): Locator {
  return page
    .locator("section.tarjeta")
    .filter({ has: page.locator("h2", { hasText: new RegExp(`^${titulo}$`) }) });
}

/** El estado del dia que muestra el bloque Balance del día. */
export function estadoDelDia(page: Page): Locator {
  return page.locator("span.estado").first();
}

/**
 * No quedo ningun mensaje de error inesperado en la pantalla. Algunas
 * pantallas muestran un aviso con estilo de error cuando falta completar algo
 * (por ejemplo, una cuenta recien creada sin perfil): esos se declaran.
 */
export async function sinErrores(
  page: Page,
  permitidos: string[] = [],
): Promise<void> {
  const textos = (await page.locator(".mensaje.error").allTextContents()).map((t) =>
    t.trim(),
  );
  expect(textos.filter((t) => !permitidos.includes(t))).toEqual([]);
}

/** Mensaje de confirmacion con el texto exacto que dice el caso. */
export async function confirma(page: Page, texto: string): Promise<void> {
  await expect(page.locator(".mensaje.ok, .mensaje.aviso").filter({ hasText: texto }))
    .toBeVisible();
}

/** Mensaje de error con el texto exacto que dice el caso. */
export async function rechaza(page: Page, texto: string): Promise<void> {
  await expect(page.locator(".mensaje.error").filter({ hasText: texto })).toBeVisible();
}

/**
 * Valida la pantalla Hoy completa: las cinco metricas del balance y el estado.
 * Es lo que mira una persona de un vistazo cuando ejecuta cualquier caso que
 * toca el dia.
 */
export async function validarBalance(
  page: Page,
  esperado: {
    consumido: number;
    gastado: number;
    metaDia: number;
    balance: number;
    estado: string;
  },
): Promise<void> {
  await expect(metrica(page, "Consumido")).toContainText(`${esperado.consumido} kcal`);
  await expect(metrica(page, "Gastado")).toContainText(`${esperado.gastado} kcal`);
  await expect(metrica(page, "Meta del día")).toContainText(`${esperado.metaDia} kcal`);
  await expect(metrica(page, "Balance")).toContainText(
    `${esperado.balance > 0 ? "+" : ""}${esperado.balance} kcal`,
  );
  await expect(estadoDelDia(page)).toHaveText(esperado.estado);
  await sinErrores(page);
}

/** Valida las tres filas de la tabla de macronutrientes (consumido y meta). */
export async function validarMacros(
  page: Page,
  consumido: [number, number, number],
  meta: [number, number, number],
): Promise<void> {
  const macros = ["Proteína", "Grasa", "Carbohidratos"];
  for (let i = 0; i < macros.length; i += 1) {
    await expect(celdaMacro(page, macros[i], 1)).toHaveText(`${consumido[i]} g`);
    await expect(celdaMacro(page, macros[i], 2)).toHaveText(`${meta[i]} g`);
  }
}

/** Acepta la confirmacion del navegador antes de un borrado (KL-18). */
export function aceptarConfirmacion(page: Page): void {
  page.once("dialog", (dialogo) => {
    void dialogo.accept();
  });
}
