import type {
  CanalVenta,
  ClienteFactura,
  EstadoApp,
  Factura,
  FormaPagoVenta,
  Pago,
  TipoDocumento,
  Venta,
} from '../types';
import { CONSUMIDOR_FINAL, RESOLUCIONES } from '../data/facturacion';
import { hoyISO, parseFecha } from './formato';

/** Lo que la caja decide al cobrar: tipo de documento, comprador, propina y pagos. */
export interface DatosCobro {
  documento: TipoDocumento;
  cliente?: ClienteFactura;
  propina: number;
  pagos: Pago[];
}

/**
 * Huella hexadecimal de 96 caracteres con el aspecto de un CUDE/CUFE (SHA-384).
 * No es criptográfica: en producción el código lo calcula el proveedor
 * tecnológico con la clave técnica de la resolución.
 */
export function codigoUnicoSimulado(semilla: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let salida = '';
  for (let ronda = 0; salida.length < 96; ronda += 1) {
    const texto = `${semilla}|${ronda}`;
    for (let i = 0; i < texto.length; i += 1) {
      h1 = Math.imul(h1 ^ texto.charCodeAt(i), 0x01000193) >>> 0;
      h2 = Math.imul(h2 + texto.charCodeAt(i), 0x5bd1e995) >>> 0;
    }
    salida += h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }
  return salida.slice(0, 96);
}

/** URL de consulta pública de la DIAN que va codificada en el QR del documento. */
export const urlConsultaDian = (codigo: string): string =>
  `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${codigo}`;

export const resumenFormaPago = (pagos: Pago[]): FormaPagoVenta =>
  pagos.length === 1 ? pagos[0].medio : 'Mixto';

export interface EntradaFactura {
  venta: Venta;
  documento: TipoDocumento;
  cliente?: ClienteFactura;
  pagos: Pago[];
  referencia?: string;
  atendio?: string;
}

/** Emite el documento electrónico de una venta y lo enlaza con ella. */
export function emitirFactura(estado: EstadoApp, entrada: EntradaFactura): EstadoApp {
  const { venta, documento } = entrada;
  const res = RESOLUCIONES[documento];
  const numero = res.desde + estado.facturas.filter((f) => f.tipo === documento).length;
  const id = `${res.prefijo}-${numero}`;
  // Ventas de días anteriores (la demo precargada) se fechan en la noche de su día.
  const emitidaTs =
    venta.fecha === hoyISO()
      ? Date.now()
      : parseFecha(venta.fecha).getTime() + (18 * 60 + (numero % 240)) * 60000;

  const cliente =
    documento === 'FE' && entrada.cliente ? entrada.cliente : entrada.cliente ?? CONSUMIDOR_FINAL;

  const factura: Factura = {
    id,
    tipo: documento,
    prefijo: res.prefijo,
    numero,
    fecha: venta.fecha,
    emitidaTs,
    ventaId: venta.id,
    cliente,
    lineas: venta.lineas,
    base: venta.base,
    impuesto: venta.impuesto,
    domicilio: venta.domicilio,
    propina: venta.propina,
    total: venta.total + venta.propina,
    pagos: entrada.pagos,
    formaPago: venta.formaPago,
    codigoUnico: codigoUnicoSimulado(`${id}|${venta.id}|${venta.total}|${cliente.numero}`),
    canal: venta.canal as CanalVenta,
    referencia: entrada.referencia,
    atendio: entrada.atendio,
  };

  return {
    ...estado,
    facturas: [...estado.facturas, factura],
    ventas: estado.ventas.map((v) => (v.id === venta.id ? { ...v, facturaId: id } : v)),
  };
}
