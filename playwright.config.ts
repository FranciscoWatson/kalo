import { defineConfig, devices } from "@playwright/test";

/**
 * Configuracion de los casos de prueba automatizados (Entrega 03).
 *
 * Los tests levantan un Chromium real contra la aplicacion corriendo en
 * http://localhost:3000. Si el servidor no esta levantado, Playwright lo
 * levanta solo con `npm run dev` y lo deja listo antes de empezar.
 */
export default defineConfig({
  testDir: "./tests",
  // Un worker: todos los tests comparten el archivo kalo.db.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-AR",
    actionTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    // La historia KL-18 pide que la aplicacion entre en 1366 x 768.
    viewport: { width: 1366, height: 768 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
