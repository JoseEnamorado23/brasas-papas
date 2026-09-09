import type { Domiciliario, Plataforma, ZonaDomicilio } from '../types';

export const domiciliariosIniciales: Domiciliario[] = [
  { id: 'dom-1', nombre: 'Óscar Marín', telefono: '311 4567890', tarifaEntrega: 3500, activo: true },
  { id: 'dom-2', nombre: 'Kevin Salas', telefono: '320 7788990', tarifaEntrega: 3500, activo: true },
  { id: 'dom-3', nombre: 'Nabor Díaz', telefono: '315 2233445', tarifaEntrega: 3800, activo: true },
];

export const plataformasIniciales: Plataforma[] = [
  { id: 'plat-rappi', nombre: 'Rappi', comisionPct: 0.22, activo: true },
  { id: 'plat-didi', nombre: 'Didi Food', comisionPct: 0.18, activo: true },
];

/** Zona de reparto y el valor de envío sugerido que se cobra al cliente. */
export const ZONAS_DOMICILIO: { zona: ZonaDomicilio; tarifa: number }[] = [
  { zona: 'Centro', tarifa: 4000 },
  { zona: 'Chapinero', tarifa: 5000 },
  { zona: 'Norte', tarifa: 6500 },
  { zona: 'Sur', tarifa: 6000 },
  { zona: 'Occidente', tarifa: 5500 },
];

export const tarifaZona = (zona: ZonaDomicilio): number =>
  ZONAS_DOMICILIO.find((z) => z.zona === zona)?.tarifa ?? 5000;
