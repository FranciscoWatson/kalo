import Link from "next/link";
import { logout } from "../acciones";

export function Barra({ email }: { email: string }) {
  return (
    <header className="barra">
      <Link href="/hoy" className="marca">
        Kalo
      </Link>
      <nav>
        <Link href="/hoy">Hoy</Link>
        <Link href="/perfil">Perfil</Link>
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
