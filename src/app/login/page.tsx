"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginUsuario, type EstadoFormulario } from "../acciones";
import { Mensajes } from "../componentes/mensajes";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

export default function Login() {
  const [estado, accion, pendiente] = useActionState(loginUsuario, INICIAL);

  return (
    <main className="angosto">
      <h1>Kalo</h1>
      <p className="subtitulo">Iniciá sesión para ver tus metas del día.</p>

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
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={pendiente}>
            {pendiente ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>

      <p className="pie-nota">
        ¿No tenés una cuenta? <Link href="/registro">Registrate aquí.</Link>
      </p>
    </main>
  );
}
