/**
 * TC-20 — Registro de ejercicios y cálculo de las calorías gastadas del día
 * (KL-10, prioridad Alta).
 */

import { expect, test } from "@playwright/test";
import { borrarCuenta, crearCuentaConPlan, type Cuenta } from "./apoyo/semilla";
import {
  RUTAS,
  aceptarConfirmacion,
  bloque,
  esperarHidratacion,
  iniciarSesion,
  irA,
  metrica,
  sinErrores,
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  // Perfil P-M (80 kg) y objetivo Bajar 0.5, sin ejercicio en el dia.
  cuenta = crearCuentaConPlan("tc20", { objetivo: "bajar", tasa: 0.5 });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-20 · registrar ejercicios y ver las calorías gastadas", async ({ page }) => {
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.hoy);

  const ejercicio = bloque(page, "Ejercicio del día");

  // Paso 1 — el dia arranca sin ejercicio.
  await expect(
    ejercicio.locator(".vacio", { hasText: "Todavía no registraste ejercicio hoy." }),
  ).toBeVisible();
  await expect(metrica(page, "Gastado")).toContainText("0 kcal");

  // Paso 2 — Caminata 30 min moderada: 3.5 MET x 80 kg x 0.5 h x 1.0 = 140 kcal.
  await page.selectOption("#ejercicio", "caminata");
  await page.fill("#minutos", "30");
  await page.selectOption("#intensidad", "moderada");
  await page.click("form:has(#ejercicio) button[type=submit]");

  await expect(ejercicio.locator("tbody tr")).toHaveCount(1);
  const primera = ejercicio.locator("tbody tr").first();
  await expect(primera).toContainText("Caminata");
  await expect(primera).toContainText("30");
  await expect(primera).toContainText("Moderada");
  await expect(primera).toContainText("140");
  await expect(metrica(page, "Gastado")).toContainText("140 kcal");

  // Paso 3 — Musculación 60 min suave: 5.0 x 80 x 1 x 0.85 = 340 kcal.
  await page.selectOption("#ejercicio", "musculacion");
  await page.fill("#minutos", "60");
  await page.selectOption("#intensidad", "suave");
  await page.click("form:has(#ejercicio) button[type=submit]");

  await expect(ejercicio.locator("tbody tr")).toHaveCount(2);
  const segunda = ejercicio.locator("tbody tr").nth(1);
  await expect(segunda).toContainText("Musculación");
  await expect(segunda).toContainText("Suave");
  await expect(segunda).toContainText("340");

  // Paso 4 — el total gastado del dia.
  await expect(metrica(page, "Gastado")).toContainText("480 kcal");
  // Con el modo por defecto, el ejercicio no toca la meta ni el balance.
  await expect(metrica(page, "Meta del día")).toContainText("2209 kcal");

  // Paso 5 — se elimina la musculación, con confirmacion.
  aceptarConfirmacion(page);
  await segunda.locator("button.enlace").click();

  await expect(ejercicio.locator("tbody tr")).toHaveCount(1);
  await expect(ejercicio.locator("tbody")).not.toContainText("Musculación");
  await expect(metrica(page, "Gastado")).toContainText("140 kcal");

  await sinErrores(page);
});
