/**
 * Catalogo de ejercicios de la V2.
 *
 * Es de solo lectura, como el catalogo de alimentos: el usuario no puede dar de
 * alta ejercicios propios. El MET es el equivalente metabolico de cada
 * actividad, y de el sale el gasto calorico (seccion 2.1 de las HU V2).
 */

export interface Ejercicio {
  id: string;
  nombre: string;
  met: number;
}

export const EJERCICIOS: Ejercicio[] = [
  { id: "caminata", nombre: "Caminata", met: 3.5 },
  { id: "trote", nombre: "Trote suave", met: 8.0 },
  { id: "correr", nombre: "Correr", met: 11.0 },
  { id: "bicicleta", nombre: "Bicicleta", met: 7.5 },
  { id: "natacion", nombre: "Natación", met: 8.0 },
  { id: "musculacion", nombre: "Musculación", met: 5.0 },
  { id: "funcional", nombre: "Funcional / HIIT", met: 9.0 },
  { id: "futbol", nombre: "Fútbol", met: 7.0 },
  { id: "tenis", nombre: "Tenis", met: 7.3 },
  { id: "yoga", nombre: "Yoga", met: 3.0 },
  { id: "eliptico", nombre: "Elíptico", met: 6.5 },
  { id: "baile", nombre: "Baile", met: 5.5 },
];

export function buscarEjercicio(id: string): Ejercicio | undefined {
  return EJERCICIOS.find((e) => e.id === id);
}
