"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registrarUsuario, type EstadoFormulario } from "../acciones";
import { Mensajes } from "../componentes/mensajes";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

export default function Registro() {
  const [estado, accion, pendiente] = useActionState(registrarUsuario, INICIAL);

  return (
    <main className="angosto">
      <h1>Crear cuenta</h1>
      <p className="subtitulo">
        Tu perfil, tu objetivo y tus registros quedan guardados en tu cuenta.
      </p>

      <div className="tarjeta">
        <form action={accion}>
          <Mensajes errores={estado.errores} />

          <div className="campo">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" type="email" autoComplete="email" />
          </div>

          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
            />
            <p className="pie-nota">Mínimo 8 caracteres.</p>
          </div>

          <div className="campo">
            <label htmlFor="confirmacion">Confirmar contraseña</label>
            <input
              id="confirmacion"
              name="confirmacion"
              type="password"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={pendiente}>
            {pendiente ? "Creando..." : "Registrarse"}
          </button>
        </form>
      </div>

      <p className="pie-nota">
        ¿Ya tenés una cuenta? <Link href="/login">Iniciá sesión aquí.</Link>
      </p>
    </main>
  );
}
