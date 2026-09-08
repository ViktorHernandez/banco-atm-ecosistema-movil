import { createHmac, randomBytes } from 'node:crypto';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PASO_SEGUNDOS = 30;
const DIGITOS = 6;

export function generarSecreto(bytes = 20): string {
  const crudo = randomBytes(bytes);
  let bits = '';

  for (const byte of crudo) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let salida = '';

  for (let i = 0; i + 5 <= bits.length; i += 5) {
    salida += ALFABETO[parseInt(bits.slice(i, i + 5), 2)];
  }

  return salida;
}

export function decodificarBase32(secreto: string): Buffer {
  const limpio = String(secreto)
    .toUpperCase()
    .replace(/=+$/, '')
    .replace(/\s+/g, '');

  let bits = '';

  for (const caracter of limpio) {
    const indice = ALFABETO.indexOf(caracter);

    if (indice === -1) {
      throw new Error('El secreto no es Base32 válido');
    }

    bits += indice.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

export function generarCodigo(secreto: string, momento = Date.now()): string {
  const contador = Math.floor(momento / 1000 / PASO_SEGUNDOS);
  const bufferContador = Buffer.alloc(8);
  bufferContador.writeBigUInt64BE(BigInt(contador));

  const resumen = createHmac('sha1', decodificarBase32(secreto))
    .update(bufferContador)
    .digest();

  const desplazamiento = resumen[resumen.length - 1] & 0x0f;
  const binario =
    ((resumen[desplazamiento] & 0x7f) << 24) |
    ((resumen[desplazamiento + 1] & 0xff) << 16) |
    ((resumen[desplazamiento + 2] & 0xff) << 8) |
    (resumen[desplazamiento + 3] & 0xff);

  return (binario % 10 ** DIGITOS).toString().padStart(DIGITOS, '0');
}

export function verificarCodigo(
  secreto: string,
  codigo: string,
  ventana = 1,
  momento = Date.now(),
): boolean {
  const limpio = String(codigo ?? '').replace(/\s+/g, '');

  if (!new RegExp(`^\\d{${DIGITOS}}$`).test(limpio)) {
    return false;
  }

  for (let salto = -ventana; salto <= ventana; salto += 1) {
    const esperado = generarCodigo(
      secreto,
      momento + salto * PASO_SEGUNDOS * 1000,
    );

    if (esperado === limpio) {
      return true;
    }
  }

  return false;
}

export function construirUri(
  secreto: string,
  cuenta: string,
  emisor: string,
): string {
  const etiqueta = `${encodeURIComponent(emisor)}:${encodeURIComponent(cuenta)}`;
  const parametros = [
    `secret=${secreto}`,
    `issuer=${encodeURIComponent(emisor)}`,
    'algorithm=SHA1',
    `digits=${DIGITOS}`,
    `period=${PASO_SEGUNDOS}`,
  ].join('&');

  return `otpauth://totp/${etiqueta}?${parametros}`;
}
