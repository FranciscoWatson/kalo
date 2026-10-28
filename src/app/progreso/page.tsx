import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActualId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  fechaHoy,
  leerObjetivo,
  leerPerfil,
  leerPlan,
  listarAjustes,
  listarPesadas,
  metasVigentes,
  resumenSemanal,
} from "@/lib/datos";
import {
  ETIQUETA_ESTADO_PLAN,
  formatearFecha,
  formatearPeso,
} from "@/lib/calc";
import { Barra } from "../componentes/barra";
import { Mensajes } from "../componentes/mensajes";
import { BotonEliminar } from "../componentes/eliminar";
import { cambiarEstadoPlanAccion, eliminarPesadaAccion } from "../acciones";
import { FormularioPesada } from "./formularios";

export const dynamic = "force-dynamic";

export default async function PaginaProgreso() {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const usuario = getDb()
    .prepare("SELECT email FROM usuarios WHERE id = ?")
    .get(usuarioId) as { email: string };

  const perfil = leerPerfil(usuarioId);
  const objetivo = leerObjetivo(usuarioId);
  const plan = leerPlan(usuarioId);
  const metas =
    perfil && objetivo ? metasVigentes(perfil, objetivo, plan.ajusteAcumulado) : null;

  const pesadas = listarPesadas(usuarioId).slice().reverse();
  const ajustes = listarAjustes(usuarioId);
  const semanal = resumenSemanal(usuarioId, fechaHoy());

  if (!perfil) {
    return (
      <>
        <Barra email={usuario.email} />
        <main>
          <h1>Progreso</h1>
          <div className="tarjeta">
            <Mensajes errores={["Primero debés completar tu perfil."]} />
            <p>
              Cargá tus datos en <Link href="/perfil">Perfil</Link> para poder
              registrar tus pesadas.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Barra email={usuario.email} />
      <main>
        <h1>Progreso</h1>
        <p className="subtitulo">
          Registrá tu peso y seguí cómo evoluciona tu plan.
        </p>

        <section className="tarjeta">
          <h2>Estado del plan</h2>
          <div className="metricas">
            <div className="metrica">
              <div className="etiqueta">Estado</div>
              <div style={{ marginTop: "0.35rem" }}>
                <span className="estado" data-estado={plan.estado}>
                  {ETIQUETA_ESTADO_PLAN[plan.estado]}
                </span>
              </div>
            </div>
            <div className="metrica">
              <div className="etiqueta">Pesada de referencia</div>
              <div className="valor">
                {plan.referenciaPeso !== null
                  ? `${formatearPeso(plan.referenciaPeso)} `
                  : "— "}
                <span className="unidad">
                  {plan.referenciaFecha
                    ? `kg · ${formatearFecha(plan.referenciaFecha)}`
                    : ""}
                </span>
              </div>
            </div>
            <div className="metrica">
              <div className="etiqueta">Peso objetivo</div>
              <div className="valor">
                {plan.pesoObjetivo !== null
                  ? formatearPeso(plan.pesoObjetivo)
                  : "—"}{" "}
                <span className="unidad">kg</span>
              </div>
            </div>
            <div className="metrica">
              <div className="etiqueta">Meta vigente</div>
              <div className="valor">
                {metas ? metas.meta : "—"} <span className="unidad">kcal</span>
              </div>
            </div>
          </div>

          {plan.estado !== "cumplido" ? (
            <form action={cambiarEstadoPlanAccion} style={{ marginTop: "1rem" }}>
              <input
                type="hidden"
                name="accion"
                value={plan.estado === "pausado" ? "reanudar" : "pausar"}
              />
              <button type="submit" className="secundario">
                {plan.estado === "pausado" ? "Reanudar plan" : "Pausar plan"}
              </button>
            </form>
          ) : null}

          <p className="pie-nota">
            Ajuste acumulado sobre la meta: {plan.ajusteAcumulado > 0 ? "+" : ""}
            {plan.ajusteAcumulado} kcal.
          </p>
        </section>

        <section className="tarjeta">
          <h2>Registrar pesada</h2>
          <FormularioPesada hoy={fechaHoy()} peso={perfil.peso} />
        </section>

        <section className="tarjeta">
          <h2>Historial de pesadas</h2>
          {pesadas.length === 0 ? (
            <p className="vacio">Todavía no registraste ninguna pesada.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="num">Peso</th>
                  <th className="num">Variación</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pesadas.map((p) => (
                  <tr key={p.id}>
                    <td>{formatearFecha(p.fecha)}</td>
                    <td className="num">{formatearPeso(p.peso)} kg</td>
                    <td className="num">
                      {p.variacion === null
                        ? ""
                        : `${p.variacion > 0 ? "+" : ""}${p.variacion.toFixed(1)} kg`}
                    </td>
                    <td className="num">
                      <BotonEliminar accion={eliminarPesadaAccion} id={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="tarjeta">
          <h2>Resumen semanal</h2>
          <div className="metricas">
            <div className="metrica">
              <div className="etiqueta">Variación total</div>
              <div className="valor">
                {semanal.variacionTotal === null
                  ? "—"
                  : `${semanal.variacionTotal > 0 ? "+" : ""}${semanal.variacionTotal.toFixed(1)}`}{" "}
                <span className="unidad">kg</span>
              </div>
            </div>
            <div className="metrica">
              <div className="etiqueta">Balance semanal</div>
              <div className="valor">
                {semanal.balanceSemanal === null
                  ? "—"
                  : `${semanal.balanceSemanal > 0 ? "+" : ""}${semanal.balanceSemanal}`}{" "}
                <span className="unidad">kcal</span>
              </div>
            </div>
            <div className="metrica">
              <div className="etiqueta">Adherencia</div>
              <div className="valor">
                {semanal.adherencia === null ? "—" : semanal.adherencia}
                <span className="unidad"> %</span>
              </div>
            </div>
          </div>
          <p className="pie-nota">
            Calculado sobre los últimos 7 días con registros:{" "}
            {semanal.diasConRegistros}{" "}
            {semanal.diasConRegistros === 1 ? "día" : "días"}.
          </p>
        </section>

        <section className="tarjeta">
          <h2>Historial de ajustes del plan</h2>
          {ajustes.length === 0 ? (
            <p className="vacio">Todavía no se recalculó tu plan.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="num">Peso real</th>
                  <th className="num">Peso proyectado</th>
                  <th className="num">Meta anterior</th>
                  <th className="num">Meta nueva</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {ajustes.map((a) => (
                  <tr key={`${a.fecha}-${a.metaNueva}`}>
                    <td>{formatearFecha(a.fecha)}</td>
                    <td className="num">{formatearPeso(a.pesoReal)} kg</td>
                    <td className="num">{formatearPeso(a.pesoProyectado)} kg</td>
                    <td className="num">{a.metaAnterior} kcal</td>
                    <td className="num">{a.metaNueva} kcal</td>
                    <td>{a.motivo}</td>
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
