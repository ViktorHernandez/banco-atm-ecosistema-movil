import { NivelTarjeta } from '../enums/nivel-tarjeta.enum';

export interface DefinicionNivel {
  nivel: NivelTarjeta;
  nombre: string;
  saldoMinimo: number;
  factorLinea: number;
  lineaMaxima: number;
  anualidad: number;
  color: string;
  beneficios: string[];
}

export const CATALOGO_NIVELES: DefinicionNivel[] = [
  {
    nivel: NivelTarjeta.CLASICA,
    nombre: 'Clásica',
    saldoMinimo: 3000,
    factorLinea: 1.5,
    lineaMaxima: 15000,
    anualidad: 0,
    color: 'acero',
    beneficios: [
      'Sin anualidad el primer año',
      'Hasta 45 días sin intereses',
      'Seguro de protección de compras',
      'Consulta de movimientos en los tres canales',
    ],
  },
  {
    nivel: NivelTarjeta.ORO,
    nombre: 'Oro',
    saldoMinimo: 15000,
    factorLinea: 2,
    lineaMaxima: 60000,
    anualidad: 900,
    color: 'oro',
    beneficios: [
      'Todo lo de la Clásica',
      '2 % de bonificación en supermercado y gasolina',
      'Seguro de viaje para el titular',
      'Meses sin intereses en comercios participantes',
    ],
  },
  {
    nivel: NivelTarjeta.PLATINO,
    nombre: 'Platino',
    saldoMinimo: 50000,
    factorLinea: 2.5,
    lineaMaxima: 200000,
    anualidad: 2400,
    color: 'platino',
    beneficios: [
      'Todo lo de la Oro',
      'Acceso a salas VIP de aeropuerto (4 visitas al año)',
      'Seguro de auto de renta y de equipaje',
      'Atención telefónica prioritaria las 24 horas',
    ],
  },
  {
    nivel: NivelTarjeta.INFINITE,
    nombre: 'Infinite',
    saldoMinimo: 150000,
    factorLinea: 3,
    lineaMaxima: 750000,
    anualidad: 6500,
    color: 'obsidiana',
    beneficios: [
      'Todo lo de la Platino',
      'Salas VIP ilimitadas para el titular y un acompañante',
      'Concierge personal y asistencia en viajes',
      'Programa de puntos con acumulación acelerada',
      'Seguro médico internacional',
    ],
  },
];

export function obtenerNivel(nivel: NivelTarjeta): DefinicionNivel | undefined {
  return CATALOGO_NIVELES.find((definicion) => definicion.nivel === nivel);
}

export function nivelRecomendado(saldo: number): DefinicionNivel | null {
  for (let i = CATALOGO_NIVELES.length - 1; i >= 0; i -= 1) {
    if (saldo >= CATALOGO_NIVELES[i].saldoMinimo) {
      return CATALOGO_NIVELES[i];
    }
  }
  return null;
}

export function calcularLineaCredito(
  saldo: number,
  definicion: DefinicionNivel,
): number {
  const linea = Math.min(saldo * definicion.factorLinea, definicion.lineaMaxima);
  return Math.round(linea / 100) * 100;
}
