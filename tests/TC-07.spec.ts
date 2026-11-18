/**
 * TC-07 — La modificación del peso recalcula la meta calórica y la meta de
 * hidratación (KL-2, KL-4, KL-6, prioridad Alta).
 */

import { expect, test } from "@playwright/test";
import {
  borrarCuenta,
  crearCuentaConPlan,
  P_M,
  type Cuenta,
} from "./apoyo/semilla";
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
  // Pre-requisito: perfil P-M y objetivo "Mantener".
  cuenta = crearCuentaConPlan("tc07", {
    perfil: P_M,
    objetivo: "mantener",
    tasa: 0,
  });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-07 · cambiar el peso recalcula la meta y la hidratación", async ({ page }) => {
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.perfil);

  // Paso 1 — metas de partida con 80 kg.
  await expect(metrica(page, "TMB")).toContainText("1780 kcal");
  await expect(metrica(page, "Gasto total \\(GET\\)")).toContainText("2759 kcal");
  await expect(metrica(page, "Meta diaria")).toContainText("2759 kcal");
  await expect(metrica(page, "Meta de agua")).toContainText("2800 ml");

  // Paso 2 — se cambia el peso a 70 kg.
  await page.fill("#peso", "70");
  await page.click("form:has(#edad) button[type=submit]");
  await expect(page.locator(".mensaje.ok")).toHaveText("Perfil guardado.");

  // Paso 3 — las cuatro metas se recalculan.
  await expect(metrica(page, "TMB")).toContainText("1680 kcal");
  await expect(metrica(page, "Gasto total \\(GET\\)")).toContainText("2604 kcal");
  await expect(metrica(page, "Meta diaria")).toContainText("2604 kcal");
  await expect(metrica(page, "Meta de agua")).toContainText("2450 ml");

  // El campo quedo con el peso nuevo y el cambio persiste.
  await expect(page.locator("#peso")).toHaveValue("70");
  await page.reload();
  await esperarHidratacion(page);
  await expect(page.locator("#peso")).toHaveValue("70");
  await expect(metrica(page, "Meta diaria")).toContainText("2604 kcal");

  await sinErrores(page);
});
