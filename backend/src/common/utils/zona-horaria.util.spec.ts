import {
  esFechaValida,
  finDelDia,
  inicioDelDia,
  normalizarZona,
  ZONA_HORARIA_POR_DEFECTO,
} from './zona-horaria.util';

describe('Conversion de dias de calendario a instantes (RF-03)', () => {
  const ZONA = 'America/Mexico_City';

  it('el inicio del dia corresponde a la medianoche local, no a la de UTC', () => {
    expect(inicioDelDia('2026-08-21', ZONA).toISOString()).toBe(
      '2026-08-21T06:00:00.000Z',
    );
  });

  it('el fin del dia cubre hasta el ultimo milisegundo local', () => {
    expect(finDelDia('2026-08-21', ZONA).toISOString()).toBe(
      '2026-08-22T05:59:59.999Z',
    );
  });

  it('una operacion hecha por la noche cae dentro de su propio dia local', () => {
    const operacion = new Date('2026-08-22T02:30:00.000Z');

    expect(operacion >= inicioDelDia('2026-08-21', ZONA)).toBe(true);
    expect(operacion <= finDelDia('2026-08-21', ZONA)).toBe(true);
  });

  it('esa misma operacion queda fuera del dia anterior y del siguiente', () => {
    const operacion = new Date('2026-08-22T02:30:00.000Z');

    expect(operacion <= finDelDia('2026-08-20', ZONA)).toBe(false);
    expect(operacion >= inicioDelDia('2026-08-22', ZONA)).toBe(false);
  });

  it('respeta el horario de verano', () => {
    expect(inicioDelDia('2026-01-15', 'America/New_York').toISOString()).toBe(
      '2026-01-15T05:00:00.000Z',
    );
    expect(inicioDelDia('2026-07-15', 'America/New_York').toISOString()).toBe(
      '2026-07-15T04:00:00.000Z',
    );
  });

  it('acepta fechas validas y rechaza dias inexistentes', () => {
    expect(esFechaValida('2026-08-21')).toBe(true);
    expect(esFechaValida('2024-02-29')).toBe(true);
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('2026-13-01')).toBe(false);
    expect(esFechaValida('21/08/2026')).toBe(false);
    expect(esFechaValida('')).toBe(false);
  });

  it('vuelve a la zona por defecto si la configurada no existe', () => {
    expect(normalizarZona('Zona/Inventada')).toBe(ZONA_HORARIA_POR_DEFECTO);
    expect(normalizarZona('')).toBe(ZONA_HORARIA_POR_DEFECTO);
    expect(normalizarZona(undefined)).toBe(ZONA_HORARIA_POR_DEFECTO);
    expect(normalizarZona('America/Mexico_City')).toBe('America/Mexico_City');
  });
});
