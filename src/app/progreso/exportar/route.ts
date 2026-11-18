/**
 * Descarga del resumen semanal en CSV (KL-19).
 *
 * Es un Route Handler: no devuelve una pantalla sino el archivo. El armado del
 * contenido vive en lib/exportar.ts, que es un modulo puro y se puede verificar
 * sin levantar la aplicacion.
 */

import { usuarioActualId } from "@/lib/auth";
import { fechaHoy, filasDeLaSemana, leerObjetivo, leerPerfil } from "@/lib/datos";
import { armarCsvSemana, nombreArchivoResumen } from "@/lib/exportar";

export async function GET() {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) {
    return new Response("No autorizado", { status: 401 });
  }

  // Sin perfil u objetivo no hay metas, y el archivo no tendria sentido
  // (KL-19, criterio 9: la pantalla ya deshabilita el boton).
  if (!leerPerfil(usuarioId) || !leerObjetivo(usuarioId)) {
    return new Response("Sin plan definido", { status: 409 });
  }

  const hoy = fechaHoy();
  const csv = armarCsvSemana(filasDeLaSemana(usuarioId, hoy));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivoResumen(hoy)}"`,
      "Cache-Control": "no-store",
    },
  });
}
