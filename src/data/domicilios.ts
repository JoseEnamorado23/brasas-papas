import type { Domiciliario, Plataforma, ZonaDomicilio } from '../types';

export const domiciliariosIniciales: Domiciliario[] = [
  { id: 'dom-1', nombre: 'Yeison Petro', telefono: '311 456 7890', tarifaEntrega: 3000, activo: true },
  { id: 'dom-2', nombre: 'Kevin Doria', telefono: '320 778 8990', tarifaEntrega: 3000, activo: true },
  { id: 'dom-3', nombre: 'Luis Ángel Hoyos', telefono: '315 223 3445', tarifaEntrega: 3200, activo: true },
];

export const plataformasIniciales: Plataforma[] = [
  { id: 'plat-rappi', nombre: 'Rappi', comisionPct: 0.22, activo: true },
  { id: 'plat-didi', nombre: 'Didi Food', comisionPct: 0.18, activo: true },
];

/** Zonas de reparto en Montería y el valor de envío sugerido que se cobra al cliente. */
export const ZONAS_DOMICILIO: { zona: ZonaDomicilio; tarifa: number }[] = [
  { zona: 'Centro', tarifa: 3000 },
  { zona: 'Norte', tarifa: 4000 },
  { zona: 'La Castellana', tarifa: 4000 },
  { zona: 'El Recreo', tarifa: 4500 },
  { zona: 'Sur', tarifa: 4500 },
  { zona: 'Mocarí', tarifa: 5000 },
  { zona: 'La Granja', tarifa: 5000 },
];

export const tarifaZona = (zona: ZonaDomicilio): number =>
  ZONAS_DOMICILIO.find((z) => z.zona === zona)?.tarifa ?? 4000;
