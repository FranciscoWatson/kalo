import { defineConfig } from "@playwright/test";
import configuracionBase from "./playwright.config";

/**
 * Configuracion para mostrar los casos en vivo (presentacion).
 *
 * Es la misma suite, con la misma semilla y las mismas aserciones: lo unico que
 * cambia es que el navegador se abre a la vista y cada accion se hace en camara
 * lenta, para poder seguirla desde el proyector.
 *
 * Se usa con `npm run test:e2e:slow` y no reemplaza a la corrida normal, que es
 * la que vale para la regresion.
 */
export default defineConfig(configuracionBase, {
  // Con el navegador a la vista y mas despacio, cada caso tarda mas.
  timeout: 300_000,
  reporter: [["list"]],
  use: {
    headless: false,
    launchOptions: { slowMo: 800 },
  },
});
