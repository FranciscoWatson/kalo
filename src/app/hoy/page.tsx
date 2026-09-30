import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActualId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fechaHoy, resumenDelDia } from "@/lib/datos";
import { CATALOGO } from "@/lib/catalogo";
import { ETIQUETA_ESTADO, type EstadoDia } from "@/lib/calc";
import { Barra } from "../componentes/barra";
import { Mensajes } from "../componentes/mensajes";
import { eliminarComidaAccion } from "../acciones";
import { FormularioAgua, FormularioComida } from "./formularios";

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
                  <div className="etiqueta">Meta</div>
                  <div className="valor">
                    {metas.meta} <span className="unidad">kcal</span>
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
                  style={{ width: `${porcentaje(resumen.consumido, metas.meta)}%` }}
                />
              </div>
              <p className="pie-nota">
                Piso calórico de seguridad: {metas.piso} kcal · Rango en meta:{" "}
                {Math.round(metas.meta * 0.95)}–{Math.round(metas.meta * 1.05)} kcal
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
              <FormularioComida catalogo={CATALOGO} />

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
                        <td>{r.alimento.nombre}</td>
                        <td className="num">{r.porciones}</td>
                        <td className="num">{Math.round(r.kcal)}</td>
                        <td className="num">
                          {Math.round(r.proteina)} / {Math.round(r.grasa)} /{" "}
                          {Math.round(r.carbohidrato)}
                        </td>
                        <td className="num">
                          <form action={eliminarComidaAccion}>
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className="enlace">
                              Eliminar
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
                    {metas.metaAgua} <span className="unidad">ml</span>
                  </div>
                </div>
                <div className="metrica">
                  <div className="etiqueta">Cumplimiento</div>
                  <div className="valor">
                    {porcentaje(resumen.agua, metas.metaAgua)}
                    <span className="unidad"> %</span>
                  </div>
                </div>
              </div>

              <div className="barra-progreso" style={{ marginBottom: "1rem" }}>
                <span
                  style={{ width: `${porcentaje(resumen.agua, metas.metaAgua)}%` }}
                />
              </div>

              <FormularioAgua />
            </section>
          </>
        )}
      </main>
    </>
  );
}
