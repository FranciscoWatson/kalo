/**
 * Hook de resolucion para correr los scripts con node directamente.
 * Los modulos de src/ se importan sin extension (como los resuelve Next),
 * y node en ESM necesita la extension explicita.
 */
export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (error) {
    if (especificador.startsWith(".")) {
      for (const extension of [".ts", ".tsx"]) {
        try {
          return await siguiente(especificador + extension, contexto);
        } catch {
          // Sigue probando con la extension siguiente.
        }
      }
    }
    throw error;
  }
}
