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
  `);
}

export function getDb(): DatabaseSync {
  if (!instancia) {
    instancia = new DatabaseSync(RUTA_DB);
    instancia.exec("PRAGMA foreign_keys = ON;");
    crearEsquema(instancia);
  }
  return instancia;
}
