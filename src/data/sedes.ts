import type { Sede } from '../types';

/**
 * El restaurante opera en un solo local. El modelo conserva `sedeId` en cada
 * registro, así que abrir una segunda sede más adelante no exige migrar datos.
 */
export const SEDE_PRINCIPAL = 'sede-monteria';

export const sedesIniciales: Sede[] = [
  {
    id: SEDE_PRINCIPAL,
    nombre: 'Don Chorizo Montería',
    direccion: 'Carrera 6 # 29-40, Centro, Montería, Córdoba',
    telefono: '604 789 1234',
  },
];
