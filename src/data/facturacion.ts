import type { ClienteFactura, MedioPago, TipoDocumento } from '../types';

/**
 * Datos del emisor y de las dos resoluciones de numeración. Todo es ficticio:
 * en producción salen del RUT del restaurante y de la habilitación ante la DIAN
 * que hace el proveedor tecnológico.
 */
export const EMISOR = {
  razonSocial: 'Don Chorizo S.A.S.',
  nit: '901.234.567-8',
  regimen: 'Responsable de impuesto al consumo (INC 8%)',
  direccion: 'Carrera 6 # 29-40, Centro, Montería, Córdoba',
  telefono: '604 789 1234',
  correo: 'facturacion@donchorizo.co',
};

export interface Resolucion {
  tipo: TipoDocumento;
  nombre: string;
  prefijo: string;
  resolucion: string;
  fecha: string;
  desde: number;
  hasta: number;
  vigencia: string;
  /** Nombre del código único que exige la DIAN para el tipo de documento. */
  codigo: 'CUDE' | 'CUFE';
}

export const RESOLUCIONES: Record<TipoDocumento, Resolucion> = {
  POS: {
    tipo: 'POS',
    nombre: 'Documento equivalente electrónico tiquete POS',
    prefijo: 'POS',
    resolucion: '18764000000001',
    fecha: '2026-08-20',
    desde: 1001,
    hasta: 50000,
    vigencia: '24 meses',
    codigo: 'CUDE',
  },
  FE: {
    tipo: 'FE',
    nombre: 'Factura electrónica de venta',
    prefijo: 'FE',
    resolucion: '18764000000002',
    fecha: '2026-08-20',
    desde: 201,
    hasta: 10000,
    vigencia: '24 meses',
    codigo: 'CUFE',
  },
};

/** Identificación genérica que la DIAN acepta para ventas a consumidor final. */
export const CONSUMIDOR_FINAL: ClienteFactura = {
  tipoId: 'CC',
  numero: '222222222222',
  nombre: 'Consumidor final',
};

export const MEDIOS_PAGO: MedioPago[] = ['Efectivo', 'Nequi', 'Daviplata', 'Bre-B', 'Tarjeta'];
