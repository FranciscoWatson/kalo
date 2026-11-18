/**
 * TC-47 — Los formularios conservan lo elegido después de guardar
 * (KL-22, prioridad Alta · confirma DF-09).
 *
 * Es el caso que faltaba en la Entrega 02: el criterio existía (KL-18) pero no
 * tenía caso de prueba, y la aplicación no lo cumplía fuera de la pantalla
 * Perfil. Se automatiza porque recorre seis formularios en cuatro pantallas y
 * a mano es largo y fácil de pasar por alto.
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
  bloque,
  esperarHidratacion,
  iniciarSesion,
  irA,
  sinErrores,
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  cuenta = crearCuentaConPlan("tc47", { objetivo: "bajar", tasa: 0.5 });
  sumarAlimentoPropio(cuenta, {
    nombre: "Budín casero",
    porcion: "1 porción (80 g)",
    kcal: 260,
    proteina: 10,
    grasa: 20,
    carbohidrato: 10,
  });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-47 · los formularios de configuración conservan el valor guardado", async ({
  page,
}) => {
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.perfil);

  // Datos corporales.
  await page.selectOption("#sexo", "masculino");
  await page.selectOption("#actividad", "muy_activo");
  await page.click("form:has(#edad) button[type=submit]");
  await expect(page.locator(".mensaje.ok")).toHaveText("Perfil guardado.");
  await expect(page.locator("#sexo")).toHaveValue("masculino");
  await expect(page.locator("#actividad")).toHaveValue("muy_activo");

  await page.reload();
  await esperarHidratacion(page);
  await expect(page.locator("#sexo")).toHaveValue("masculino");
  await expect(page.locator("#actividad")).toHaveValue("muy_activo");

  // Objetivo.
  await page.selectOption("#tipo", "subir");
  await page.fill("#tasa", "0.3");
  await page.click("form:has(#tipo) button[type=submit]");
  await expect(page.locator("#tipo")).toHaveValue("subir");
  await page.reload();
  await esperarHidratacion(page);
  await expect(page.locator("#tipo")).toHaveValue("subir");
  await expect(page.locator("#tasa")).toHaveValue("0.3");

  // Preferencias de cálculo: son botones de radio y valen lo mismo.
  await page.check("input[name=modo][value=suma]");
  await page.click("form:has(input[name=modo]) button[type=submit]");
  await expect(page.locator(".mensaje.ok")).toHaveText(
    "Preferencia de cálculo guardada.",
  );
  await expect(page.locator("input[name=modo][value=suma]")).toBeChecked();
  await page.reload();
  await esperarHidratacion(page);
  await expect(page.locator("input[name=modo][value=suma]")).toBeChecked();

  await sinErrores(page);
});

test("TC-47 · los formularios de alta conservan el select y limpian el resto", async ({
  page,
}) => {
  await iniciarSesion(page, cuenta);

  // --- Hoy: comida -----------------------------------------------------------
  await irA(page, RUTAS.hoy);
  await page.selectOption("#alimento", "catalogo:atun-agua");
  await page.fill("#porciones", "2");
  await page.click("form:has(#alimento) button[type=submit]");

  // El select conserva lo elegido, para poder cargar otra porción enseguida.
  await expect(page.locator("#alimento")).toHaveValue("catalogo:atun-agua");
  // Y las porciones vuelven a 1.
  await expect(page.locator("#porciones")).toHaveValue("1");

  // --- Hoy: ejercicio --------------------------------------------------------
  await page.selectOption("#ejercicio", "natacion");
  await page.selectOption("#intensidad", "intensa");
  await page.fill("#minutos", "45");
  await page.click("form:has(#ejercicio) button[type=submit]");

  await expect(page.locator("#ejercicio")).toHaveValue("natacion");
  await expect(page.locator("#intensidad")).toHaveValue("intensa");
  await expect(page.locator("#minutos")).toHaveValue("30");

  // --- Hoy: agua -------------------------------------------------------------
  await page.fill("#ml", "500");
  await page.click("form:has(#ml) button[type=submit]");
  await expect(page.locator("#ml")).toHaveValue("250");

  // Al recargar, los formularios de alta vuelven a su valor por defecto.
  await page.reload();
  await esperarHidratacion(page);
  await expect(page.locator("#ejercicio")).toHaveValue("");
  await expect(page.locator("#intensidad")).toHaveValue("moderada");

  // --- Alimentos: alta con error, que no tiene que limpiar nada --------------
  await irA(page, RUTAS.alimentos);
  await page.fill("#nombre", "Tarta incoherente");
  await page.fill("#porcion", "1 porción");
  await page.fill("#kcal", "300");
  await page.fill("#proteina", "10");
  await page.fill("#grasa", "10");
  await page.fill("#carbohidrato", "10");
  await page.click("form:has(#kcal) button[type=submit]");

  await expect(page.locator(".mensaje.error")).toContainText(
    "no coinciden con las 300 kcal ingresadas",
  );
  await expect(page.locator("#nombre")).toHaveValue("Tarta incoherente");
  await expect(page.locator("#kcal")).toHaveValue("300");
  await expect(page.locator("#proteina")).toHaveValue("10");

  // Corregido, el alta pasa y ahora sí se limpia.
  await page.fill("#kcal", "170");
  await page.click("form:has(#kcal) button[type=submit]");
  await expect(page.locator(".mensaje.ok")).toHaveText("Alimento guardado.");
  await expect(page.locator("#nombre")).toHaveValue("");
  await expect(page.locator("#kcal")).toHaveValue("");

  // --- Alimentos: armador de la comida guardada ------------------------------
  const armador = bloque(page, "Mis comidas guardadas");
  await page.selectOption("#item", "catalogo:merluza");
  await armador.locator("button", { hasText: "Agregar alimento" }).click();
  await expect(page.locator("#item")).toHaveValue("catalogo:merluza");
});
