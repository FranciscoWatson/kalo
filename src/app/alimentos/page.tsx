import { redirect } from "next/navigation";
import { usuarioActualId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  listarAlimentosPropios,
  listarComidasGuardadas,
  opcionesAlimentos,
} from "@/lib/datos";
import { Barra } from "../componentes/barra";
import { BotonEliminar } from "../componentes/eliminar";
import {
  eliminarAlimentoPropioAccion,
  eliminarComidaGuardadaAccion,
} from "../acciones";
import {
  FormularioAlimentoPropio,
  FormularioComidaGuardada,
} from "./formularios";

export const dynamic = "force-dynamic";

export default async function PaginaAlimentos() {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const usuario = getDb()
    .prepare("SELECT email FROM usuarios WHERE id = ?")
    .get(usuarioId) as { email: string };

  const propios = listarAlimentosPropios(usuarioId);
  const comidas = listarComidasGuardadas(usuarioId);
  const opciones = opcionesAlimentos(usuarioId);

  return (
    <>
      <Barra email={usuario.email} />
      <main>
        <h1>Alimentos</h1>
        <p className="subtitulo">
          Cargá los alimentos que no están en el catálogo y armá tus comidas
          frecuentes para registrarlas en un solo paso.
        </p>

        <section className="tarjeta">
          <h2>Mis alimentos</h2>
          <FormularioAlimentoPropio />

          {propios.length === 0 ? (
            <p className="vacio">Todavía no cargaste alimentos propios.</p>
          ) : (
            <table style={{ marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th>Alimento</th>
                  <th>Porción</th>
                  <th className="num">kcal</th>
                  <th className="num">P / G / C</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {propios.map((a) => (
                  <tr key={a.idNumerico}>
                    <td>{a.nombre}</td>
                    <td>{a.porcion}</td>
                    <td className="num">{a.kcal}</td>
                    <td className="num">
                      {a.proteina} / {a.grasa} / {a.carbohidrato}
                    </td>
                    <td className="num">
                      <BotonEliminar
                        accion={eliminarAlimentoPropioAccion}
                        id={a.idNumerico}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="tarjeta">
          <h2>Mis comidas guardadas</h2>
          <FormularioComidaGuardada opciones={opciones} />

          {comidas.length === 0 ? (
            <p className="vacio">Todavía no guardaste ninguna comida.</p>
          ) : (
            <table style={{ marginTop: "1.25rem" }}>
              <thead>
                <tr>
                  <th>Comida</th>
                  <th>Contenido</th>
                  <th className="num">kcal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {comidas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>
                      {c.items
                        .map((i) => `${i.nombre} x${i.porciones}`)
                        .join(" · ")}
                    </td>
                    <td className="num">{c.kcal}</td>
                    <td className="num">
                      <BotonEliminar
                        accion={eliminarComidaGuardadaAccion}
                        id={c.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}
