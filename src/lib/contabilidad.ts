import type { Asiento, Cuenta, EstadoApp, TipoCuenta } from '../types';
import { CTA } from '../data/cuentas';
import { sumaISO } from './formato';

export { formatoMoneda, formatoFecha, formatoFechaDia, formatoCompacto, hoyISO } from './formato';

/** Cuentas de naturaleza deudora: un débito las aumenta. */
const NATURALEZA_DEBITO: TipoCuenta[] = ['Activo', 'Gasto'];

export const totalDebitos = (asiento: Asiento): number =>
  asiento.detalles.reduce((s, x) => s + x.debito, 0);

export const totalCreditos = (asiento: Asiento): number =>
  asiento.detalles.reduce((s, x) => s + x.credito, 0);

export const asientoCuadra = (asiento: Asiento): boolean =>
  Math.abs(totalDebitos(asiento) - totalCreditos(asiento)) < 0.5;

export const movimientosCuenta = (
  asientos: Asiento[],
  cuentaId: number,
): { debito: number; credito: number } => {
  let debito = 0;
  let credito = 0;
  for (const asiento of asientos) {
    for (const detalle of asiento.detalles) {
      if (detalle.cuenta_id === cuentaId) {
        debito += detalle.debito;
        credito += detalle.credito;
      }
    }
  }
  return { debito, credito };
};

export const saldoCuenta = (asientos: Asiento[], cuenta: Cuenta): number => {
  const { debito, credito } = movimientosCuenta(asientos, cuenta.id);
  return NATURALEZA_DEBITO.includes(cuenta.tipo) ? debito - credito : credito - debito;
};

export const saldoPorId = (estado: EstadoApp, cuentaId: number): number => {
  const cuenta = estado.cuentas.find((c) => c.id === cuentaId);
  return cuenta ? saldoCuenta(estado.asientos, cuenta) : 0;
};

export const totalPorTipo = (
  asientos: Asiento[],
  cuentas: Cuenta[],
  tipo: TipoCuenta,
): number =>
  cuentas
    .filter((c) => c.tipo === tipo)
    .reduce((s, c) => s + saldoCuenta(asientos, c), 0);

// --- Estado de resultados -------------------------------------------

export interface RenglonGasto {
  nombre: string;
  valor: number;
}

export interface EstadoResultados {
  ingresos: number;
  desgloseIngresos: RenglonGasto[];
  costoVentas: number;
  utilidadBruta: number;
  gastosOperativos: number;
  desgloseGastos: RenglonGasto[];
  utilidadNeta: number;
  margenBruto: number;
  margenNeto: number;
}

export const calcularEstadoResultados = (estado: EstadoApp): EstadoResultados => {
  const { asientos, cuentas } = estado;
  const ingresos = totalPorTipo(asientos, cuentas, 'Ingreso');
  const costoVentas = saldoPorId(estado, CTA.COSTO_VENTAS);
  const utilidadBruta = ingresos - costoVentas;

  const desgloseIngresos = cuentas
    .filter((c) => c.tipo === 'Ingreso')
    .map((c) => ({ nombre: c.nombre, valor: saldoCuenta(asientos, c) }))
    .filter((r) => r.valor !== 0)
    .sort((a, b) => b.valor - a.valor);

  const desgloseGastos = cuentas
    .filter((c) => c.tipo === 'Gasto' && c.id !== CTA.COSTO_VENTAS)
    .map((c) => ({ nombre: c.nombre, valor: saldoCuenta(asientos, c) }))
    .filter((r) => r.valor !== 0)
    .sort((a, b) => b.valor - a.valor);

  const gastosOperativos = desgloseGastos.reduce((s, r) => s + r.valor, 0);
  const utilidadNeta = utilidadBruta - gastosOperativos;

  return {
    ingresos,
    desgloseIngresos,
    costoVentas,
    utilidadBruta,
    gastosOperativos,
    desgloseGastos,
    utilidadNeta,
    margenBruto: ingresos ? utilidadBruta / ingresos : 0,
    margenNeto: ingresos ? utilidadNeta / ingresos : 0,
  };
};

// --- Balance general ------------------------------------------------

export interface BalanceGeneral {
  activos: number;
  pasivos: number;
  capital: number;
  utilidad: number;
  patrimonioTotal: number;
  pasivoMasPatrimonio: number;
  descuadre: number;
  cuadra: boolean;
  activosDetalle: RenglonGasto[];
  pasivosDetalle: RenglonGasto[];
}

export const calcularBalanceGeneral = (estado: EstadoApp): BalanceGeneral => {
  const { asientos, cuentas } = estado;
  const activos = totalPorTipo(asientos, cuentas, 'Activo');
  const pasivos = totalPorTipo(asientos, cuentas, 'Pasivo');
  const capital = totalPorTipo(asientos, cuentas, 'Patrimonio');
  const { utilidadNeta } = calcularEstadoResultados(estado);
  const patrimonioTotal = capital + utilidadNeta;
  const pasivoMasPatrimonio = pasivos + patrimonioTotal;
  const descuadre = activos - pasivoMasPatrimonio;

  const detalle = (tipo: TipoCuenta): RenglonGasto[] =>
    cuentas
      .filter((c) => c.tipo === tipo)
      .map((c) => ({ nombre: c.nombre, valor: saldoCuenta(asientos, c) }))
      .filter((r) => Math.abs(r.valor) > 0.5);

  return {
    activos,
    pasivos,
    capital,
    utilidad: utilidadNeta,
    patrimonioTotal,
    pasivoMasPatrimonio,
    descuadre,
    cuadra: Math.abs(descuadre) < 0.5,
    activosDetalle: detalle('Activo'),
    pasivosDetalle: detalle('Pasivo'),
  };
};

// --- Libro mayor y balance de comprobación ------------------------

export interface FilaMayor {
  cuenta: Cuenta;
  debitos: number;
  creditos: number;
  saldo: number; // con signo según naturaleza
  saldoDeudor: number;
  saldoAcreedor: number;
  movimientos: Array<{
    asientoId: string;
    fecha: string;
    descripcion: string;
    debito: number;
    credito: number;
    saldoParcial: number;
  }>;
}

export const construirLibroMayor = (estado: EstadoApp): FilaMayor[] => {
  const { asientos, cuentas } = estado;

  return cuentas
    .map((cuenta) => {
      const esDeudora = NATURALEZA_DEBITO.includes(cuenta.tipo);
      let debitos = 0;
      let creditos = 0;
      let saldoParcial = 0;
      const movimientos: FilaMayor['movimientos'] = [];

      for (const asiento of asientos) {
        for (const detalle of asiento.detalles) {
          if (detalle.cuenta_id !== cuenta.id) continue;
          debitos += detalle.debito;
          creditos += detalle.credito;
          saldoParcial += esDeudora
            ? detalle.debito - detalle.credito
            : detalle.credito - detalle.debito;
          movimientos.push({
            asientoId: asiento.id,
            fecha: asiento.fecha,
            descripcion: asiento.descripcion,
            debito: detalle.debito,
            credito: detalle.credito,
            saldoParcial,
          });
        }
      }

      const saldo = esDeudora ? debitos - creditos : creditos - debitos;
      return {
        cuenta,
        debitos,
        creditos,
        saldo,
        saldoDeudor: esDeudora ? Math.max(saldo, 0) : Math.max(-saldo, 0),
        saldoAcreedor: esDeudora ? Math.max(-saldo, 0) : Math.max(saldo, 0),
        movimientos,
      };
    })
    .filter((fila) => fila.movimientos.length > 0);
};

export interface BalanceComprobacion {
  filas: FilaMayor[];
  totalDebitos: number;
  totalCreditos: number;
  totalSaldoDeudor: number;
  totalSaldoAcreedor: number;
  cuadraMovimientos: boolean;
  cuadraSaldos: boolean;
}

export const construirBalanceComprobacion = (estado: EstadoApp): BalanceComprobacion => {
  const filas = construirLibroMayor(estado);
  const totalDebitos = filas.reduce((s, f) => s + f.debitos, 0);
  const totalCreditos = filas.reduce((s, f) => s + f.creditos, 0);
  const totalSaldoDeudor = filas.reduce((s, f) => s + f.saldoDeudor, 0);
  const totalSaldoAcreedor = filas.reduce((s, f) => s + f.saldoAcreedor, 0);
  return {
    filas,
    totalDebitos,
    totalCreditos,
    totalSaldoDeudor,
    totalSaldoAcreedor,
    cuadraMovimientos: Math.abs(totalDebitos - totalCreditos) < 0.5,
    cuadraSaldos: Math.abs(totalSaldoDeudor - totalSaldoAcreedor) < 0.5,
  };
};

// --- Series para gráficas ----------------------------------------

const rangoFechas = (estado: EstadoApp, dias: number): string[] => {
  const fin =
    estado.asientos.reduce((max, a) => (a.fecha > max ? a.fecha : max), '2000-01-01') ||
    '2000-01-01';
  return Array.from({ length: dias }, (_, i) => sumaISO(fin, -(dias - 1 - i)));
};

export interface PuntoVentasDia {
  fecha: string;
  ventas: number;
  tickets: number;
}

export const serieVentasPorDia = (estado: EstadoApp, dias = 14): PuntoVentasDia[] => {
  const fechas = rangoFechas(estado, dias);
  return fechas.map((fecha) => {
    const delDia = estado.ventas.filter((v) => v.fecha === fecha);
    return {
      fecha,
      ventas: delDia.reduce((s, v) => s + v.base, 0),
      tickets: delDia.length,
    };
  });
};

export interface PuntoIngresoGasto {
  fecha: string;
  ingresos: number;
  gastos: number;
}

export const serieIngresosGastos = (estado: EstadoApp, dias = 14): PuntoIngresoGasto[] => {
  const fechas = rangoFechas(estado, dias);
  const cuentasGasto = new Set(
    estado.cuentas.filter((c) => c.tipo === 'Gasto').map((c) => c.id),
  );
  const cuentasIngreso = new Set(
    estado.cuentas.filter((c) => c.tipo === 'Ingreso').map((c) => c.id),
  );

  return fechas.map((fecha) => {
    let ingresos = 0;
    let gastos = 0;
    for (const asiento of estado.asientos) {
      if (asiento.fecha !== fecha) continue;
      for (const det of asiento.detalles) {
        if (cuentasIngreso.has(det.cuenta_id)) ingresos += det.credito - det.debito;
        if (cuentasGasto.has(det.cuenta_id)) gastos += det.debito - det.credito;
      }
    }
    return { fecha, ingresos, gastos };
  });
};

export const gastosPorCategoria = (estado: EstadoApp): RenglonGasto[] =>
  estado.cuentas
    .filter((c) => c.tipo === 'Gasto')
    .map((c) => ({ nombre: c.nombre, valor: saldoCuenta(estado.asientos, c) }))
    .filter((r) => r.valor > 0)
    .sort((a, b) => b.valor - a.valor);

export interface FilaProducto {
  nombre: string;
  unidades: number;
  ingreso: number;
}

export const topProductos = (estado: EstadoApp, n = 6): FilaProducto[] => {
  const acumulado = new Map<string, FilaProducto>();
  for (const venta of estado.ventas) {
    for (const linea of venta.lineas) {
      const previo = acumulado.get(linea.nombre) ?? {
        nombre: linea.nombre,
        unidades: 0,
        ingreso: 0,
      };
      previo.unidades += linea.cantidad;
      previo.ingreso += linea.cantidad * linea.precioUnit;
      acumulado.set(linea.nombre, previo);
    }
  }
  return [...acumulado.values()].sort((a, b) => b.ingreso - a.ingreso).slice(0, n);
};

// --- Indicadores del tablero ------------------------------------

export interface Indicadores {
  ventasBase: number;
  ventasTotales: number;
  numVentas: number;
  ticketPromedio: number;
  unidadesVendidas: number;
  margenBruto: number;
  utilidadNeta: number;
  nominaPeriodo: number;
  impuestosPorPagar: number;
  efectivoDisponible: number;
  cuentasPorPagar: number;
  valorInventario: number;
}

export const calcularIndicadores = (estado: EstadoApp): Indicadores => {
  const er = calcularEstadoResultados(estado);
  const ventasBase = estado.ventas.reduce((s, v) => s + v.base, 0);
  const ventasTotales = estado.ventas.reduce((s, v) => s + v.total, 0);
  const unidadesVendidas = estado.ventas.reduce(
    (s, v) => s + v.lineas.reduce((u, l) => u + l.cantidad, 0),
    0,
  );

  return {
    ventasBase,
    ventasTotales,
    numVentas: estado.ventas.length,
    ticketPromedio: estado.ventas.length ? ventasBase / estado.ventas.length : 0,
    unidadesVendidas,
    margenBruto: er.margenBruto,
    utilidadNeta: er.utilidadNeta,
    nominaPeriodo: estado.nominas.reduce((s, n) => s + n.totalDevengado, 0),
    impuestosPorPagar:
      saldoPorId(estado, CTA.IMPUESTO_CONSUMO) + saldoPorId(estado, CTA.DEDUCCIONES_NOMINA),
    efectivoDisponible: saldoPorId(estado, CTA.CAJA) + saldoPorId(estado, CTA.BANCOS),
    cuentasPorPagar: saldoPorId(estado, CTA.PROVEEDORES),
    valorInventario: saldoPorId(estado, CTA.INVENTARIO),
  };
};

// --- Domicilios -------------------------------------------------

const ESTADOS_ACTIVOS = new Set(['Recibido', 'En preparación', 'En camino']);

export interface IndicadoresDomicilios {
  activos: number;
  entregados: number;
  cancelados: number;
  ingresoDomicilios: number;
  ticketPromedio: number;
  porCobrarPlataformas: number;
  costoReparto: number;
  comisiones: number;
}

export const calcularIndicadoresDomicilios = (estado: EstadoApp): IndicadoresDomicilios => {
  const entregados = estado.pedidos.filter((p) => p.estado === 'Entregado');
  const totalCobrado = entregados.reduce(
    (s, p) => s + p.base + p.impuesto + (p.canal === 'Propio' ? p.domicilio : 0),
    0,
  );
  return {
    activos: estado.pedidos.filter((p) => ESTADOS_ACTIVOS.has(p.estado)).length,
    entregados: entregados.length,
    cancelados: estado.pedidos.filter((p) => p.estado === 'Cancelado').length,
    ingresoDomicilios: saldoPorId(estado, CTA.INGRESOS_DOMICILIO),
    ticketPromedio: entregados.length ? totalCobrado / entregados.length : 0,
    porCobrarPlataformas: saldoPorId(estado, CTA.CXC_PLATAFORMAS),
    costoReparto: saldoPorId(estado, CTA.GASTO_REPARTO),
    comisiones: saldoPorId(estado, CTA.GASTO_COMISIONES),
  };
};

/** Monto que la plataforma nos debe por pedidos entregados y aún no liquidados. */
export const porCobrarPlataforma = (estado: EstadoApp, plataformaId: string): number =>
  estado.pedidos
    .filter(
      (p) =>
        p.plataformaId === plataformaId && p.estado === 'Entregado' && !p.liquidado,
    )
    .reduce((s, p) => s + (p.base + p.impuesto - p.comisionPlataforma), 0);

export interface FilaZona {
  zona: string;
  pedidos: number;
  ingreso: number;
}

export const pedidosPorZona = (estado: EstadoApp): FilaZona[] => {
  const mapa = new Map<string, FilaZona>();
  for (const pedido of estado.pedidos) {
    if (pedido.estado !== 'Entregado') continue;
    const previo = mapa.get(pedido.zona) ?? { zona: pedido.zona, pedidos: 0, ingreso: 0 };
    previo.pedidos += 1;
    previo.ingreso += pedido.base + pedido.impuesto;
    mapa.set(pedido.zona, previo);
  }
  return [...mapa.values()].sort((a, b) => b.ingreso - a.ingreso);
};
