/**
 * TC-28 — Alta de una comida guardada con alimentos del catálogo y propios,
 * registro en un paso y baja sin perder los registros (KL-14, prioridad Alta).
 */

import { expect, test } from "@playwright/test";
import {
  borrarCuenta,
  crearCuentaConPlan,
  sumarAlimentoPropio,
  type Cuenta,
} from "./apoyo/semilla";
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
  // Pre-requisito: la cuenta ya tiene el alimento propio y el dia vacio.
  cuenta = crearCuentaConPlan("tc28", { objetivo: "bajar", tasa: 0.5 });
  sumarAlimentoPropio(cuenta, {
    nombre: "Tarta de jamón y queso",
    porcion: "1 porción (180 g)",
    kcal: 380,
    proteina: 18,
    grasa: 22,
    carbohidrato: 26,
  });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-28 · comida guardada: alta, registro en un paso y baja", async ({ page }) => {
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.alimentos);

  const armador = bloque(page, "Mis comidas guardadas");

  // Paso 1 — nombre y los cuatro ítems.
  await page.fill("#nombre-comida", "Mi desayuno");
  const items: [string, string][] = [
    ["catalogo:avena", "1"],
    ["catalogo:leche-descremada", "1"],
    ["catalogo:banana", "1"],
  ];
  for (const [valor, porciones] of items) {
    await page.selectOption("#item", valor);
    await page.fill("#porciones-item", porciones);
    await armador.locator("button", { hasText: "Agregar alimento" }).click();
  }
  const propio = await page
    .locator("#item option")
    .filter({ hasText: "Tarta de jamón y queso" })
    .first()
    .getAttribute("value");
  await page.selectOption("#item", propio!);
  await page.fill("#porciones-item", "0.5");
  await armador.locator("button", { hasText: "Agregar alimento" }).click();

  const armados = armador.locator("tbody tr");
  await expect(armados).toHaveCount(4);
  await expect(armados.nth(0)).toContainText("Avena arrollada");
  await expect(armados.nth(3)).toContainText("Tarta de jamón y queso");
  await expect(armados.nth(3)).toContainText("190");
  await expect(armador.locator("button", { hasText: "Quitar" })).toHaveCount(4);

  // Paso 2 — se guarda la comida.
  await armador.locator("button[type=submit]").click();
  await expect(page.locator(".mensaje.ok")).toHaveText("Comida guardada.");
  const guardada = armador.locator("tbody tr").first();
  await expect(guardada).toContainText("Mi desayuno");
  await expect(guardada).toContainText("Avena arrollada x1");
  await expect(guardada).toContainText("Tarta de jamón y queso x0.5");
  await expect(guardada).toContainText("519");

  // Paso 3 — se registra en un paso desde Hoy: entran cuatro registros.
  await irA(page, RUTAS.hoy);
  await expect(page.locator("#comida option")).toHaveCount(1);
  await expect(page.locator("#comida option").first()).toContainText(
    "Mi desayuno — 4 alimentos (519 kcal)",
  );
  await page.selectOption("#comida", { index: 0 });
  await page.click("form:has(#comida) button[type=submit]");
  await expect(page.locator(".mensaje.ok")).toHaveText(
    "Se registraron 4 alimentos de «Mi desayuno».",
  );

  const delDia = bloque(page, "Comidas del día").locator("tbody tr");
  await expect(delDia).toHaveCount(4);

  // Paso 4 — el consumido sube 519 kcal.
  await expect(metrica(page, "Consumido")).toContainText("519 kcal");
  await expect(metrica(page, "Balance")).toContainText("-1690 kcal");

  // Paso 5 — se elimina solo la banana.
  aceptarConfirmacion(page);
  await delDia.filter({ hasText: "Banana" }).locator("button.enlace").click();
  await expect(delDia).toHaveCount(3);
  await expect(metrica(page, "Consumido")).toContainText("412 kcal");

  // Paso 6 — se elimina la comida guardada.
  await irA(page, RUTAS.alimentos);
  aceptarConfirmacion(page);
  await bloque(page, "Mis comidas guardadas")
    .locator("tbody tr")
    .filter({ hasText: "Mi desayuno" })
    .locator("button.enlace")
    .click();
  await expect(
    page.locator(".vacio", { hasText: "Todavía no guardaste ninguna comida." }),
  ).toBeVisible();

  // Paso 7 — los registros del día siguen intactos.
  await irA(page, RUTAS.hoy);
  await expect(bloque(page, "Comidas del día").locator("tbody tr")).toHaveCount(3);
  await expect(metrica(page, "Consumido")).toContainText("412 kcal");
  await expect(
    page.locator(".vacio", {
      hasText: "Todavía no guardaste ninguna comida. Podés crearlas desde la pantalla Alimentos.",
    }),
  ).toBeVisible();

  await sinErrores(page);
});
