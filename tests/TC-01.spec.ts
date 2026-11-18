/**
 * TC-01 — Alta de una cuenta con datos válidos (KL-1, prioridad Alta).
 *
 * Caso de prueba escrito en entrega-01/02-casos-de-prueba-v1.md.
 * El caso crea la cuenta desde la pantalla, asi que la precondicion es que la
 * cuenta NO exista: se usa un correo distinto en cada corrida y al terminar se
 * borra, para poder correr el caso las veces que haga falta.
 */

import { expect, test } from "@playwright/test";
import { CLAVE, borrarPorEmail, emailUnico } from "./apoyo/semilla";
import {
  RUTAS,
  esperarHidratacion,
  irA,
  sinErrores,
} from "./apoyo/pantallas";

test("TC-01 · alta de una cuenta con datos válidos", async ({ page }) => {
  const email = emailUnico("tc01");

  try {
    // Paso 0 — la pantalla de alta se abre desde el enlace del login.
    await irA(page, RUTAS.login);
    await expect(page.locator("h1")).toHaveText("Kalo");
    await page.click("text=Registrate aquí");
    await page.waitForURL(/\/registro/);
    await expect(page.locator("h1")).toHaveText("Crear cuenta");
    await expect(page.locator("button[type=submit]")).toHaveText("Registrarse");

    // Paso 1 — correo.
    await page.fill("#email", email);
    await expect(page.locator("#email")).toHaveValue(email);

    // Pasos 2 y 3 — clave y confirmacion, que se tipean ocultas.
    await page.fill("#password", CLAVE);
    await page.fill("#confirmacion", CLAVE);
    await expect(page.locator("#password")).toHaveAttribute("type", "password");
    await expect(page.locator("#confirmacion")).toHaveAttribute("type", "password");

    // Paso 4 — la cuenta queda creada y la aplicacion abre Perfil.
    await page.click("button[type=submit]");
    await page.waitForURL(/\/perfil/);
    await expect(page.locator("h1")).toHaveText("Perfil y objetivo");

    // Validaciones que haria una persona mirando la pantalla:
    // la sesion quedo iniciada con esa cuenta,
    await expect(page.locator("header")).toContainText(email);
    // estan los dos bloques que se cargan primero,
    await expect(page.locator("h2", { hasText: "Datos corporales" })).toBeVisible();
    await expect(page.locator("h2", { hasText: "Objetivo" })).toBeVisible();
    // la cuenta arranca sin metas calculadas,
    await expect(page.locator("h2", { hasText: "Metas calculadas" })).toHaveCount(0);
    // y el unico mensaje en pantalla es el que corresponde a una cuenta nueva.
    await expect(page.locator(".mensaje.error")).toHaveText(
      "Primero debés completar tu perfil.",
    );
    await sinErrores(page, ["Primero debés completar tu perfil."]);

    // La sesion sobrevive a recargar: la cuenta quedo realmente creada.
    await page.reload();
  await esperarHidratacion(page);
    await expect(page.locator("header")).toContainText(email);
  } finally {
    borrarPorEmail(email);
  }
});
