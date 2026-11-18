/**
 * TC-08 — Meta calórica resultante para los tres objetivos (KL-3, KL-4, Alta).
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
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  // Pre-requisito: perfil P-M cargado, con GET 2759 kcal.
  cuenta = crearCuentaConPlan("tc08", { objetivo: "mantener", tasa: 0 });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-08 · meta calórica para mantener, bajar y subir", async ({ page }) => {
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.perfil);
  await expect(metrica(page, "Gasto total \\(GET\\)")).toContainText("2759 kcal");

  const guardarObjetivo = page.locator("form:has(#tipo) button[type=submit]");

  // Paso 1 — Mantener: la tasa queda deshabilitada y la meta es el GET.
  await page.selectOption("#tipo", "mantener");
  await expect(page.locator("#tasa")).toBeDisabled();
  await guardarObjetivo.click();
  await expect(page.locator(".mensaje.ok")).toHaveText("Objetivo guardado.");
  await expect(page.locator(".mensaje.aviso")).toHaveCount(0);
  await expect(metrica(page, "Meta diaria")).toContainText("2759 kcal");

  // Paso 2 — Bajar 0.5: el GET menos 550 kcal.
  await page.selectOption("#tipo", "bajar");
  await expect(page.locator("#tasa")).toBeEnabled();
  await page.fill("#tasa", "0.5");
  await guardarObjetivo.click();
  await expect(page.locator(".mensaje.ok")).toHaveText("Objetivo guardado.");
  await expect(page.locator(".mensaje.aviso")).toHaveCount(0);
  await expect(metrica(page, "Meta diaria")).toContainText("2209 kcal");
  // El select conserva el objetivo guardado (KL-22).
  await expect(page.locator("#tipo")).toHaveValue("bajar");

  // Paso 3 — Subir 0.3: el GET mas 330 kcal.
  await page.selectOption("#tipo", "subir");
  await page.fill("#tasa", "0.3");
  await guardarObjetivo.click();
  await expect(page.locator(".mensaje.ok")).toHaveText("Objetivo guardado.");
  await expect(page.locator(".mensaje.aviso")).toHaveCount(0);
  await expect(metrica(page, "Meta diaria")).toContainText("3089 kcal");
  await expect(page.locator("#tipo")).toHaveValue("subir");

  await sinErrores(page);
});
