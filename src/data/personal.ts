import type { Empleado } from '../types';

export const empleadosIniciales: Empleado[] = [
  { id: 'emp-1', nombre: 'Laura Restrepo', cargo: 'Administradora', salarioMensual: 2600000, activo: true, sedeId: 'sede-centro' },
  { id: 'emp-2', nombre: 'Andrés Gómez', cargo: 'Jefe de cocina', salarioMensual: 2200000, activo: true, sedeId: 'sede-centro' },
  { id: 'emp-3', nombre: 'Valentina Ruiz', cargo: 'Cajera', salarioMensual: 1500000, activo: true, sedeId: 'sede-centro' },
  { id: 'emp-4', nombre: 'Julián Torres', cargo: 'Parrillero', salarioMensual: 1600000, activo: true, sedeId: 'sede-norte' },
  { id: 'emp-5', nombre: 'Daniela Peña', cargo: 'Domicilios', salarioMensual: 1450000, activo: true, sedeId: 'sede-norte' },
  { id: 'emp-6', nombre: 'Camilo Herrera', cargo: 'Administrador', salarioMensual: 2400000, activo: true, sedeId: 'sede-norte' },
];
