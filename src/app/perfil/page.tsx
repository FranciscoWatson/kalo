import { redirect } from "next/navigation";
import { usuarioActualId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { leerObjetivo, leerPerfil } from "@/lib/datos";
import { calcularMetas } from "@/lib/calc";
import { Barra } from "../componentes/barra";
import { Mensajes } from "../componentes/mensajes";
import { FormularioObjetivo, FormularioPerfil } from "./formularios";

export const dynamic = "force-dynamic";

export default async function PaginaPerfil() {
  const usuarioId = await usuarioActualId();
  if (!usuarioId) redirect("/login");

  const usuario = getDb()
    .prepare("SELECT email FROM usuarios WHERE id = ?")
    .get(usuarioId) as { email: string };

  const perfil = leerPerfil(usuarioId);
  const objetivo = leerObjetivo(usuarioId);
  const metas =
    perfil && objetivo ? calcularMetas(perfil, objetivo.tipo, objetivo.tasa) : null;

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
            <FormularioObjetivo objetivo={objetivo} />
          ) : (
            <Mensajes errores={["Primero debés completar tu perfil."]} />
          )}
        </section>

        {metas ? (
          <section className="tarjeta">
            <h2>Metas calculadas</h2>
            <Mensajes avisos={metas.avisos} />

            <div className="metricas">
              <div className="metrica">
                <div className="etiqueta">TMB</div>
                <div className="valor">
                  {metas.tmb} <span className="unidad">kcal</span>
                </div>
              </div>
              <div className="metrica">
                <div className="etiqueta">Gasto total (GET)</div>
                <div className="valor">
                  {metas.get} <span className="unidad">kcal</span>
                </div>
              </div>
              <div className="metrica">
                <div className="etiqueta">Meta diaria</div>
                <div className="valor">
                  {metas.meta} <span className="unidad">kcal</span>
                </div>
              </div>
              <div className="metrica">
                <div className="etiqueta">Meta de agua</div>
                <div className="valor">
                  {metas.metaAgua} <span className="unidad">ml</span>
                </div>
              </div>
            </div>

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
              {metas.macros.alternativo ? " · Reparto alternativo 30/30/40" : ""}
            </p>
          </section>
        ) : null}
      </main>
    </>
  );
}
