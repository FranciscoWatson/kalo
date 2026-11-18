/**
 * TC-23 — Con el modo suma la meta del día crece, el estado cambia y el piso
 * se sigue midiendo sobre lo consumido (KL-11, KL-9, prioridad Alta).
 */

import { expect, test } from "@playwright/test";
import {
  borrarCuenta,
  crearCuentaConPlan,
  sumarComida,
  sumarEjercicio,
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
  validarBalance,
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  // Pre-requisito (el estado en el que TC-22 deja el dia): 2194 kcal
  // consumidas y 600 kcal gastadas.
  cuenta = crearCuentaConPlan("tc23", { objetivo: "bajar", tasa: 0.5 });
  sumarComida(cuenta, "hamburguesa-completa", 2);
  sumarComida(cuenta, "pizza-muzzarella", 1);
  sumarComida(cuenta, "arroz-cocido", 1);
  sumarComida(cuenta, "hamburguesa-completa", 1);
  sumarEjercicio(cuenta, "bicicleta", 60, "moderada", 80);
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-23 · con el modo suma la meta del día crece y el piso no se mueve", async ({
  page,
}) => {
  await iniciarSesion(page, cuenta);

  // Punto de partida: el modo por defecto no suma.
  await irA(page, RUTAS.hoy);
  await validarBalance(page, {
    consumido: 2194,
    gastado: 600,
    metaDia: 2209,
    balance: -15,
    estado: "En rango",
  });

  // Paso 1 — se cambia la preferencia.
  await irA(page, RUTAS.perfil);
  await page.check("input[name=modo][value=suma]");
  await page.click("form:has(input[name=modo]) button[type=submit]");
  await expect(page.locator(".mensaje.ok")).toHaveText(
    "Preferencia de cálculo guardada.",
  );
  // KL-22: la opción queda marcada después de guardar.
  await expect(page.locator("input[name=modo][value=suma]")).toBeChecked();

  // Paso 3 — la meta del plan y los macros no se mueven: el modo solo cambia
  // la meta del día.
  await expect(metrica(page, "Meta diaria")).toContainText("2209 kcal");

  // Paso 2 — en Hoy, la meta del día es 2209 + 600.
  await irA(page, RUTAS.hoy);
  await validarBalance(page, {
    consumido: 2194,
    gastado: 600,
    metaDia: 2809,
    balance: -615,
    estado: "Incompleto",
  });

  // Paso 4 — se baja el consumo a 1420 kcal: el piso se mide sobre lo
  // consumido, no sobre el balance.
  const comidas = bloque(page, "Comidas del día");
  await expect(comidas.locator("tbody tr")).toHaveCount(4);

  // Se quitan la hamburguesa suelta (540 kcal) y el arroz (234 kcal).
  aceptarConfirmacion(page);
  await comidas.locator("tbody tr").last().locator("button.enlace").click();
  await expect(comidas.locator("tbody tr")).toHaveCount(3);
  aceptarConfirmacion(page);
  await comidas
    .locator("tbody tr")
    .filter({ hasText: "Arroz blanco cocido" })
    .locator("button.enlace")
    .click();
  await expect(comidas.locator("tbody tr")).toHaveCount(2);

  await validarBalance(page, {
    consumido: 1420,
    gastado: 600,
    metaDia: 2809,
    balance: -1389,
    estado: "Por debajo del mínimo",
  });

  // Paso 5 — con 234 kcal mas ya se pasa el piso.
  await page.selectOption("#alimento", "catalogo:arroz-cocido");
  await page.fill("#porciones", "1");
  await page.click("form:has(#alimento) button[type=submit]");
  await expect(metrica(page, "Consumido")).toContainText("1654 kcal");
  await expect(page.locator("span.estado").first()).toHaveText("Incompleto");

  // Paso 6 — sin ejercicio, los dos modos coinciden.
  const ejercicio = bloque(page, "Ejercicio del día");
  aceptarConfirmacion(page);
  await ejercicio.locator("tbody tr").first().locator("button.enlace").click();
  await expect(metrica(page, "Gastado")).toContainText("0 kcal");
  await expect(metrica(page, "Meta del día")).toContainText("2209 kcal");

  await sinErrores(page);
});
