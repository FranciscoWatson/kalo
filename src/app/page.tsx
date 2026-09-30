import { redirect } from "next/navigation";
import { usuarioActualId } from "@/lib/auth";

export default async function Inicio() {
  const usuarioId = await usuarioActualId();
  redirect(usuarioId ? "/hoy" : "/login");
}
