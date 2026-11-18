/**
 * TC-18 — Recorrido por los cuatro estados del día a medida que sube el
 * consumo (KL-9, prioridad Alta).
 */

import { expect, test } from "@playwright/test";
import { borrarCuenta, crearCuentaConPlan, type Cuenta } from "./apoyo/semilla";
import {
  RUTAS,
  esperarHidratacion,
  iniciarSesion,
  irA,
  sinErrores,
  validarBalance,
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  // Meta 2209 kcal, piso 1500 kcal, franja en rango 2099–2319 kcal.
  cuenta = crearCuentaConPlan("tc18", { objetivo: "bajar", tasa: 0.5 });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

async function registrar(page: import("@playwright/test").Page, alimento: string, porciones: string) {
  await page.selectOption("#alimento", alimento);
  await page.fill("#porciones", porciones);
  await page.click("form:has(#alimento) button[type=submit]");
}

test("TC-18 · los cuatro estados del día a medida que sube el consumo", async ({
  page,
}) => {
  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.hoy);

  // La franja que usa el estado esta a la vista y es la del caso.
  await expect(page.locator(".pie-nota").first()).toContainText(
    "Piso calórico de seguridad: 1500 kcal",
  );
  await expect(page.locator(".pie-nota").first()).toContainText("2099–2319 kcal");

  // Paso 1 — dia vacio.
  await validarBalance(page, {
    consumido: 0,
    gastado: 0,
    metaDia: 2209,
    balance: -2209,
    estado: "Por debajo del mínimo",
  });

  // Paso 2 — 3 hamburguesas: 1620 kcal, pasa el piso pero no llega al rango.
  await registrar(page, "catalogo:hamburguesa-completa", "3");
  await validarBalance(page, {
    consumido: 1620,
    gastado: 0,
    metaDia: 2209,
    balance: -589,
    estado: "Incompleto",
  });

  // Paso 3 — pizza y arroz: 2194 kcal, dentro de la franja.
  await registrar(page, "catalogo:pizza-muzzarella", "1");
  await registrar(page, "catalogo:arroz-cocido", "1");
  await validarBalance(page, {
    consumido: 2194,
    gastado: 0,
    metaDia: 2209,
    balance: -15,
    estado: "En rango",
  });

  // Paso 4 — alfajor: 2459 kcal, se pasa de 2319.
  await registrar(page, "catalogo:alfajor", "1");
  await validarBalance(page, {
    consumido: 2459,
    gastado: 0,
    metaDia: 2209,
    balance: 250,
    estado: "Excedido",
  });

  await sinErrores(page);
});
