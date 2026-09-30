# Kalo — V1

Aplicación web de seguimiento de alimentación: calcula una meta calórica diaria a
partir del perfil y el objetivo del usuario, y mide el balance del día.

Proyecto Integrador de **Testing de Aplicaciones** — UADE, Grupo 8
(Watson · Koller · Lazzaro).

## Requisitos

- Node.js 24 o superior (se usa `node:sqlite`, incorporado desde Node 22)

## Cómo levantarla

```bash
npm install
npm run dev
```

Queda en `http://localhost:3000`.

Para partir de una base limpia: detener el servidor y borrar `kalo.db`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `node scripts/verificar-motor.mts` | 43 comprobaciones del motor de cálculo |

## Estructura

```
src/
├─ lib/
│  ├─ calc.ts       Motor de metas: TMB, GET, meta, macros, hidratación, estados.
│  │                Módulo puro, sin acceso a datos. Es lo que se prueba.
│  ├─ db.ts         Esquema y conexión SQLite
│  ├─ datos.ts      Lectura y escritura de perfil, objetivo y registros del día
│  ├─ catalogo.ts   32 alimentos predefinidos (solo lectura en V1)
│  └─ auth.ts       Hash de contraseña (scrypt) y sesión en cookie firmada
└─ app/
   ├─ acciones.ts   Server Actions: registro, login, perfil, objetivo, registros
   ├─ login/        Inicio de sesión
   ├─ registro/     Alta de cuenta
   ├─ perfil/       Perfil, objetivo y metas calculadas
   └─ hoy/          Balance del día, comidas y agua
```

Las reglas de negocio con sus valores exactos —piso calórico, tasas máximas
admisibles, tolerancia del ±5 % y orden de evaluación de los estados— viven
íntegramente en `src/lib/calc.ts`, que no accede a la base de datos.

## Base de datos

SQLite en el archivo `kalo.db` de esta carpeta, creado automáticamente al
arrancar. Se puede cambiar la ruta con la variable de entorno `KALO_DB_PATH`.

Tablas: `usuarios`, `perfiles`, `objetivos`, `registros_comida`, `registros_agua`.
