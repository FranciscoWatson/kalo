"use client";

import { useActionState, useEffect, useState } from "react";
import {
  crearAlimentoPropioAccion,
  crearComidaGuardadaAccion,
  type EstadoFormulario,
} from "../acciones";
import { Mensajes } from "../componentes/mensajes";
import {
  useCampoSincronizado,
  useLimpiarTrasAlta,
} from "../componentes/campos";
import {
  LIMITES_V2,
  MENSAJES,
  MENSAJES_V2,
  partirValorAlimento,
} from "@/lib/calc";
import type { OpcionAlimento } from "@/lib/datos";

const INICIAL: EstadoFormulario = { errores: [], avisos: [], ok: false };

export function FormularioAlimentoPropio() {
  const [estado, accion, pendiente] = useActionState(
    crearAlimentoPropioAccion,
    INICIAL,
  );

  const [nombre, setNombre] = useState("");
  const [porcion, setPorcion] = useState("");
  const [kcal, setKcal] = useState("");
  const [proteina, setProteina] = useState("");
  const [grasa, setGrasa] = useState("");
  const [carbohidrato, setCarbohidrato] = useState("");

  // KL-22: el alta correcta limpia el formulario; el alta con error lo deja
  // tal como estaba, para poder corregir sin volver a escribir todo.
  useLimpiarTrasAlta(estado, () => {
    setNombre("");
    setPorcion("");
    setKcal("");
    setProteina("");
    setGrasa("");
    setCarbohidrato("");
  });

  const refNombre = useCampoSincronizado<HTMLInputElement>(nombre);
  const refPorcion = useCampoSincronizado<HTMLInputElement>(porcion);
  const refKcal = useCampoSincronizado<HTMLInputElement>(kcal);
  const refProteina = useCampoSincronizado<HTMLInputElement>(proteina);
  const refGrasa = useCampoSincronizado<HTMLInputElement>(grasa);
  const refCarbohidrato = useCampoSincronizado<HTMLInputElement>(carbohidrato);

  return (
    <form action={accion} noValidate>
      <Mensajes errores={estado.errores} ok={estado.mensaje ?? null} />

      <div className="grilla">
        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            maxLength={60}
            ref={refNombre}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="porcion">Porción de referencia</label>
          <input
            id="porcion"
            name="porcion"
            type="text"
            maxLength={40}
            placeholder="1 porción (180 g)"
            ref={refPorcion}
            value={porcion}
            onChange={(e) => setPorcion(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="kcal">Calorías (kcal)</label>
          <input
            id="kcal"
            name="kcal"
            type="text"
            inputMode="decimal"
            ref={refKcal}
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="proteina">Proteína (g)</label>
          <input
            id="proteina"
            name="proteina"
            type="text"
            inputMode="decimal"
            ref={refProteina}
            value={proteina}
            onChange={(e) => setProteina(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="grasa">Grasa (g)</label>
          <input
            id="grasa"
            name="grasa"
            type="text"
            inputMode="decimal"
            ref={refGrasa}
            value={grasa}
            onChange={(e) => setGrasa(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="carbohidrato">Carbohidratos (g)</label>
          <input
            id="carbohidrato"
            name="carbohidrato"
            type="text"
            inputMode="decimal"
            ref={refCarbohidrato}
            value={carbohidrato}
            onChange={(e) => setCarbohidrato(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" disabled={pendiente} style={{ marginTop: "0.5rem" }}>
        {pendiente ? "Guardando..." : "Guardar alimento"}
      </button>

      <p className="pie-nota">
        Los macronutrientes tienen que cerrar con las calorías declaradas: 4
        kcal/g de proteína y de carbohidrato, 9 kcal/g de grasa, con una
        tolerancia del 10 % y nunca menor a 20 kcal.
      </p>
    </form>
  );
}

interface ItemArmado {
  valor: string;
  nombre: string;
  porciones: number;
  kcal: number;
}

export function FormularioComidaGuardada({
  opciones,
}: {
  opciones: OpcionAlimento[];
}) {
  const [estado, accion, pendiente] = useActionState(
    crearComidaGuardadaAccion,
    INICIAL,
  );

  const [items, setItems] = useState<ItemArmado[]>([]);
  const [nombreComida, setNombreComida] = useState("");
  const [seleccion, setSeleccion] = useState(opciones[0]?.valor ?? "");
  const [porciones, setPorciones] = useState("1");
  const [error, setError] = useState<string | null>(null);

  // Despues de guardar, el armador queda vacio para la comida siguiente.
  useEffect(() => {
    if (estado.ok) setItems([]);
  }, [estado.ok]);

  // KL-22: el nombre y las porciones vuelven a su valor por defecto despues de
  // un alta correcta; el select conserva el ultimo alimento elegido.
  useLimpiarTrasAlta(estado, () => {
    setNombreComida("");
    setPorciones("1");
    setError(null);
  });

  const refNombreComida = useCampoSincronizado<HTMLInputElement>(nombreComida);
  const refSeleccion = useCampoSincronizado<HTMLSelectElement>(seleccion);
  const refPorcionesItem = useCampoSincronizado<HTMLInputElement>(porciones);

  function agregarItem() {
    setError(null);
    const opcion = opciones.find((o) => o.valor === seleccion);
    if (!opcion) {
      setError("Elegí un alimento del catálogo.");
      return;
    }
    const cantidad = Number(porciones.replace(",", "."));
    if (Number.isNaN(cantidad) || cantidad <= 0) {
      setError(MENSAJES.porcionesMinimo);
      return;
    }
    if (cantidad > 20) {
      setError(MENSAJES.porcionesMaximo);
      return;
    }
    if (items.length >= LIMITES_V2.itemsComida.max) {
      setError(MENSAJES_V2.comidaDemasiadosItems);
      return;
    }

    setItems([
      ...items,
      {
        valor: opcion.valor,
        nombre: opcion.nombre,
        porciones: cantidad,
        kcal: Math.round(opcion.kcal * cantidad),
      },
    ]);
  }

  const paraEnviar = items.map((i) => {
    const { origen, alimentoId } = partirValorAlimento(i.valor);
    return { origen, alimentoId, porciones: i.porciones };
  });

  return (
    <form action={accion} noValidate>
      <Mensajes
        errores={[...(error ? [error] : []), ...estado.errores]}
        ok={estado.mensaje ?? null}
      />

      <div className="campo">
        <label htmlFor="nombre-comida">Nombre</label>
        <input
          id="nombre-comida"
          name="nombre"
          type="text"
          maxLength={60}
          placeholder="Mi desayuno"
          ref={refNombreComida}
          value={nombreComida}
          onChange={(e) => setNombreComida(e.target.value)}
        />
      </div>

      <div className="fila-form" style={{ marginTop: "0.75rem" }}>
        <div className="campo" style={{ flex: "3 1 260px" }}>
          <label htmlFor="item">Alimento</label>
          <select
            id="item"
            ref={refSeleccion}
            value={seleccion}
            onChange={(e) => setSeleccion(e.target.value)}
          >
            {opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.propio ? "★ " : ""}
                {o.nombre} — {o.porcion} ({o.kcal} kcal)
              </option>
            ))}
          </select>
        </div>

        <div className="campo" style={{ flex: "1 1 110px" }}>
          <label htmlFor="porciones-item">Porciones</label>
          <input
            id="porciones-item"
            type="text"
            inputMode="decimal"
            ref={refPorcionesItem}
            value={porciones}
            onChange={(e) => setPorciones(e.target.value)}
          />
        </div>

        <button type="button" className="secundario" onClick={agregarItem}>
          Agregar alimento
        </button>
      </div>

      {items.length === 0 ? (
        <p className="vacio">Todavía no agregaste alimentos a esta comida.</p>
      ) : (
        <table style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Alimento</th>
              <th className="num">Porciones</th>
              <th className="num">kcal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i, indice) => (
              <tr key={`${i.valor}-${indice}`}>
                <td>{i.nombre}</td>
                <td className="num">{i.porciones}</td>
                <td className="num">{i.kcal}</td>
                <td className="num">
                  <button
                    type="button"
                    className="enlace"
                    onClick={() =>
                      setItems(items.filter((_, otro) => otro !== indice))
                    }
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <input type="hidden" name="items" value={JSON.stringify(paraEnviar)} />

      <button type="submit" disabled={pendiente} style={{ marginTop: "0.75rem" }}>
        {pendiente ? "Guardando..." : "Guardar comida"}
      </button>
    </form>
  );
}
