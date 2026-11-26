const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const fechaCorta = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const fechaDia = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });

export const formatoMoneda = (valor: number): string => moneda.format(Math.round(valor));

/** Cifra abreviada para ejes y etiquetas de gráficas: $1,2M · $450k. */
export const formatoCompacto = (valor: number): string => {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 1_000) return `$${Math.round(valor / 1_000)}k`;
  return `$${Math.round(valor)}`;
};

export const parseFecha = (iso: string): Date => new Date(`${iso}T00:00:00`);

export const formatoFecha = (iso: string): string => fechaCorta.format(parseFecha(iso));

export const formatoFechaDia = (iso: string): string => fechaDia.format(parseFecha(iso));

/** Fecha local YYYY-MM-DD (toISOString usaría UTC y en Colombia saltaría de día a las 7 p. m.). */
const isoLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const hoyISO = (): string => isoLocal(new Date());

export const sumaISO = (iso: string, dias: number): string => {
  const d = parseFecha(iso);
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
};

export const folio = (prefijo: string, cantidadPrevia: number): string =>
  `${prefijo}-${String(cantidadPrevia + 1).padStart(4, '0')}`;
