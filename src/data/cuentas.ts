import type { CategoriaGasto, Cuenta } from '../types';

/** Impuesto al consumo aplicado a la venta de alimentos preparados (Colombia). */
export const IMPUESTO_CONSUMO = 0.08;

/** Deducción de nómina a cargo del empleado (salud + pensión), aproximada. */
export const TASA_DEDUCCION_NOMINA = 0.08;

/** Códigos del plan de cuentas usados por el motor, con nombre legible. */
export const CTA = {
  CAJA: 1105,
  BANCOS: 1110,
  CXC_PLATAFORMAS: 1330,
  INVENTARIO: 1435,
  EQUIPO: 1524,
  PROVEEDORES: 2205,
  DEDUCCIONES_NOMINA: 2370,
  PROPINAS: 2380,
  IMPUESTO_CONSUMO: 2408,
  CAPITAL: 3115,
  INGRESOS: 4140,
  INGRESOS_DOMICILIO: 4145,
  GASTO_PERSONAL: 5105,
  GASTO_ARRIENDO: 5120,
  GASTO_SERVICIOS: 5135,
  GASTO_MERCADEO: 5140,
  GASTO_MANTENIMIENTO: 5145,
  GASTO_REPARTO: 5150,
  GASTO_COMISIONES: 5160,
  GASTO_OTROS: 5195,
  COSTO_VENTAS: 6135,
} as const;

export const catalogoCuentas: Cuenta[] = [
  { id: CTA.CAJA, nombre: 'Caja general', tipo: 'Activo' },
  { id: CTA.BANCOS, nombre: 'Bancos', tipo: 'Activo' },
  { id: CTA.CXC_PLATAFORMAS, nombre: 'Cuentas por cobrar plataformas', tipo: 'Activo' },
  { id: CTA.INVENTARIO, nombre: 'Inventario de insumos', tipo: 'Activo' },
  { id: CTA.EQUIPO, nombre: 'Equipo de cocina', tipo: 'Activo' },
  { id: CTA.PROVEEDORES, nombre: 'Proveedores nacionales', tipo: 'Pasivo' },
  { id: CTA.DEDUCCIONES_NOMINA, nombre: 'Deducciones de nómina por pagar', tipo: 'Pasivo' },
  { id: CTA.PROPINAS, nombre: 'Propinas por pagar a empleados', tipo: 'Pasivo' },
  { id: CTA.IMPUESTO_CONSUMO, nombre: 'Impuesto al consumo por pagar', tipo: 'Pasivo' },
  { id: CTA.CAPITAL, nombre: 'Capital social', tipo: 'Patrimonio' },
  { id: CTA.INGRESOS, nombre: 'Ingresos por ventas', tipo: 'Ingreso' },
  { id: CTA.INGRESOS_DOMICILIO, nombre: 'Ingresos por domicilios', tipo: 'Ingreso' },
  { id: CTA.GASTO_PERSONAL, nombre: 'Gastos de personal', tipo: 'Gasto' },
  { id: CTA.GASTO_ARRIENDO, nombre: 'Arrendamientos', tipo: 'Gasto' },
  { id: CTA.GASTO_SERVICIOS, nombre: 'Servicios públicos', tipo: 'Gasto' },
  { id: CTA.GASTO_MERCADEO, nombre: 'Mercadeo y publicidad', tipo: 'Gasto' },
  { id: CTA.GASTO_MANTENIMIENTO, nombre: 'Mantenimiento y reparaciones', tipo: 'Gasto' },
  { id: CTA.GASTO_REPARTO, nombre: 'Gastos de reparto', tipo: 'Gasto' },
  { id: CTA.GASTO_COMISIONES, nombre: 'Comisiones de plataformas', tipo: 'Gasto' },
  { id: CTA.GASTO_OTROS, nombre: 'Gastos diversos', tipo: 'Gasto' },
  { id: CTA.COSTO_VENTAS, nombre: 'Costo de ventas', tipo: 'Gasto' },
];

/** A qué cuenta de gasto va cada categoría del formulario de gastos. */
export const cuentaPorCategoriaGasto: Record<CategoriaGasto, number> = {
  Arrendamiento: CTA.GASTO_ARRIENDO,
  'Servicios públicos': CTA.GASTO_SERVICIOS,
  Mercadeo: CTA.GASTO_MERCADEO,
  Mantenimiento: CTA.GASTO_MANTENIMIENTO,
  Otros: CTA.GASTO_OTROS,
};

export const CATEGORIAS_GASTO: CategoriaGasto[] = [
  'Arrendamiento',
  'Servicios públicos',
  'Mercadeo',
  'Mantenimiento',
  'Otros',
];

/** Efectivo entra a caja; Nequi, Daviplata, Bre-B, tarjeta y transferencias, a bancos. */
export const cuentaCaja = (medio: string): number => (medio === 'Efectivo' ? CTA.CAJA : CTA.BANCOS);

/** Propina sugerida en servicio a la mesa. Es voluntaria: el cliente puede quitarla. */
export const PROPINA_SUGERIDA = 0.1;
