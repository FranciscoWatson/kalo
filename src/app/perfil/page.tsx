import { redirect } from "next/navigation";
import { usuarioActualId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  leerModo,
  leerObjetivo,
  leerPerfil,
  leerPlan,
  metasVigentes,
} from "@/lib/datos";
import { calcularGET, calcularTMB } from "@/lib/calc";
import { Barra } from "../componentes/barra";
import { Mensajes } from "../componentes/mensajes";
import {
  FormularioObjetivo,
  FormularioPerfil,
  FormularioPreferencias,
} from "./formularios";

export const dynamic = "force-dynamic";

export default async function PaginaPerfil() {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const usuario = getDb()
    .prepare("SELECT email FROM usuarios WHERE id = ?")
    .get(usuarioId) as { email: string };

  const perfil = leerPerfil(usuarioId);
  const objetivo = leerObjetivo(usuarioId);
  const plan = leerPlan(usuarioId);
  const modo = leerModo(usuarioId);

  // Con el perfil solo ya se pueden mostrar la TMB y el gasto energetico
  // (criterio 2 de KL-2, que la V1 no cumplia: DF-01).
  const tmb = perfil ? Math.round(calcularTMB(perfil)) : null;
  const get = perfil ? Math.round(calcularGET(perfil)) : null;
  const metas =
    perfil && objetivo ? metasVigentes(perfil, objetivo, plan.ajusteAcumulado) : null;

  return (
    <>
      <Barra email={usuario.email} />
      <main>
        <h1>Perfil y objetivo</h1>
        <p className="subtitulo">
          De estos datos salen tu gasto energético y tu meta calórica diaria.
        </p>

        <section className="tarjeta">
          <h2>Datos corporales</h2>
          <FormularioPerfil perfil={perfil} />
        </section>

        <section className="tarjeta">
          <h2>Objetivo</h2>
          {perfil ? (
            <FormularioObjetivo
              objetivo={objetivo}
              pesoObjetivo={plan.pesoObjetivo}
            />
          ) : (
            <Mensajes errores={["Primero debés completar tu perfil."]} />
          )}
        </section>

        {perfil ? (
          <section className="tarjeta">
            <h2>Metas calculadas</h2>
            <Mensajes avisos={metas?.avisos ?? []} />

            <div className="metricas">
              <div className="metrica">
                <div className="etiqueta">TMB</div>
                <div className="valor">
                  {tmb} <span className="unidad">kcal</span>
                </div>
              </div>
              <div className="metrica">
                <div className="etiqueta">Gasto total (GET)</div>
                <div className="valor">
                  {get} <span className="unidad">kcal</span>
                </div>
              </div>
              <div className="metrica">
                <div className="etiqueta">Meta diaria</div>
                <div className="valor">
                  {metas ? metas.meta : "—"} <span className="unidad">kcal</span>
                </div>
              </div>
              <div className="metrica">
                <div className="etiqueta">Meta de agua</div>
                <div className="valor">
                  {metas ? metas.metaAgua : "—"}{" "}
                  <span className="unidad">ml</span>
                </div>
              </div>
            </div>

            {metas ? (
              <>
                <table style={{ marginTop: "1.25rem" }}>
                  <thead>
                    <tr>
                      <th>Macronutriente</th>
                      <th className="num">Gramos</th>
                      <th className="num">kcal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Proteína</td>
                      <td className="num">{metas.macros.proteina} g</td>
                      <td className="num">{metas.macros.proteina * 4}</td>
                    </tr>
                    <tr>
                      <td>Grasa</td>
                      <td className="num">{metas.macros.grasa} g</td>
                      <td className="num">{metas.macros.grasa * 9}</td>
                    </tr>
                    <tr>
                      <td>Carbohidratos</td>
                      <td className="num">{metas.macros.carbohidrato} g</td>
                      <td className="num">{metas.macros.carbohidrato * 4}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="pie-nota">
                  Piso calórico de seguridad aplicado: {metas.piso} kcal · Ritmo
                  efectivo: {metas.tasaAplicada.toFixed(1)} kg/semana
                  {metas.macros.alternativo
                    ? " · Reparto alternativo 30/30/40"
                    : ""}
                  {plan.ajusteAcumulado !== 0
                    ? ` · Ajuste del plan: ${plan.ajusteAcumulado > 0 ? "+" : ""}${plan.ajusteAcumulado} kcal`
                    : ""}
                </p>
              </>
            ) : (
              <p className="pie-nota">
                Definí tu objetivo para ver la meta calórica, el reparto de
                macronutrientes y la meta de hidratación.
              </p>
            )}
          </section>
        ) : null}

        {perfil ? (
          <section className="tarjeta">
            <h2>Preferencias de cálculo</h2>
            <FormularioPreferencias modo={modo} />
            <p className="pie-nota">
              Define si las calorías que gastás entrenando se suman a la meta del
              día o si quedan solo como información.
            </p>
          </section>
        ) : null}
      </main>
    </>
  );
}
