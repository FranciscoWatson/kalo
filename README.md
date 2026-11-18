# Kalo — V3

Aplicación web de seguimiento de alimentación: calcula una meta calórica diaria a
partir del perfil y el objetivo del usuario, mide el balance del día, sigue el
progreso del plan y da recomendaciones.

Proyecto Integrador de **Testing de Aplicaciones** — UADE, Grupo 8
(Watson · Koller · Lazzaro).

## Requisitos

- Node.js 22 o superior (se usa `node:sqlite`, incorporado desde esa versión). Probado con 24.

## Cómo levantarla

```bash
npm install
npm run dev
```

Queda en `http://localhost:3000`. No hay base que instalar: es el archivo `kalo.db`, que se
crea solo al arrancar. Para partir de una base limpia, detener el servidor y borrarlo.

## Cuentas de prueba

Deja cargadas las 34 cuentas que usan los casos de prueba, con el estado que pide cada uno
(perfil, objetivo, registros del día, alimentos propios, pesadas):

```bash
npm run cuentas
```

Es idempotente: se puede correr las veces que haga falta y siempre deja el mismo estado.
La contraseña de todas las cuentas es `Grupo8.Kalo2026`. El detalle de cada una está en
`entrega-03/cuentas-de-prueba.md`.

## Casos de prueba automatizados

13 casos de prueba de V1, V2 y V3 corren sobre un Chromium real con Playwright.

```bash
npx playwright install chromium   # solo la primera vez en esta máquina
npm run test:e2e                  # la suite completa, sin ventana
npm run test:e2e:headed           # con el navegador a la vista
npm run test:e2e:slow             # a la vista y en cámara lenta, para mostrarlo
npm run test:e2e:report           # abre el reporte de la última corrida
npx playwright test TC-20 --headed
```

Cada test se crea su propia cuenta con el estado que pide el pre-requisito del caso y la borra
al terminar, así que la suite se puede correr todas las veces seguidas que haga falta.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run cuentas` | Deja cargadas las cuentas de prueba |
| `npm run test:e2e` | Los 13 casos de prueba automatizados |
| `npm run test:e2e:slow` | Los mismos casos, a la vista y en cámara lenta |
| `npm run verificar` | 137 comprobaciones del motor de cálculo (V1, V2 y V3) |

## Estructura

```
src/
├─ lib/
│  ├─ calc.ts       Motor de metas y reglas: TMB, GET, meta, macros, hidratación,
│  │                estados, ejercicio, alimentos propios y ajuste del plan.
│  │                Módulo puro, sin acceso a datos. Es lo que se prueba.
│  ├─ coach.ts      Motor de reglas del Coach: 11 reglas, determinístico
│  ├─ exportar.ts   Armado del CSV del resumen semanal (módulo puro)
│  ├─ db.ts         Esquema y conexión SQLite
│  ├─ datos.ts      Lectura y escritura, resumen del día y de la semana
│  ├─ catalogo.ts   32 alimentos predefinidos
│  ├─ ejercicios.ts 12 ejercicios con su MET
│  └─ auth.ts       Hash de contraseña (scrypt) y sesión en cookie firmada
├─ app/
│  ├─ acciones.ts   Server Actions con el patrón EstadoFormulario
│  ├─ login/ registro/
│  ├─ perfil/       Perfil, objetivo, metas y preferencias de cálculo
│  ├─ hoy/          Balance del día, comidas, ejercicio, hidratación y Coach
│  ├─ alimentos/    Alimentos propios y comidas guardadas
│  └─ progreso/     Pesadas, plan, resumen semanal y exportación a CSV
tests/              Casos de prueba automatizados (Playwright)
scripts/            Preparación de cuentas y verificación del motor
```

Las reglas de negocio con sus valores exactos —piso calórico, tasas máximas, tolerancias,
límites del ajuste del plan y los mensajes literales— viven en `src/lib/calc.ts` y
`src/lib/coach.ts`, que no acceden a la base de datos.

## Base de datos

SQLite en el archivo `kalo.db` de esta carpeta, creado automáticamente al arrancar. Se puede
cambiar la ruta con la variable de entorno `KALO_DB_PATH`.

Tablas: `usuarios`, `perfiles`, `objetivos`, `preferencias`, `registros_comida`,
`registros_agua`, `registros_ejercicio`, `alimentos_propios`, `comidas_guardadas`,
`comidas_guardadas_items`, `pesadas`, `planes` y `ajustes_plan`.
