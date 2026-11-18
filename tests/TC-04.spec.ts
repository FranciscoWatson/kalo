/**
 * TC-04 — Alta del perfil y cálculo del gasto energético (KL-2, KL-4, Alta).
 *
 * El caso parte de una cuenta sin perfil: el test la crea con el correo del
 * dia y la borra al terminar.
 */

import { expect, test } from "@playwright/test";
import { borrarCuenta, crearCuenta, type Cuenta } from "./apoyo/semilla";
import {
  RUTAS,
  esperarHidratacion,
  iniciarSesion,
  irA,
  metrica,
  sinErrores,
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  cuenta = crearCuenta("tc04");
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-04 · alta del perfil y cálculo del gasto energético", async ({ page }) => {
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.perfil);
  await expect(page.locator("h1")).toHaveText("Perfil y objetivo");

  // Paso 1 — los cinco campos del perfil P-M.
  await page.fill("#edad", "30");
  await page.selectOption("#sexo", "masculino");
  await page.fill("#peso", "80");
  await page.fill("#altura", "180");
  await page.selectOption("#actividad", "moderado");
  await page.click("form:has(#edad) button[type=submit]");

  await expect(page.locator(".mensaje.ok")).toHaveText("Perfil guardado.");

  // Paso 2 — el bloque de metas aparece aunque todavia no haya objetivo
  // (criterio 2 de KL-2, que es el defecto DF-01 de la V1).
  await expect(page.locator("h2", { hasText: "Metas calculadas" })).toBeVisible();
  await expect(metrica(page, "TMB")).toContainText("1780 kcal");
  await expect(metrica(page, "Gasto total \\(GET\\)")).toContainText("2759 kcal");

  // Paso 3 — al refrescar, el perfil conserva los cinco valores.
  await page.reload();
  await esperarHidratacion(page);
  await expect(page.locator("#edad")).toHaveValue("30");
  await expect(page.locator("#sexo")).toHaveValue("masculino");
  await expect(page.locator("#peso")).toHaveValue("80");
  await expect(page.locator("#altura")).toHaveValue("180");
  await expect(page.locator("#actividad")).toHaveValue("moderado");
  await expect(metrica(page, "TMB")).toContainText("1780 kcal");
  await expect(metrica(page, "Gasto total \\(GET\\)")).toContainText("2759 kcal");

  await sinErrores(page, ["Primero debés completar tu perfil."]);
});
