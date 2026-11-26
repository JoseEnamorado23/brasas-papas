import type {
  Asiento,
  CanalDomicilio,
  CanalVenta,
  CategoriaGasto,
  Compra,
  DestinoCompra,
  DetalleAsiento,
  EstadoApp,
  EstadoPedido,
  FormaPago,
  FormaPagoCompra,
  FormaPagoDomicilio,
  Gasto,
  LineaNomina,
  LineaVenta,
  MedioPago,
  OrigenAsiento,
  PagoNomina,
  PedidoDomicilio,
  Venta,
  ZonaDomicilio,
} from '../types';
import {
  CTA,
  IMPUESTO_CONSUMO,
  TASA_DEDUCCION_NOMINA,
  cuentaCaja,
  cuentaPorCategoriaGasto,
} from '../data/cuentas';
import { CONSUMIDOR_FINAL } from '../data/facturacion';
import { folio, hoyISO } from './formato';
import { emitirFactura, resumenFormaPago, type DatosCobro } from './facturacion';
import {
  aplicarAnularLinea,
  crearComanda,
  entregarComandasDe,
  type LineaPedida,
} from './comandas';
import { aplicarCerrarMesa } from './salon';

const d = (cuenta_id: number, debito: number, credito: number): DetalleAsiento => ({
  cuenta_id,
  debito,
  credito,
});

const nuevoAsiento = (
  estado: EstadoApp,
  datos: Omit<Asiento, 'id'>,
): Asiento => ({ id: folio('AS', estado.asientos.length), ...datos });

// --- Asiento manual (solo para la apertura precargada) --------------------

export function aplicarAsientoManual(
  estado: EstadoApp,
  datos: { fecha: string; descripcion: string; origen: OrigenAsiento; detalles: DetalleAsiento[] },
): EstadoApp {
  const asiento = nuevoAsiento(estado, datos);
  return { ...estado, asientos: [...estado.asientos, asiento] };
}

// --- Venta ---------------------------------------------------------------

interface EntradaRegistro {
  lineas: LineaVenta[];
  canal: CanalVenta;
  cobro: DatosCobro;
  sedeId: string;
  fecha: string;
  descripcion: (ventaId: string) => string;
  sesionId?: string;
  referencia?: string;
  atendio?: string;
}

const lineasDeVenta = (estado: EstadoApp, pedidas: LineaPedida[]): LineaVenta[] =>
  pedidas
    .map(({ productoId, cantidad }) => {
      const producto = estado.productos.find((p) => p.id === productoId);
      if (!producto || cantidad <= 0) return null;
      return {
        productoId,
        nombre: producto.nombre,
        cantidad,
        precioUnit: producto.precio,
        costoUnit: producto.costo,
      };
    })
    .filter((l): l is LineaVenta => l !== null);

/**
 * Núcleo de toda venta cobrada en caja (mesa o mostrador): crea la venta, su
 * asiento compuesto y el documento electrónico. Los pagos deben sumar el total
 * más la propina; si no cuadran, no se registra nada.
 */
function registrarVenta(estado: EstadoApp, entrada: EntradaRegistro): EstadoApp {
  const { lineas, cobro } = entrada;
  if (!entrada.sedeId || lineas.length === 0) return estado;

  const base = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const impuesto = Math.round(base * IMPUESTO_CONSUMO);
  const total = base + impuesto;
  const propina = Math.max(0, Math.round(cobro.propina));
  const costo = lineas.reduce((s, l) => s + l.costoUnit * l.cantidad, 0);
  const pagos = cobro.pagos.filter((p) => p.monto > 0);
  const pagado = pagos.reduce((s, p) => s + p.monto, 0);
  if (pagos.length === 0 || pagado !== total + propina) return estado;

  const ventaId = folio('V', estado.ventas.length);

  // Un débito por cuenta de destino: efectivo a caja, el resto a bancos.
  const porCuenta = new Map<number, number>();
  for (const p of pagos) {
    const cta = cuentaCaja(p.medio);
    porCuenta.set(cta, (porCuenta.get(cta) ?? 0) + p.monto);
  }

  const asiento = nuevoAsiento(estado, {
    fecha: entrada.fecha,
    descripcion: entrada.descripcion(ventaId),
    origen: 'venta',
    referencia: ventaId,
    sedeId: entrada.sedeId,
    detalles: [
      ...[...porCuenta].map(([cta, monto]) => d(cta, monto, 0)),
      d(CTA.INGRESOS, 0, base),
      d(CTA.IMPUESTO_CONSUMO, 0, impuesto),
      ...(propina > 0 ? [d(CTA.PROPINAS, 0, propina)] : []),
      d(CTA.COSTO_VENTAS, costo, 0),
      d(CTA.INVENTARIO, 0, costo),
    ],
  });

  const venta: Venta = {
    id: ventaId,
    fecha: entrada.fecha,
    lineas,
    base,
    impuesto,
    total,
    costo,
    formaPago: resumenFormaPago(pagos),
    pagos,
    propina,
    canal: entrada.canal,
    domicilio: 0,
    sesionId: entrada.sesionId,
    asientoId: asiento.id,
    sedeId: entrada.sedeId,
  };

  return emitirFactura(
    { ...estado, ventas: [...estado.ventas, venta], asientos: [...estado.asientos, asiento] },
    {
      venta,
      documento: cobro.documento,
      cliente: cobro.cliente,
      pagos,
      referencia: entrada.referencia,
      atendio: entrada.atendio,
    },
  );
}

export interface EntradaVenta {
  lineas: LineaPedida[];
  /** Cobro armado en caja. Si falta, se cobra todo con `formaPago` y tiquete POS. */
  cobro?: DatosCobro;
  formaPago?: MedioPago;
  sedeId: string;
  fecha?: string;
  /** Venta de mostrador o para llevar: además de cobrarse, se envía a la cocina. */
  enviarCocina?: boolean;
  /** Solo para el histórico precargado: ventas de mesa ya cerradas. */
  canal?: Extract<CanalVenta, 'Mostrador' | 'Mesa'>;
  referencia?: string;
  atendio?: string;
}

export function aplicarVenta(estado: EstadoApp, entrada: EntradaVenta): EstadoApp {
  const lineas = lineasDeVenta(estado, entrada.lineas);
  if (lineas.length === 0) return estado;
  const base = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const cobro: DatosCobro = entrada.cobro ?? {
    documento: 'POS',
    propina: 0,
    pagos: [
      {
        medio: entrada.formaPago ?? 'Efectivo',
        monto: base + Math.round(base * IMPUESTO_CONSUMO),
      },
    ],
  };
  const forma = resumenFormaPago(cobro.pagos).toLowerCase();

  const despues = registrarVenta(estado, {
    lineas,
    canal: entrada.canal ?? 'Mostrador',
    cobro,
    sedeId: entrada.sedeId,
    fecha: entrada.fecha ?? hoyISO(),
    descripcion: (id) =>
      `Venta ${id} · ${entrada.referencia ?? 'mostrador'} (${forma})`,
    referencia: entrada.referencia ?? 'Mostrador',
    atendio: entrada.atendio,
  });
  if (despues === estado || !entrada.enviarCocina) return despues;

  const venta = despues.ventas[despues.ventas.length - 1];
  return crearComanda(despues, {
    origen: 'Mostrador',
    referencia: venta.id,
    etiqueta: `Para llevar · ${venta.id}`,
    captura: 'Caja',
    lineas: entrada.lineas,
    sedeId: entrada.sedeId,
  });
}

/**
 * Cobra la cuenta de una mesa: genera la venta, el asiento y el documento
 * electrónico, despacha lo que quedara en cocina y deja la mesa por limpiar.
 */
export function aplicarCobrarMesa(
  estado: EstadoApp,
  sesionId: string,
  cobro: DatosCobro,
): EstadoApp {
  const sesion = estado.sesiones.find((s) => s.id === sesionId);
  if (!sesion || sesion.estado !== 'Abierta' || sesion.consumo.length === 0) return estado;
  const nombreMesa = estado.mesas.find((m) => m.id === sesion.mesaId)?.nombre ?? sesion.mesaId;
  const forma = resumenFormaPago(cobro.pagos).toLowerCase();

  const lineas = lineasDeVenta(
    estado,
    sesion.consumo.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
  );

  const despues = registrarVenta(estado, {
    lineas,
    canal: 'Mesa',
    cobro,
    sedeId: sesion.sedeId,
    fecha: hoyISO(),
    descripcion: (id) => `Venta ${id} · ${nombreMesa} (${forma})`,
    sesionId,
    referencia: nombreMesa,
    atendio: sesion.mesero,
  });
  if (despues === estado) return estado;

  const ventaId = despues.ventas[despues.ventas.length - 1].id;
  const cerrado = aplicarCerrarMesa(entregarComandasDe(despues, sesionId), sesionId);
  return {
    ...cerrado,
    sesiones: cerrado.sesiones.map((s) => (s.id === sesionId ? { ...s, ventaId } : s)),
  };
}

// --- Compra ------------------------------------------------------------

export interface EntradaCompra {
  proveedor: string;
  concepto: string;
  monto: number;
  destino: DestinoCompra;
  categoriaGasto?: CategoriaGasto;
  formaPago: FormaPagoCompra;
  sedeId: string;
  fecha?: string;
}

export function aplicarCompra(estado: EstadoApp, entrada: EntradaCompra): EstadoApp {
  if (entrada.monto <= 0 || !entrada.sedeId) return estado;
  const fecha = entrada.fecha ?? hoyISO();
  const compraId = folio('C', estado.compras.length);

  const cuentaDebito =
    entrada.destino === 'Inventario'
      ? CTA.INVENTARIO
      : cuentaPorCategoriaGasto[entrada.categoriaGasto ?? 'Otros'];

  const cuentaCredito =
    entrada.formaPago === 'Crédito' ? CTA.PROVEEDORES : cuentaCaja(entrada.formaPago);

  const asiento = nuevoAsiento(estado, {
    fecha,
    descripcion: `Compra ${compraId} a ${entrada.proveedor}: ${entrada.concepto}`,
    origen: 'compra',
    referencia: compraId,
    sedeId: entrada.sedeId,
    detalles: [d(cuentaDebito, entrada.monto, 0), d(cuentaCredito, 0, entrada.monto)],
  });

  const compra: Compra = {
    id: compraId,
    fecha,
    proveedor: entrada.proveedor,
    concepto: entrada.concepto,
    monto: entrada.monto,
    destino: entrada.destino,
    categoriaGasto: entrada.categoriaGasto,
    formaPago: entrada.formaPago,
    asientoId: asiento.id,
    sedeId: entrada.sedeId,
  };

  return {
    ...estado,
    compras: [...estado.compras, compra],
    asientos: [...estado.asientos, asiento],
  };
}

// --- Gasto operativo -------------------------------------------------

export interface EntradaGasto {
  categoria: CategoriaGasto;
  concepto: string;
  monto: number;
  formaPago: FormaPago;
  sedeId: string;
  fecha?: string;
}

export function aplicarGasto(estado: EstadoApp, entrada: EntradaGasto): EstadoApp {
  if (entrada.monto <= 0 || !entrada.sedeId) return estado;
  const fecha = entrada.fecha ?? hoyISO();
  const gastoId = folio('G', estado.gastos.length);

  const asiento = nuevoAsiento(estado, {
    fecha,
    descripcion: `Gasto ${gastoId}: ${entrada.concepto} (${entrada.categoria})`,
    origen: 'gasto',
    referencia: gastoId,
    sedeId: entrada.sedeId,
    detalles: [
      d(cuentaPorCategoriaGasto[entrada.categoria], entrada.monto, 0),
      d(cuentaCaja(entrada.formaPago), 0, entrada.monto),
    ],
  });

  const gasto: Gasto = {
    id: gastoId,
    fecha,
    categoria: entrada.categoria,
    concepto: entrada.concepto,
    monto: entrada.monto,
    formaPago: entrada.formaPago,
    asientoId: asiento.id,
    sedeId: entrada.sedeId,
  };

  return {
    ...estado,
    gastos: [...estado.gastos, gasto],
    asientos: [...estado.asientos, asiento],
  };
}

// --- Nómina -------------------------------------------------------

export interface EntradaNomina {
  periodo: string;
  empleadoIds: string[];
  sedeId?: string;
  fecha?: string;
}

export function calcularLineaNomina(salarioMensual: number): {
  devengado: number;
  deducciones: number;
  neto: number;
} {
  const devengado = Math.round(salarioMensual / 2); // pago quincenal
  const deducciones = Math.round(devengado * TASA_DEDUCCION_NOMINA);
  return { devengado, deducciones, neto: devengado - deducciones };
}

export function aplicarNomina(estado: EstadoApp, entrada: EntradaNomina): EstadoApp {
  const fecha = entrada.fecha ?? hoyISO();
  const lineas: LineaNomina[] = entrada.empleadoIds
    .map((id) => estado.empleados.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((empleado) => {
      const { devengado, deducciones, neto } = calcularLineaNomina(empleado.salarioMensual);
      return {
        empleadoId: empleado.id,
        nombre: empleado.nombre,
        cargo: empleado.cargo,
        devengado,
        deducciones,
        neto,
      };
    });

  if (lineas.length === 0) return estado;

  const totalDevengado = lineas.reduce((s, l) => s + l.devengado, 0);
  const totalDeducciones = lineas.reduce((s, l) => s + l.deducciones, 0);
  const totalNeto = lineas.reduce((s, l) => s + l.neto, 0);
  const nominaId = folio('N', estado.nominas.length);

  const asiento = nuevoAsiento(estado, {
    fecha,
    descripcion: `Nómina ${nominaId} · ${entrada.periodo} (${lineas.length} empleados)`,
    origen: 'nomina',
    referencia: nominaId,
    sedeId: entrada.sedeId,
    detalles: [
      d(CTA.GASTO_PERSONAL, totalDevengado, 0),
      d(CTA.DEDUCCIONES_NOMINA, 0, totalDeducciones),
      d(CTA.BANCOS, 0, totalNeto),
    ],
  });

  const nomina: PagoNomina = {
    id: nominaId,
    fecha,
    periodo: entrada.periodo,
    lineas,
    totalDevengado,
    totalDeducciones,
    totalNeto,
    asientoId: asiento.id,
    sedeId: entrada.sedeId,
  };

  return {
    ...estado,
    nominas: [...estado.nominas, nomina],
    asientos: [...estado.asientos, asiento],
  };
}

// --- Domicilios --------------------------------------------------

export interface EntradaPedido {
  cliente: string;
  telefono: string;
  direccion: string;
  zona: ZonaDomicilio;
  canal: CanalDomicilio;
  domiciliarioId?: string;
  plataformaId?: string;
  domicilio: number; // valor del envío cobrado al cliente
  formaPago: FormaPagoDomicilio;
  lineas: { productoId: string; cantidad: number }[];
  sedeId: string;
  fecha?: string;
}

const ORDEN_ESTADOS: EstadoPedido[] = [
  'Recibido',
  'En preparación',
  'En camino',
  'Entregado',
];

export function aplicarNuevoPedido(estado: EstadoApp, entrada: EntradaPedido): EstadoApp {
  if (!entrada.sedeId) return estado;
  const lineas: LineaVenta[] = entrada.lineas
    .map(({ productoId, cantidad }) => {
      const producto = estado.productos.find((p) => p.id === productoId);
      if (!producto || cantidad <= 0) return null;
      return {
        productoId,
        nombre: producto.nombre,
        cantidad,
        precioUnit: producto.precio,
        costoUnit: producto.costo,
      };
    })
    .filter((l): l is LineaVenta => l !== null);

  if (lineas.length === 0) return estado;

  const base = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const impuesto = Math.round(base * IMPUESTO_CONSUMO);
  const costoProductos = lineas.reduce((s, l) => s + l.costoUnit * l.cantidad, 0);

  const domiciliario =
    entrada.canal === 'Propio'
      ? estado.domiciliarios.find((x) => x.id === entrada.domiciliarioId)
      : undefined;
  const plataforma =
    entrada.canal === 'Plataforma'
      ? estado.plataformas.find((x) => x.id === entrada.plataformaId)
      : undefined;

  const costoReparto = domiciliario?.tarifaEntrega ?? 0;
  const comisionPlataforma = plataforma
    ? Math.round(plataforma.comisionPct * base)
    : 0;

  const pedido: PedidoDomicilio = {
    id: folio('D', estado.pedidos.length),
    fecha: entrada.fecha ?? hoyISO(),
    creado: estado.pedidos.length + 1,
    cliente: entrada.cliente,
    telefono: entrada.telefono,
    direccion: entrada.direccion,
    zona: entrada.zona,
    canal: entrada.canal,
    domiciliarioId: entrada.domiciliarioId,
    plataformaId: entrada.plataformaId,
    lineas,
    base,
    impuesto,
    domicilio: entrada.domicilio,
    costoProductos,
    costoReparto,
    comisionPlataforma,
    formaPago: entrada.canal === 'Plataforma' ? 'Plataforma' : entrada.formaPago,
    estado: 'Recibido',
    sedeId: entrada.sedeId,
  };

  return { ...estado, pedidos: [...estado.pedidos, pedido] };
}

function entregarPedido(estado: EstadoApp, pedido: PedidoDomicilio): EstadoApp {
  const ventaId = folio('V', estado.ventas.length);
  const { base, impuesto, domicilio, costoProductos, costoReparto, comisionPlataforma } = pedido;

  let detalles: DetalleAsiento[];
  let totalVenta: number;
  let domicilioVenta: number;

  if (pedido.canal === 'Propio') {
    const cuentaCobro = cuentaCaja(pedido.formaPago);
    const total = base + impuesto + domicilio;
    detalles = [
      d(cuentaCobro, total, 0),
      d(CTA.INGRESOS, 0, base),
      d(CTA.IMPUESTO_CONSUMO, 0, impuesto),
      d(CTA.INGRESOS_DOMICILIO, 0, domicilio),
      d(CTA.COSTO_VENTAS, costoProductos, 0),
      d(CTA.INVENTARIO, 0, costoProductos),
      d(CTA.GASTO_REPARTO, costoReparto, 0),
      d(cuentaCobro, 0, costoReparto),
    ];
    totalVenta = total;
    domicilioVenta = domicilio;
  } else {
    // Plataforma: cobra al cliente en la app y nos remite (base + impuesto) menos comisión.
    const neto = base + impuesto - comisionPlataforma;
    detalles = [
      d(CTA.CXC_PLATAFORMAS, neto, 0),
      d(CTA.GASTO_COMISIONES, comisionPlataforma, 0),
      d(CTA.INGRESOS, 0, base),
      d(CTA.IMPUESTO_CONSUMO, 0, impuesto),
      d(CTA.COSTO_VENTAS, costoProductos, 0),
      d(CTA.INVENTARIO, 0, costoProductos),
    ];
    totalVenta = base + impuesto;
    domicilioVenta = 0;
  }

  const asiento = nuevoAsiento(estado, {
    fecha: pedido.fecha,
    descripcion: `Domicilio ${pedido.id} entregado a ${pedido.cliente} (${pedido.canal.toLowerCase()})`,
    origen: 'domicilio',
    referencia: pedido.id,
    sedeId: pedido.sedeId,
    detalles,
  });

  const venta: Venta = {
    id: ventaId,
    fecha: pedido.fecha,
    lineas: pedido.lineas,
    base,
    impuesto,
    total: totalVenta,
    costo: costoProductos,
    formaPago: pedido.formaPago,
    pagos:
      pedido.formaPago === 'Plataforma' ? [] : [{ medio: pedido.formaPago, monto: totalVenta }],
    propina: 0,
    canal: 'Domicilio',
    domicilio: domicilioVenta,
    pedidoId: pedido.id,
    asientoId: asiento.id,
    sedeId: pedido.sedeId,
  };

  const conVenta: EstadoApp = {
    ...estado,
    ventas: [...estado.ventas, venta],
    asientos: [...estado.asientos, asiento],
    pedidos: estado.pedidos.map((p) =>
      p.id === pedido.id
        ? { ...p, estado: 'Entregado', ventaId, asientoId: asiento.id }
        : p,
    ),
  };

  // Todo domicilio entregado sale con su tiquete POS a nombre del cliente.
  return emitirFactura(conVenta, {
    venta,
    documento: 'POS',
    cliente: { ...CONSUMIDOR_FINAL, nombre: pedido.cliente },
    pagos: venta.pagos ?? [],
    referencia: 'Domicilio ' + pedido.id + (pedido.canal === 'Plataforma' ? ' (plataforma)' : ''),
  });
}

export function aplicarAvancePedido(estado: EstadoApp, pedidoId: string): EstadoApp {
  const pedido = estado.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) return estado;
  const idx = ORDEN_ESTADOS.indexOf(pedido.estado);
  if (idx < 0 || idx >= ORDEN_ESTADOS.length - 1) return estado; // ya entregado o cancelado

  const siguiente = ORDEN_ESTADOS[idx + 1];
  if (siguiente === 'Entregado') return entregarPedido(estado, pedido);

  let nuevo: EstadoApp = {
    ...estado,
    pedidos: estado.pedidos.map((p) => (p.id === pedidoId ? { ...p, estado: siguiente } : p)),
  };

  // Pasar a cocina manda la comanda al KDS (solo pedidos del día, no el histórico
  // precargado). Al salir el domiciliario, la comanda se da por despachada.
  if (siguiente === 'En preparación' && pedido.fecha === hoyISO()) {
    nuevo = crearComanda(nuevo, {
      origen: 'Domicilio',
      referencia: pedido.id,
      etiqueta: 'Domicilio ' + pedido.id + ' · ' + pedido.zona,
      captura: 'Caja',
      lineas: pedido.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      sedeId: pedido.sedeId,
    });
  }
  if (siguiente === 'En camino') nuevo = entregarComandasDe(nuevo, pedidoId);
  return nuevo;
}

export function aplicarCancelacionPedido(estado: EstadoApp, pedidoId: string): EstadoApp {
  const pedido = estado.pedidos.find((p) => p.id === pedidoId);
  if (!pedido || pedido.estado === 'Entregado') return estado;
  let nuevo: EstadoApp = {
    ...estado,
    pedidos: estado.pedidos.map((p) => (p.id === pedidoId ? { ...p, estado: 'Cancelado' } : p)),
  };
  // Si ya estaba en cocina, sus platos se anulan para que no se sigan preparando.
  for (const c of nuevo.comandas.filter((x) => x.referencia === pedidoId && !x.entregadaTs)) {
    for (const l of c.lineas) nuevo = aplicarAnularLinea(nuevo, c.id, l.id, 'Pedido cancelado');
  }
  return nuevo;
}

export function aplicarLiquidacionPlataforma(
  estado: EstadoApp,
  plataformaId: string,
  sedeId?: string,
): EstadoApp {
  const plataforma = estado.plataformas.find((x) => x.id === plataformaId);
  if (!plataforma) return estado;

  const pendientes = estado.pedidos.filter(
    (p) =>
      p.plataformaId === plataformaId &&
      p.estado === 'Entregado' &&
      !p.liquidado &&
      (!sedeId || p.sedeId === sedeId),
  );
  const monto = pendientes.reduce(
    (s, p) => s + (p.base + p.impuesto - p.comisionPlataforma),
    0,
  );
  if (monto <= 0) return estado;

  const asiento = nuevoAsiento(estado, {
    fecha: hoyISO(),
    descripcion: `Liquidación de ${plataforma.nombre} (${pendientes.length} pedidos)`,
    origen: 'liquidacion',
    referencia: plataformaId,
    sedeId,
    detalles: [d(CTA.BANCOS, monto, 0), d(CTA.CXC_PLATAFORMAS, 0, monto)],
  });

  const idsPendientes = new Set(pendientes.map((p) => p.id));
  return {
    ...estado,
    asientos: [...estado.asientos, asiento],
    pedidos: estado.pedidos.map((p) =>
      idsPendientes.has(p.id) ? { ...p, liquidado: true } : p,
    ),
  };
}
