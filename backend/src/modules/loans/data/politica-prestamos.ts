import {
  CATALOGO_NIVELES,
  DefinicionNivel,
  obtenerNivel,
} from '../../cards/data/catalogo-niveles';
import { NivelTarjeta } from '../../cards/enums/nivel-tarjeta.enum';

export const MONTO_MINIMO = 2000;
export const SALDO_MINIMO_ELEGIBLE = 1000;
export const MAX_PRESTAMOS_ACTIVOS = 2;

export const FACTOR_SIN_TARJETA = 1;
export const TOPE_SIN_TARJETA = 20000;

export const TASA_BASE_ANUAL = 28;
export const REDUCCION_TASA_POR_NIVEL = 4;

export const PLAZOS_DISPONIBLES = [6, 12, 24, 36];

export const ESCALONES_SUGERIDOS = [
  2000, 5000, 10000, 20000, 50000, 100000, 250000, 500000,
];

export interface PerfilPrestamo {
  nivel: NivelTarjeta | null;
  nombrePerfil: string;
  factor: number;
  tope: number;
  tasaAnual: number;
  color: string;
}

export function perfilDeNivel(nivel: NivelTarjeta | null): PerfilPrestamo {
  if (!nivel) {
    return {
      nivel: null,
      nombrePerfil: 'Sin tarjeta de crédito',
      factor: FACTOR_SIN_TARJETA,
      tope: TOPE_SIN_TARJETA,
      tasaAnual: TASA_BASE_ANUAL,
      color: 'debito',
    };
  }

  const definicion = obtenerNivel(nivel) as DefinicionNivel;
  const posicion = CATALOGO_NIVELES.findIndex(
    (item) => item.nivel === definicion.nivel,
  );

  return {
    nivel: definicion.nivel,
    nombrePerfil: `Tarjeta ${definicion.nombre}`,
    factor: definicion.factorLinea,
    tope: definicion.lineaMaxima,
    tasaAnual: TASA_BASE_ANUAL - REDUCCION_TASA_POR_NIVEL * (posicion + 1),
    color: definicion.color,
  };
}

export function nivelMasAlto(niveles: NivelTarjeta[]): NivelTarjeta | null {
  let mejor: NivelTarjeta | null = null;
  let mejorPosicion = -1;

  for (const nivel of niveles) {
    const posicion = CATALOGO_NIVELES.findIndex((item) => item.nivel === nivel);
    if (posicion > mejorPosicion) {
      mejorPosicion = posicion;
      mejor = nivel;
    }
  }

  return mejor;
}

export function calcularLimite(saldo: number, perfil: PerfilPrestamo): number {
  if (saldo < SALDO_MINIMO_ELEGIBLE) {
    return 0;
  }

  const limite = Math.min(saldo * perfil.factor, perfil.tope);
  return Math.floor(limite / 100) * 100;
}

export function montosSugeridos(limite: number): number[] {
  const sugeridos = ESCALONES_SUGERIDOS.filter(
    (monto) => monto >= MONTO_MINIMO && monto <= limite,
  );

  if (limite >= MONTO_MINIMO && !sugeridos.includes(limite)) {
    sugeridos.push(limite);
  }

  return sugeridos.slice(-5);
}

export function calcularPagoMensual(
  monto: number,
  plazoMeses: number,
  tasaAnual: number,
): number {
  const tasaMensual = tasaAnual / 100 / 12;

  if (tasaMensual === 0) {
    return Math.round((monto / plazoMeses) * 100) / 100;
  }

  const factor = Math.pow(1 + tasaMensual, plazoMeses);
  const pago = (monto * tasaMensual * factor) / (factor - 1);

  return Math.round(pago * 100) / 100;
}

export const DIAS_ENTRE_PAGOS = 30;

export function siguienteFechaPago(desde: Date, periodos = 1): Date {
  const fecha = new Date(desde.getTime());
  fecha.setDate(fecha.getDate() + DIAS_ENTRE_PAGOS * periodos);
  return fecha;
}

export function interesDelPeriodo(
  capitalPendiente: number,
  tasaAnual: number,
): number {
  return Math.round(((capitalPendiente * (tasaAnual / 100)) / 12) * 100) / 100;
}
