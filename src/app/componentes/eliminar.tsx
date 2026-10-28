"use client";

/**
 * Boton de borrado con confirmacion previa (KL-18, criterio 1).
 * Recibe la accion de servidor que corresponde a lo que se esta eliminando.
 */
export const TEXTO_CONFIRMACION = "¿Querés eliminar este registro?";

export function BotonEliminar({
  accion,
  id,
  etiqueta = "Eliminar",
}: {
  accion: (datos: FormData) => Promise<void>;
  id: number;
  etiqueta?: string;
}) {
  return (
    <form
      action={accion}
      onSubmit={(evento) => {
        if (!window.confirm(TEXTO_CONFIRMACION)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="enlace">
        {etiqueta}
      </button>
    </form>
  );
}
