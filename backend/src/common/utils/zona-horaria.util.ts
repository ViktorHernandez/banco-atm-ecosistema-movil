export const ZONA_HORARIA_POR_DEFECTO = 'America/Mexico_City';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function desfaseDeZona(instante: Date, zona: string): number {
  const formateador = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const partes: Record<string, number> = {};
  for (const parte of formateador.formatToParts(instante)) {
    if (parte.type !== 'literal') {
      partes[parte.type] = Number(parte.value);
    }
  }

  const hora = partes.hour === 24 ? 0 : partes.hour;

  const comoUtc = Date.UTC(
    partes.year,
    partes.month - 1,
    partes.day,
    hora,
    partes.minute,
    partes.second,
    instante.getUTCMilliseconds(),
  );

  return comoUtc - instante.getTime();
}

function horaLocalAInstante(
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  segundo: number,
  milisegundo: number,
  zona: string,
): Date {
  const supuesto = Date.UTC(
    anio,
    mes - 1,
    dia,
    hora,
    minuto,
    segundo,
    milisegundo,
  );

  let instante = supuesto - desfaseDeZona(new Date(supuesto), zona);
  instante = supuesto - desfaseDeZona(new Date(instante), zona);

  return new Date(instante);
}

export function esFechaValida(valor: string): boolean {
  if (!FORMATO_FECHA.test(valor)) {
    return false;
  }

  const [anio, mes, dia] = valor.split('-').map(Number);
  const referencia = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    referencia.getUTCFullYear() === anio &&
    referencia.getUTCMonth() === mes - 1 &&
    referencia.getUTCDate() === dia
  );
}

export function inicioDelDia(
  fecha: string,
  zona: string = ZONA_HORARIA_POR_DEFECTO,
): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return horaLocalAInstante(anio, mes, dia, 0, 0, 0, 0, zona);
}

export function finDelDia(
  fecha: string,
  zona: string = ZONA_HORARIA_POR_DEFECTO,
): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return horaLocalAInstante(anio, mes, dia, 23, 59, 59, 999, zona);
}

export function normalizarZona(zona?: string): string {
  if (!zona || !zona.trim()) {
    return ZONA_HORARIA_POR_DEFECTO;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona.trim() });
    return zona.trim();
  } catch {
    return ZONA_HORARIA_POR_DEFECTO;
  }
}
