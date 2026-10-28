"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../acciones";

const SECCIONES = [
  { href: "/hoy", texto: "Hoy" },
  { href: "/alimentos", texto: "Alimentos" },
  { href: "/progreso", texto: "Progreso" },
  { href: "/perfil", texto: "Perfil" },
];

export function Barra({ email }: { email: string }) {
  const ruta = usePathname();

  return (
    <header className="barra">
      <Link href="/hoy" className="marca">
        Kalo
      </Link>
      <nav>
        {SECCIONES.map((seccion) => (
          <Link
            key={seccion.href}
            href={seccion.href}
            className={ruta === seccion.href ? "activo" : undefined}
            aria-current={ruta === seccion.href ? "page" : undefined}
          >
            {seccion.texto}
          </Link>
        ))}
        <span style={{ color: "var(--texto-suave)", fontSize: "0.85rem" }}>
          {email}
        </span>
        <form action={logout}>
          <button type="submit" className="secundario">
            Cerrar sesión
          </button>
        </form>
      </nav>
    </header>
  );
}
