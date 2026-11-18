/**
 * TC-33 — Recálculo de la meta cuando el peso real se desvía del proyectado,
 * dentro del límite (KL-16, prioridad Alta).
 *
 * El caso necesita una pesada de hace 14 días: el test la registra desde la
 * pantalla, igual que lo haría una persona, con la fecha calculada en la
 * corrida.
 */

import { expect, test } from "@playwright/test";
import { borrarCuenta, crearCuentaConPlan, type Cuenta } from "./apoyo/semilla";
import { fechaHoy, fechaMenosDias } from "../src/lib/datos";
import { formatearFecha } from "../src/lib/calc";
import {
  RUTAS,
  bloque,
  esperarHidratacion,
  iniciarSesion,
  irA,
  metrica,
  sinErrores,
} from "./apoyo/pantallas";

let cuenta: Cuenta;

test.beforeEach(() => {
  // Perfil P-M (80 kg), objetivo Bajar 0.5 recién guardado y sin pesadas.
  cuenta = crearCuentaConPlan("tc33", { objetivo: "bajar", tasa: 0.5 });
});

test.afterEach(() => {
  borrarCuenta(cuenta);
});

test("TC-33 · el plan recalcula la meta cuando el peso real se desvía", async ({
  page,
}) => {
  const hoy = fechaHoy();
  const haceCatorce = fechaMenosDias(hoy, 14);

  await iniciarSesion(page, cuenta);
  await irA(page, RUTAS.progreso);
  await expect(page.locator("h1")).toHaveText("Progreso");

  // Paso 1 — pesada de referencia: la primera no dispara ningún ajuste.
  await page.fill("#fecha", haceCatorce);
  await page.fill("#peso", "80");
  await page.click("form:has(#peso) button[type=submit]");
  await expect(page.locator(".mensaje.ok")).toHaveText("Pesada registrada.");
  await expect(page.locator(".mensaje.aviso")).toHaveCount(0);

  const historial = bloque(page, "Historial de pesadas").locator("tbody tr");
  await expect(historial).toHaveCount(1);
  await expect(historial.first()).toContainText(formatearFecha(haceCatorce));
  await expect(historial.first()).toContainText("80.0 kg");

  // Paso 2 — el plan arranca Activo con la meta original.
  const plan = bloque(page, "Estado del plan");
  await expect(plan.locator("span.estado")).toHaveText("Activo");
  await expect(metrica(page, "Meta vigente")).toContainText("2209 kcal");
  await expect(metrica(page, "Pesada de referencia")).toContainText(
    `80.0 kg · ${formatearFecha(haceCatorce)}`,
  );

  // Paso 3 — pesada de hoy: 79.4 contra 79.0 proyectados.
  await page.fill("#fecha", hoy);
  await page.fill("#peso", "79.4");
  await page.click("form:has(#peso) button[type=submit]");
  await expect(page.locator(".mensaje.aviso")).toContainText(
    "Tu peso real (79.4 kg) difiere del proyectado (79.0 kg). Se recalculó la meta de 2200 a 1980 kcal.",
  );

  // Paso 4 — el plan quedó Recalculado con la meta nueva.
  await expect(plan.locator("span.estado")).toHaveText("Recalculado");
  await expect(metrica(page, "Meta vigente")).toContainText("1980 kcal");

  // Paso 5 — el ajuste quedó registrado en el historial.
  const ajustes = bloque(page, "Historial de ajustes del plan").locator("tbody tr");
  await expect(ajustes).toHaveCount(1);
  await expect(ajustes.first()).toContainText(formatearFecha(hoy));
  await expect(ajustes.first()).toContainText("79.4 kg");
  await expect(ajustes.first()).toContainText("79.0 kg");
  await expect(ajustes.first()).toContainText("2200 kcal");
  await expect(ajustes.first()).toContainText("1980 kcal");

  // Paso 6 — las otras dos pantallas usan la meta nueva.
  await irA(page, RUTAS.hoy);
  await expect(metrica(page, "Meta del día")).toContainText("1980 kcal");
  await irA(page, RUTAS.perfil);
  await expect(metrica(page, "Meta diaria")).toContainText("1980 kcal");

  await sinErrores(page);
});
