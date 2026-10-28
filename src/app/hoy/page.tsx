import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActualId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  fechaHoy,
  listarComidasGuardadas,
  opcionesAlimentos,
  resumenDelDia,
} from "@/lib/datos";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_INTENSIDAD,
  MENSAJES_V2,
  mensajeAguaExtra,
  type EstadoDia,
} from "@/lib/calc";
import { Barra } from "../componentes/barra";
import { Mensajes } from "../componentes/mensajes";
import { BotonEliminar } from "../componentes/eliminar";
import { eliminarComidaAccion, eliminarEjercicioAccion } from "../acciones";
import {
  FormularioAgua,
  FormularioComida,
  FormularioComidaGuardada,
  FormularioEjercicio,
} from "./formularios";

export const dynamic = "force-dynamic";

const CLASE_ESTADO: Record<EstadoDia, string> = {
  "En rango": "estado--rango",
  Excedido: "estado--excedido",
  "Por debajo del minimo": "estado--minimo",
  Incompleto: "estado--incompleto",
};

function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((parte / total) * 100));
}

export default async function PaginaHoy() {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const usuario = getDb()
    .prepare("SELECT email FROM usuarios WHERE id = ?")
    .get(usuarioId) as { email: string };

  const resumen = resumenDelDia(usuarioId, fechaHoy());
  const metas = resumen.metas;
  const opciones = opcionesAlimentos(usuarioId);
  const comidasGuardadas = listarComidasGuardadas(usuarioId);

  return (
    <>
      <Barra email={usuario.email} />
      <main>
        <h1>Hoy</h1>
        <p className="subtitulo">{resumen.fecha}</p>

        {!metas ? (
          <div className="tarjeta">
            <Mensajes errores={["Primero debés completar tu perfil."]} />
            <p>
              Cargá tus datos y tu objetivo en <Link href="/perfil">Perfil</Link>{" "}
              para que Kalo pueda calcular tu meta del día.
            </p>
          </div>
        ) : (
          <>
            {resumen.plan.estado === "pausado" ? (
              <div className="tarjeta">
                <Mensajes avisos={[MENSAJES_V2.planPausado]} />
              </div>
            ) : null}

            <section className="tarjeta">
              <h2>Balance del día</h2>
              <div className="metricas">
                <div className="metrica">
                  <div className="etiqueta">Consumido</div>
                  <div className="valor">
                    {resumen.consumido} <span className="unidad">kcal</span>
                  </div>
                </div>
                <div className="metrica">
                  <div className="etiqueta">Gastado</div>
                  <div className="valor">
                    {resumen.gastado} <span className="unidad">kcal</span>
                  </div>
                </div>
                <div className="metrica">
                  <div className="etiqueta">Meta del día</div>
                  <div className="valor">
                    {resumen.metaDia} <span className="unidad">kcal</span>
                  </div>
                </div>
                <div className="metrica">
                  <div className="etiqueta">Balance</div>
                  <div className="valor">
                    {resumen.balance > 0 ? "+" : ""}
                    {resumen.balance} <span className="unidad">kcal</span>
                  </div>
                </div>
                <div className="metrica">
                  <div className="etiqueta">Estado</div>
                  <div style={{ marginTop: "0.35rem" }}>
                    <span
                      className={`estado ${CLASE_ESTADO[resumen.estado!]}`}
                      data-estado={resumen.estado!}
                    >
                      {ETIQUETA_ESTADO[resumen.estado!]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="barra-progreso" style={{ marginTop: "1rem" }}>
                <span
                  style={{ width: `${porcentaje(resumen.consumido, resumen.metaDia)}%` }}
                />
              </div>
              <p className="pie-nota">
                Piso calórico de seguridad: {metas.piso} kcal · Rango en meta:{" "}
                {Math.round(resumen.metaDia * 0.95)}–
                {Math.round(resumen.metaDia * 1.05)} kcal ·{" "}
                {resumen.modo === "suma"
                  ? "El ejercicio suma a la meta del día."
                  : "El ejercicio no suma a la meta del día."}
              </p>
            </section>

            <section className="tarjeta">
              <h2>Macronutrientes</h2>
              <table>
                <thead>
                  <tr>
                    <th>Macronutriente</th>
                    <th className="num">Consumido</th>
                    <th className="num">Meta</th>
                    <th className="num">Restante</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Proteína</td>
                    <td className="num">{resumen.proteina} g</td>
                    <td className="num">{metas.macros.proteina} g</td>
                    <td className="num">
                      {metas.macros.proteina - resumen.proteina} g
                    </td>
                  </tr>
                  <tr>
                    <td>Grasa</td>
                    <td className="num">{resumen.grasa} g</td>
                    <td className="num">{metas.macros.grasa} g</td>
                    <td className="num">{metas.macros.grasa - resumen.grasa} g</td>
                  </tr>
                  <tr>
                    <td>Carbohidratos</td>
                    <td className="num">{resumen.carbohidrato} g</td>
                    <td className="num">{metas.macros.carbohidrato} g</td>
                    <td className="num">
                      {metas.macros.carbohidrato - resumen.carbohidrato} g
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="tarjeta">
              <h2>Comidas del día</h2>
              <FormularioComida opciones={opciones} />

              <div style={{ marginTop: "1rem" }}>
                <FormularioComidaGuardada comidas={comidasGuardadas} />
              </div>

              {resumen.registros.length === 0 ? (
                <p className="vacio">Todavía no registraste comidas hoy.</p>
              ) : (
                <table style={{ marginTop: "1rem" }}>
                  <thead>
                    <tr>
                      <th>Alimento</th>
                      <th className="num">Porciones</th>
                      <th className="num">kcal</th>
                      <th className="num">P / G / C</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.registros.map((r) => (
                      <tr key={r.id}>
                        <td>{r.nombre}</td>
                        <td className="num">{r.porciones}</td>
                        <td className="num">{Math.round(r.kcal)}</td>
                        <td className="num">
                          {Math.round(r.proteina)} / {Math.round(r.grasa)} /{" "}
                          {Math.round(r.carbohidrato)}
                        </td>
                        <td className="num">
                          <BotonEliminar accion={eliminarComidaAccion} id={r.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="tarjeta">
              <h2>Ejercicio del día</h2>
              <FormularioEjercicio />

              {resumen.ejercicios.length === 0 ? (
                <p className="vacio">Todavía no registraste ejercicio hoy.</p>
              ) : (
                <table style={{ marginTop: "1rem" }}>
                  <thead>
                    <tr>
                      <th>Ejercicio</th>
                      <th className="num">Duración</th>
                      <th>Intensidad</th>
                      <th className="num">kcal</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.ejercicios.map((e) => (
                      <tr key={e.id}>
                        <td>{e.nombre}</td>
                        <td className="num">{e.minutos} min</td>
                        <td>{ETIQUETA_INTENSIDAD[e.intensidad]}</td>
                        <td className="num">{e.kcal}</td>
                        <td className="num">
                          <BotonEliminar accion={eliminarEjercicioAccion} id={e.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <p className="pie-nota">
                Total gastado hoy: {resumen.gastado} kcal en{" "}
                {resumen.minutosEjercicio} minutos.
              </p>
            </section>

            <section className="tarjeta">
              <h2>Hidratación</h2>
              <div className="metricas" style={{ marginBottom: "1rem" }}>
                <div className="metrica">
                  <div className="etiqueta">Tomado</div>
                  <div className="valor">
                    {resumen.agua} <span className="unidad">ml</span>
                  </div>
                </div>
                <div className="metrica">
                  <div className="etiqueta">Meta</div>
                  <div className="valor">
                    {resumen.metaAgua} <span className="unidad">ml</span>
                  </div>
                </div>
                <div className="metrica">
                  <div className="etiqueta">Cumplimiento</div>
                  <div className="valor">
                    {porcentaje(resumen.agua, resumen.metaAgua)}
                    <span className="unidad"> %</span>
                  </div>
                </div>
              </div>

              <div className="barra-progreso" style={{ marginBottom: "1rem" }}>
                <span
                  style={{ width: `${porcentaje(resumen.agua, resumen.metaAgua)}%` }}
                />
              </div>

              <FormularioAgua />

              {resumen.extraAgua > 0 ? (
                <p className="pie-nota">
                  {mensajeAguaExtra(resumen.extraAgua, resumen.minutosEjercicio)}
                </p>
              ) : null}
            </section>

            <section className="tarjeta">
              <h2>Coach</h2>
              <ul>
                {resumen.coach.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
              </ul>
              <p className="pie-nota">
                Recomendaciones generadas a partir de tu perfil, tu objetivo y lo
                que registraste hoy.
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
