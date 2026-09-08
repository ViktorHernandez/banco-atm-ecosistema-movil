const PARAMETROS_SENSIBLES = [
  'token',
  'access_token',
  'accessToken',
  'password',
  'pin',
  'codigo',
  'secret',
  'apiKey',
];

export function sanearRuta(ruta: string): string {
  if (!ruta) {
    return ruta;
  }

  const separador = ruta.indexOf('?');
  if (separador === -1) {
    return ruta;
  }

  const base = ruta.slice(0, separador);
  const consulta = ruta.slice(separador + 1);

  const partes = consulta.split('&').map((parte) => {
    const igual = parte.indexOf('=');
    if (igual === -1) {
      return parte;
    }
    const clave = parte.slice(0, igual);
    const sensible = PARAMETROS_SENSIBLES.some(
      (nombre) => nombre.toLowerCase() === clave.toLowerCase(),
    );
    return sensible ? `${clave}=[oculto]` : parte;
  });

  return `${base}?${partes.join('&')}`;
}
