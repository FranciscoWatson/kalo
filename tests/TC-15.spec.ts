/**
 * TC-15 — Carga de comidas con porciones enteras y fraccionarias, y
 * eliminación de un registro (KL-7, KL-9, prioridad Alta).
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
  validarBalance,
  validarMacros,
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  // Pre-requisito: perfil P-M, objetivo Bajar 0.5 (meta 2209) y dia sin comidas.
  cuenta = crearCuentaConPlan("tc15", { objetivo: "bajar", tasa: 0.5 });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-15 · cargar comidas enteras y fraccionarias, y eliminar un registro", async ({
  page,
}) => {
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.hoy);

  const comidas = bloque(page, "Comidas del día");
  await expect(
    comidas.locator(".vacio", { hasText: "Todavía no registraste comidas hoy." }),
  ).toBeVisible();

  // Paso 1 — 2 porciones de pechuga de pollo: 496 kcal.
  await page.selectOption("#alimento", "catalogo:pollo-pechuga");
  await page.fill("#porciones", "2");
  await page.click("form:has(#alimento) button[type=submit]");

  await expect(comidas.locator("tbody tr")).toHaveCount(1);
  await expect(comidas.locator("tbody tr").first()).toContainText("Pechuga de pollo");
  await expect(comidas.locator("tbody tr").first()).toContainText("496");
  await validarBalance(page, {
    consumido: 496,
    gastado: 0,
    metaDia: 2209,
    balance: -1713,
    estado: "Por debajo del mínimo",
  });

  // Paso 2 — los macros consumidos acompañan.
  await validarMacros(page, [93, 11, 0], [160, 64, 248]);

  // Paso 3 — 1.5 porciones de arroz: el campo acepta el decimal.
  await page.selectOption("#alimento", "catalogo:arroz-cocido");
  await page.fill("#porciones", "1.5");
  await page.click("form:has(#alimento) button[type=submit]");

  await expect(comidas.locator("tbody tr")).toHaveCount(2);
  await expect(comidas.locator("tbody tr").nth(1)).toContainText("Arroz blanco cocido");
  await expect(comidas.locator("tbody tr").nth(1)).toContainText("351");
  await expect(metrica(page, "Consumido")).toContainText("847 kcal");

  // Paso 4 — se elimina el arroz, con la confirmacion previa de KL-18.
  aceptarConfirmacion(page);
  await comidas.locator("tbody tr").nth(1).locator("button.enlace").click();

  await expect(comidas.locator("tbody tr")).toHaveCount(1);
  await expect(comidas.locator("tbody")).not.toContainText("Arroz blanco cocido");
  await expect(metrica(page, "Consumido")).toContainText("496 kcal");

  await sinErrores(page);
});
