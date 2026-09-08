import {
  DefinicionIntencion,
  INTENCIONES,
  SINONIMOS,
} from '../data/base-conocimiento';

const VACIAS = new Set([
  'a', 'al', 'algo', 'como', 'con', 'cual', 'cuales', 'de', 'del', 'donde',
  'el', 'en', 'es', 'esta', 'este', 'hay', 'la', 'las', 'lo', 'los', 'me',
  'mi', 'mis', 'para', 'por', 'puedo', 'que', 'se', 'si', 'su',
  'un', 'una', 'y', 'yo', 'the', 'my', 'i', 'is', 'what', 'how',
  'where', 'do', 'can', 'to', 'of',
]);

export function normalizar(texto: string): string {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((palabra) => palabra.length > 1 && !VACIAS.has(palabra))
    .map((palabra) => SINONIMOS[palabra] || palabra);
}

function distancia(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = [];

  for (let i = 0; i < filas; i += 1) {
    matriz[i] = [i];
  }
  for (let j = 0; j < columnas; j += 1) {
    matriz[0][j] = j;
  }

  for (let i = 1; i < filas; i += 1) {
    for (let j = 1; j < columnas; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo,
      );
    }
  }

  return matriz[filas - 1][columnas - 1];
}

function prefijoComun(a: string, b: string): number {
  const tope = Math.min(a.length, b.length);
  let comunes = 0;
  while (comunes < tope && a[comunes] === b[comunes]) {
    comunes += 1;
  }
  return comunes;
}

function pareceIgual(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  const menor = Math.min(a.length, b.length);
  const comunes = prefijoComun(a, b);
  if (menor >= 5 && comunes >= 6 && comunes >= menor - 3) {
    return true;
  }
  const limite = Math.min(a.length, b.length) <= 6 ? 1 : 2;
  if (Math.abs(a.length - b.length) > limite) {
    return false;
  }
  return distancia(a, b) <= limite;
}

function puntuar(
  intencion: DefinicionIntencion,
  consulta: string,
  palabras: string[],
): number {
  let puntos = 0;

  for (const disparador of intencion.disparadores) {
    const normalizado = normalizar(disparador);

    if (consulta === normalizado) {
      puntos += 12;
      continue;
    }
    if (consulta.includes(normalizado) && normalizado.split(' ').length > 1) {
      puntos += 8;
      continue;
    }

    const palabrasDisparador = tokenizar(disparador);
    if (!palabrasDisparador.length) {
      continue;
    }

    let coincidencias = 0;
    for (const termino of palabrasDisparador) {
      if (palabras.some((palabra) => pareceIgual(palabra, termino))) {
        coincidencias += 1;
      }
    }

    if (coincidencias > 0) {
      puntos += (coincidencias / palabrasDisparador.length) * 5;
      if (coincidencias === palabrasDisparador.length) {
        puntos += 2;
      }
    }
  }

  if (intencion.obligatorias) {
    for (const grupo of intencion.obligatorias) {
      const presente = grupo.some((termino) =>
        palabras.some((palabra) => pareceIgual(palabra, termino)),
      );
      if (!presente) {
        return 0;
      }
    }
    puntos += 3;
  }

  return puntos;
}

export interface Coincidencia {
  intencion: DefinicionIntencion;
  puntos: number;
}

export function reconocer(
  texto: string,
  alcancesPermitidos: string[],
): Coincidencia | null {
  const consulta = normalizar(texto);
  const palabras = tokenizar(texto);

  if (!consulta) {
    return null;
  }

  const candidatas = INTENCIONES.filter((intencion) =>
    alcancesPermitidos.includes(intencion.alcance),
  )
    .map((intencion) => ({
      intencion,
      puntos: puntuar(intencion, consulta, palabras),
    }))
    .filter((item) => item.puntos >= 4)
    .sort((a, b) => b.puntos - a.puntos);

  return candidatas.length ? candidatas[0] : null;
}

export function intencionesFueraDeAlcance(
  texto: string,
  alcancesPermitidos: string[],
): DefinicionIntencion | null {
  const consulta = normalizar(texto);
  const palabras = tokenizar(texto);

  const fuera = INTENCIONES.filter(
    (intencion) => !alcancesPermitidos.includes(intencion.alcance),
  )
    .map((intencion) => ({
      intencion,
      puntos: puntuar(intencion, consulta, palabras),
    }))
    .filter((item) => item.puntos >= 4)
    .sort((a, b) => b.puntos - a.puntos);

  return fuera.length ? fuera[0].intencion : null;
}
