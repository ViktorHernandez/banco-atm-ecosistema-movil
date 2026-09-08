export function generarCvv(): string {
  return Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
}

export function calcularVigencia(desde: Date = new Date(), anios = 4): string {
  const vencimiento = new Date(
    Date.UTC(desde.getUTCFullYear() + anios, desde.getUTCMonth() + 1, 0),
  );
  return vencimiento.toISOString().slice(0, 10);
}
