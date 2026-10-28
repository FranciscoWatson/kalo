/**
 * Persistencia de Kalo V1.
 *
 * Usa el modulo SQLite incorporado en Node (node:sqlite), asi que no hay
 * dependencias nativas que compilar. La base es un unico archivo kalo.db en la
 * raiz del proyecto.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const RUTA_DB = process.env.KALO_DB_PATH ?? path.join(process.cwd(), "kalo.db");

let instancia: DatabaseSync | null = null;

function crearEsquema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS usuarios (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS perfiles (
      usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      edad       INTEGER NOT NULL,
      sexo       TEXT NOT NULL,
      peso       REAL NOT NULL,
      altura     INTEGER NOT NULL,
      actividad  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS objetivos (
      usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo       TEXT NOT NULL,
      tasa       REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS registros_comida (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha       TEXT NOT NULL,
      alimento_id TEXT NOT NULL,
      porciones   REAL NOT NULL,
      creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_comida_usuario_fecha
      ON registros_comida (usuario_id, fecha);

    CREATE TABLE IF NOT EXISTS registros_agua (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha      TEXT NOT NULL,
      ml         INTEGER NOT NULL,
      creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agua_usuario_fecha
      ON registros_agua (usuario_id, fecha);

    -- --- V2 -----------------------------------------------------------------

    CREATE TABLE IF NOT EXISTS registros_ejercicio (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha        TEXT NOT NULL,
      ejercicio_id TEXT NOT NULL,
      minutos      INTEGER NOT NULL,
      intensidad   TEXT NOT NULL,
      kcal         INTEGER NOT NULL,
      creado_en    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ejercicio_usuario_fecha
      ON registros_ejercicio (usuario_id, fecha);

    CREATE TABLE IF NOT EXISTS alimentos_propios (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre       TEXT NOT NULL COLLATE NOCASE,
      porcion      TEXT NOT NULL,
      kcal         REAL NOT NULL,
      proteina     REAL NOT NULL,
      grasa        REAL NOT NULL,
      carbohidrato REAL NOT NULL,
      creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario_id, nombre)
    );

    CREATE TABLE IF NOT EXISTS comidas_guardadas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre     TEXT NOT NULL COLLATE NOCASE,
      creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario_id, nombre)
    );

    CREATE TABLE IF NOT EXISTS comidas_guardadas_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      comida_id   INTEGER NOT NULL REFERENCES comidas_guardadas(id) ON DELETE CASCADE,
      origen      TEXT NOT NULL,
      alimento_id TEXT NOT NULL,
      porciones   REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pesadas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha      TEXT NOT NULL,
      peso       REAL NOT NULL,
      UNIQUE (usuario_id, fecha)
    );

    CREATE TABLE IF NOT EXISTS planes (
      usuario_id       INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      estado           TEXT NOT NULL DEFAULT 'activo',
      ajuste_acumulado INTEGER NOT NULL DEFAULT 0,
      peso_objetivo    REAL,
      referencia_fecha TEXT,
      referencia_peso  REAL,
      creado_en        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ajustes_plan (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha           TEXT NOT NULL,
      peso_real       REAL NOT NULL,
      peso_proyectado REAL NOT NULL,
      meta_anterior   INTEGER NOT NULL,
      meta_nueva      INTEGER NOT NULL,
      motivo          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS preferencias (
      usuario_id      INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      modo_ejercicio  TEXT NOT NULL DEFAULT 'no_suma'
    );
  `);

  // La V2 guarda en cada registro de comida una copia de los valores del
  // alimento, para que borrar un alimento propio no altere lo ya registrado.
  // Las columnas se agregan sobre la tabla de la V1, que puede existir sin ellas.
  for (const columna of [
    "origen TEXT NOT NULL DEFAULT 'catalogo'",
    "nombre TEXT",
    "porcion TEXT",
    "kcal REAL",
    "proteina REAL",
    "grasa REAL",
    "carbohidrato REAL",
  ]) {
    try {
      db.exec(`ALTER TABLE registros_comida ADD COLUMN ${columna};`);
    } catch {
      // La columna ya existe: no hay nada que hacer.
    }
  }
}

export function getDb(): DatabaseSync {
  if (!instancia) {
    instancia = new DatabaseSync(RUTA_DB);
    instancia.exec("PRAGMA foreign_keys = ON;");
    crearEsquema(instancia);
  }
  return instancia;
}
