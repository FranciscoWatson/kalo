/**
 * Catalogo de alimentos predefinido de la V1.
 *
 * Es de solo lectura: en V1 el usuario no puede dar de alta alimentos propios
 * (eso corresponde a la V2). Los valores son por porcion de referencia.
 */

export interface Alimento {
  id: string;
  nombre: string;
  porcion: string;
  kcal: number;
  proteina: number;
  grasa: number;
  carbohidrato: number;
}

export const CATALOGO: Alimento[] = [
  // Proteinas
  { id: "pollo-pechuga", nombre: "Pechuga de pollo", porcion: "150 g", kcal: 248, proteina: 46.5, grasa: 5.4, carbohidrato: 0 },
  { id: "carne-magra", nombre: "Carne vacuna magra", porcion: "150 g", kcal: 300, proteina: 39, grasa: 15, carbohidrato: 0 },
  { id: "merluza", nombre: "Filete de merluza", porcion: "150 g", kcal: 137, proteina: 27.5, grasa: 2.4, carbohidrato: 0 },
  { id: "atun-agua", nombre: "Atún al natural", porcion: "1 lata (120 g)", kcal: 128, proteina: 28, grasa: 1.2, carbohidrato: 0 },
  { id: "huevo", nombre: "Huevo entero", porcion: "1 unidad (55 g)", kcal: 78, proteina: 6.3, grasa: 5.3, carbohidrato: 0.6 },
  { id: "clara-huevo", nombre: "Clara de huevo", porcion: "1 unidad (33 g)", kcal: 17, proteina: 3.6, grasa: 0.1, carbohidrato: 0.2 },
  { id: "milanesa-carne", nombre: "Milanesa de carne al horno", porcion: "1 unidad (120 g)", kcal: 285, proteina: 24, grasa: 14, carbohidrato: 15 },

  // Lacteos
  { id: "leche-descremada", nombre: "Leche descremada", porcion: "1 taza (200 ml)", kcal: 70, proteina: 6.8, grasa: 0.4, carbohidrato: 9.8 },
  { id: "yogur-natural", nombre: "Yogur natural descremado", porcion: "1 pote (190 g)", kcal: 95, proteina: 9.5, grasa: 0.6, carbohidrato: 13 },
  { id: "queso-port-salut", nombre: "Queso port salut light", porcion: "1 feta (30 g)", kcal: 72, proteina: 5.4, grasa: 4.8, carbohidrato: 1.2 },
  { id: "ricota", nombre: "Ricota descremada", porcion: "100 g", kcal: 138, proteina: 11, grasa: 8, carbohidrato: 4 },

  // Carbohidratos
  { id: "arroz-cocido", nombre: "Arroz blanco cocido", porcion: "1 taza (180 g)", kcal: 234, proteina: 4.9, grasa: 0.5, carbohidrato: 51.5 },
  { id: "fideos-cocidos", nombre: "Fideos cocidos", porcion: "1 plato (200 g)", kcal: 262, proteina: 9.2, grasa: 1.3, carbohidrato: 51 },
  { id: "papa-hervida", nombre: "Papa hervida", porcion: "1 mediana (150 g)", kcal: 130, proteina: 3, grasa: 0.2, carbohidrato: 29.5 },
  { id: "batata", nombre: "Batata al horno", porcion: "1 mediana (150 g)", kcal: 135, proteina: 2.4, grasa: 0.2, carbohidrato: 31.5 },
  { id: "pan-integral", nombre: "Pan integral", porcion: "1 rebanada (30 g)", kcal: 74, proteina: 3.2, grasa: 1, carbohidrato: 12.5 },
  { id: "avena", nombre: "Avena arrollada", porcion: "40 g", kcal: 152, proteina: 5.4, grasa: 2.8, carbohidrato: 26 },
  { id: "lentejas", nombre: "Lentejas cocidas", porcion: "1 taza (200 g)", kcal: 232, proteina: 18, grasa: 0.8, carbohidrato: 40 },

  // Frutas y verduras
  { id: "banana", nombre: "Banana", porcion: "1 unidad (120 g)", kcal: 107, proteina: 1.3, grasa: 0.4, carbohidrato: 27 },
  { id: "manzana", nombre: "Manzana", porcion: "1 unidad (180 g)", kcal: 94, proteina: 0.5, grasa: 0.3, carbohidrato: 25 },
  { id: "naranja", nombre: "Naranja", porcion: "1 unidad (150 g)", kcal: 71, proteina: 1.4, grasa: 0.2, carbohidrato: 17.6 },
  { id: "ensalada-mixta", nombre: "Ensalada mixta", porcion: "1 plato (200 g)", kcal: 45, proteina: 2, grasa: 0.4, carbohidrato: 8 },
  { id: "brocoli", nombre: "Brócoli cocido", porcion: "1 taza (150 g)", kcal: 51, proteina: 4.2, grasa: 0.6, carbohidrato: 10 },
  { id: "tomate", nombre: "Tomate", porcion: "1 unidad (120 g)", kcal: 22, proteina: 1.1, grasa: 0.2, carbohidrato: 4.7 },

  // Grasas y otros
  { id: "aceite-oliva", nombre: "Aceite de oliva", porcion: "1 cucharada (10 ml)", kcal: 90, proteina: 0, grasa: 10, carbohidrato: 0 },
  { id: "palta", nombre: "Palta", porcion: "1/2 unidad (100 g)", kcal: 160, proteina: 2, grasa: 14.7, carbohidrato: 8.5 },
  { id: "almendras", nombre: "Almendras", porcion: "30 g", kcal: 174, proteina: 6.4, grasa: 15, carbohidrato: 6.5 },
  { id: "mani", nombre: "Maní tostado", porcion: "30 g", kcal: 170, proteina: 7.7, grasa: 14.7, carbohidrato: 4.8 },

  // Ultraprocesados (utiles para probar el estado "Excedido")
  { id: "pizza-muzzarella", nombre: "Porción de pizza de muzzarella", porcion: "1 porción (130 g)", kcal: 340, proteina: 14, grasa: 15, carbohidrato: 37 },
  { id: "alfajor", nombre: "Alfajor de chocolate", porcion: "1 unidad (60 g)", kcal: 265, proteina: 3, grasa: 12, carbohidrato: 36 },
  { id: "gaseosa", nombre: "Gaseosa cola", porcion: "1 vaso (250 ml)", kcal: 105, proteina: 0, grasa: 0, carbohidrato: 26.5 },
  { id: "hamburguesa-completa", nombre: "Hamburguesa completa", porcion: "1 unidad (220 g)", kcal: 540, proteina: 27, grasa: 28, carbohidrato: 44 },
];

export function buscarAlimento(id: string): Alimento | undefined {
  return CATALOGO.find((a) => a.id === id);
}
