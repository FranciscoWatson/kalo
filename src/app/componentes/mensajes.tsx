export function Mensajes({
  errores = [],
  avisos = [],
  ok,
}: {
  errores?: string[];
  avisos?: string[];
  ok?: string | null;
}) {
  return (
    <>
      {errores.map((texto) => (
        <p key={texto} className="mensaje error" role="alert">
          {texto}
        </p>
      ))}
      {avisos.map((texto) => (
        <p key={texto} className="mensaje aviso" role="status">
          {texto}
        </p>
      ))}
      {ok ? (
        <p className="mensaje ok" role="status">
          {ok}
        </p>
      ) : null}
    </>
  );
}
