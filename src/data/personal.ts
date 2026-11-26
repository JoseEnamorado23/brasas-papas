import type { Empleado } from '../types';
import { SEDE_PRINCIPAL } from './sedes';

const e = (id: string, nombre: string, cargo: string, salarioMensual: number): Empleado => ({
  id,
  nombre,
  cargo,
  salarioMensual,
  activo: true,
  sedeId: SEDE_PRINCIPAL,
});

export const empleadosIniciales: Empleado[] = [
  e('emp-1', 'Laura Espitia', 'Administradora', 2600000),
  e('emp-2', 'Andrés Lugo', 'Jefe de cocina', 2200000),
  e('emp-3', 'Valentina Ruiz', 'Cajera', 1500000),
  e('emp-4', 'Julián Pacheco', 'Pizzero', 1600000),
  e('emp-5', 'Yuranis Martínez', 'Auxiliar de cocina', 1423500),
  e('emp-6', 'Camilo Negrete', 'Mesero', 1423500),
  e('emp-7', 'Daniela Sotelo', 'Mesera', 1423500),
  e('emp-8', 'Esteban Arrieta', 'Mesero', 1423500),
];

/** Personal que atiende mesas: alimenta los selectores de mesero. */
export const esMesero = (empleado: Empleado): boolean =>
  empleado.activo && /^meser/i.test(empleado.cargo);
