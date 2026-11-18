/**
 * TC-13 — Reparto de macronutrientes respetando los mínimos por kilo
 * (KL-5, prioridad Alta).
 */

import { expect, test } from "@playwright/test";
import { borrarCuenta, crearCuentaConPlan, type Cuenta } from "./apoyo/semilla";
import {
  RUTAS,
  esperarHidratacion,
  iniciarSesion,
  irA,
  metrica,
  sinErrores,
  validarMacros,
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  cuenta = crearCuentaConPlan("tc13", { objetivo: "bajar", tasa: 0.5 });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-13 · reparto de macronutrientes con déficit y con mantenimiento", async ({
  page,
}) => {
  await iniciarSesion(page, cuenta);

  // Paso 1 — con deficit: proteina 2.0 g/kg, grasa 0.8 g/kg y el resto a
  // carbohidratos.
  await irA(page, RUTAS.hoy);
  await expect(page.locator("h1")).toHaveText("Hoy");
  await validarMacros(page, [0, 0, 0], [160, 64, 248]);

  // Paso 2 — el reparto cierra con la meta: 160x4 + 64x9 + 248x4 = 2208 kcal,
  // a menos de 5 kcal de los 2209 de la meta.
  const kcalDeLosMacros = 160 * 4 + 64 * 9 + 248 * 4;
  expect(Math.abs(kcalDeLosMacros - 2209)).toBeLessThan(5);
  await irA(page, RUTAS.perfil);
  await expect(metrica(page, "Meta diaria")).toContainText("2209 kcal");

  // Paso 3 — en mantenimiento la proteina baja a 1.6 g/kg y los carbohidratos
  // absorben la diferencia.
  await page.selectOption("#tipo", "mantener");
  await page.click("form:has(#tipo) button[type=submit]");
  await expect(page.locator(".mensaje.ok")).toHaveText("Objetivo guardado.");
  await expect(metrica(page, "Meta diaria")).toContainText("2759 kcal");

  await irA(page, RUTAS.hoy);
  await validarMacros(page, [0, 0, 0], [128, 64, 418]);

  await sinErrores(page);
});
