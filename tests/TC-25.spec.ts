/**
 * TC-25 — Alta de un alimento propio coherente, su registro en el día y la
 * conservación de los registros al eliminarlo (KL-13, prioridad Alta).
 *
 * El paso 5 del caso usa una segunda cuenta para verificar que los alimentos
 * propios son privados: el test crea las dos.
 */

import { expect, test } from "@playwright/test";
import {
  borrarCuenta,
  crearCuentaConPlan,
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
let otra: Cuenta;

test.beforeEach(() => {
  // Perfil P-M con objetivo Mantener (meta 2759) y sin alimentos propios.
  cuenta = crearCuentaConPlan("tc25", { objetivo: "mantener", tasa: 0 });
  otra = crearCuentaConPlan("tc25b", { objetivo: "bajar", tasa: 0.5 });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
  borrarCuenta(otra);
});

test("TC-25 · alta de un alimento propio, registro y baja", async ({ page }) => {
  await iniciarSesion(page, cuenta);

  // Paso 1 — la pantalla Alimentos arranca con las dos listas vacias.
  await irA(page, RUTAS.alimentos);
  await expect(page.locator("h1")).toHaveText("Alimentos");
  await expect(
    page.locator(".vacio", { hasText: "Todavía no cargaste alimentos propios." }),
  ).toBeVisible();
  await expect(
    page.locator(".vacio", { hasText: "Todavía no guardaste ninguna comida." }),
  ).toBeVisible();

  // Paso 2 — alta del alimento: los macros suman 374 kcal contra 380
  // declaradas, dentro de la tolerancia de 38.
  await page.fill("#nombre", "Tarta de jamón y queso");
  await page.fill("#porcion", "1 porción (180 g)");
  await page.fill("#kcal", "380");
  await page.fill("#proteina", "18");
  await page.fill("#grasa", "22");
  await page.fill("#carbohidrato", "26");
  await page.click("form:has(#kcal) button[type=submit]");

  await expect(page.locator(".mensaje.ok")).toHaveText("Alimento guardado.");
  // El formulario se limpia (KL-22, criterio 2).
  await expect(page.locator("#nombre")).toHaveValue("");
  await expect(page.locator("#kcal")).toHaveValue("");

  const fila = bloque(page, "Mis alimentos").locator("tbody tr").first();
  await expect(fila).toContainText("Tarta de jamón y queso");
  await expect(fila).toContainText("1 porción (180 g)");
  await expect(fila).toContainText("380");
  await expect(fila).toContainText("18 / 22 / 26");

  // Paso 3 — en Hoy aparece dentro del grupo "Mis alimentos".
  await irA(page, RUTAS.hoy);
  await expect(
    page.locator('#alimento optgroup[label="Mis alimentos"] option'),
  ).toHaveText([/Tarta de jamón y queso/]);

  // Paso 4 — 2 porciones: 760 kcal y macros 36 / 44 / 52.
  const opcion = await page
    .locator('#alimento optgroup[label="Mis alimentos"] option')
    .first()
    .getAttribute("value");
  await page.selectOption("#alimento", opcion!);
  await page.fill("#porciones", "2");
  await page.click("form:has(#alimento) button[type=submit]");

  const registro = bloque(page, "Comidas del día").locator("tbody tr").first();
  await expect(registro).toContainText("Tarta de jamón y queso");
  await expect(registro).toContainText("760");
  await expect(metrica(page, "Consumido")).toContainText("760 kcal");

  // Paso 5 — la otra cuenta no ve el alimento: son privados.
  await page.click("text=Cerrar sesión");
  await page.waitForURL(/\/login/);
  await iniciarSesion(page, otra);
  await irA(page, RUTAS.alimentos);
  await expect(
    page.locator(".vacio", { hasText: "Todavía no cargaste alimentos propios." }),
  ).toBeVisible();
  await irA(page, RUTAS.hoy);
  await expect(
    page.locator('#alimento optgroup[label="Mis alimentos"]'),
  ).toHaveCount(0);

  // Paso 6 — se vuelve a la primera cuenta y se elimina el alimento.
  await page.click("text=Cerrar sesión");
  await page.waitForURL(/\/login/);
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.alimentos);
  aceptarConfirmacion(page);
  await bloque(page, "Mis alimentos").locator("button.enlace").first().click();
  await expect(page.locator(".mensaje.ok")).toHaveText(
    "Se eliminó el alimento «Tarta de jamón y queso».",
  );
  await expect(
    page.locator(".vacio", { hasText: "Todavía no cargaste alimentos propios." }),
  ).toBeVisible();

  // Paso 7 — el registro del día sobrevive, con su nombre y sus calorías.
  await irA(page, RUTAS.hoy);
  await expect(
    page.locator('#alimento optgroup[label="Mis alimentos"]'),
  ).toHaveCount(0);
  const sobreviviente = bloque(page, "Comidas del día").locator("tbody tr").first();
  await expect(sobreviviente).toContainText("Tarta de jamón y queso");
  await expect(sobreviviente).toContainText("760");
  await expect(metrica(page, "Consumido")).toContainText("760 kcal");

  await sinErrores(page);
});
