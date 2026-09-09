import type { CanalDomicilio, EstadoApp, ZonaDomicilio } from '../types';
import { CTA } from './cuentas';
import { catalogoCuentas } from './cuentas';
import { catalogoProductos } from './menu';
import { empleadosIniciales } from './personal';
import { domiciliariosIniciales, plataformasIniciales, tarifaZona } from './domicilios';
import { mesasIniciales } from './salon';
import {
  aplicarAsientoManual,
  aplicarAvancePedido,
  aplicarCompra,
  aplicarGasto,
  aplicarLiquidacionPlataforma,
  aplicarNomina,
  aplicarNuevoPedido,
  aplicarVenta,
  type EntradaPedido,
} from '../lib/operaciones';
import {
  aplicarAbrirMesa,
  aplicarCerrarMesa,
  aplicarConsumo,
  aplicarEstadoReserva,
  aplicarNuevaReserva,
  aplicarSentarReserva,
} from '../lib/salon';
import { hoyISO, sumaISO } from '../lib/formato';

const INICIO_OPERACION = '2026-08-25';

/** Generador determinista simple para armar canastas de venta reproducibles. */
function generador(semilla: number) {
  let x = (semilla * 1103515245 + 12345) & 0x7fffffff;
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
}

function canastaDelDia(dia: number, turno: number) {
  const rnd = generador(dia * 10 + turno + 1);
  const cantProductos = 3 + Math.floor(rnd() * 3); // 3 a 5 líneas
  const indices = new Set<number>();
  while (indices.size < cantProductos) {
    indices.add(Math.floor(rnd() * catalogoProductos.length));
  }
  const finDeSemana = dia % 7 === 4 || dia % 7 === 5; // más movimiento viernes y sábado
  return [...indices].map((i) => ({
    productoId: catalogoProductos[i].id,
    cantidad: (finDeSemana ? 5 : 3) + Math.floor(rnd() * 9), // 3–11 entre semana, 5–13 fin de semana
  }));
}

const NOMBRES_CLIENTE = [
  'María Gómez',
  'Carlos Ruiz',
  'Ana Torres',
  'Jorge Díaz',
  'Luisa Peña',
  'Andrés Mora',
  'Paula Cano',
  'Felipe Ríos',
  'Sara Leal',
  'Diego Nieto',
];
const ZONAS: ZonaDomicilio[] = ['Centro', 'Chapinero', 'Norte', 'Sur', 'Occidente'];

function entradaPedidoDemo(i: number, fecha: string): EntradaPedido {
  const rnd = generador(1000 + i);
  const nLineas = 1 + Math.floor(rnd() * 3);
  const indices = new Set<number>();
  while (indices.size < nLineas) indices.add(Math.floor(rnd() * catalogoProductos.length));
  const lineas = [...indices].map((k) => ({
    productoId: catalogoProductos[k].id,
    cantidad: 1 + Math.floor(rnd() * 3),
  }));
  const canal: CanalDomicilio = i % 3 === 0 ? 'Plataforma' : 'Propio';
  const zona = ZONAS[i % ZONAS.length];
  return {
    cliente: NOMBRES_CLIENTE[i % NOMBRES_CLIENTE.length],
    telefono: `31${i % 9} 4${100 + i}`,
    direccion: `Calle ${12 + i} # ${5 + (i % 30)} - ${20 + (i % 40)}`,
    zona,
    canal,
    domiciliarioId:
      canal === 'Propio'
        ? domiciliariosIniciales[Math.floor(i / 3) % domiciliariosIniciales.length].id
        : undefined,
    plataformaId: canal === 'Plataforma' ? plataformasIniciales[i % 2].id : undefined,
    domicilio: tarifaZona(zona),
    formaPago:
      canal === 'Plataforma' ? 'Plataforma' : i % 2 === 0 ? 'Efectivo' : 'Transferencia',
    lineas,
    fecha,
  };
}

/**
 * Construye el estado inicial de la demostración: apertura, inversión en equipo,
 * ~2 semanas de ventas, compras de reposición, gastos, nómina quincenal y una
 * semana de domicilios. Todo pasa por los mismos `aplicar*` que usa el reducer,
 * así los folios y asientos quedan encadenados igual que en la operación real.
 */
export function construirEstadoInicial(): EstadoApp {
  let estado: EstadoApp = {
    cuentas: catalogoCuentas,
    productos: catalogoProductos,
    empleados: empleadosIniciales,
    domiciliarios: domiciliariosIniciales,
    plataformas: plataformasIniciales,
    asientos: [],
    ventas: [],
    compras: [],
    gastos: [],
    nominas: [],
    pedidos: [],
    mesas: mesasIniciales,
    reservas: [],
    sesiones: [],
  };

  // Apertura y montaje del negocio.
  estado = aplicarAsientoManual(estado, {
    fecha: '2026-08-24',
    origen: 'apertura',
    descripcion: 'Aporte inicial de capital de los socios',
    detalles: [
      { cuenta_id: CTA.BANCOS, debito: 18000000, credito: 0 },
      { cuenta_id: CTA.CAJA, debito: 800000, credito: 0 },
      { cuenta_id: CTA.CAPITAL, debito: 0, credito: 18800000 },
    ],
  });
  estado = aplicarAsientoManual(estado, {
    fecha: INICIO_OPERACION,
    origen: 'apertura',
    descripcion: 'Compra de plancha, freidora y línea fría de contado',
    detalles: [
      { cuenta_id: CTA.EQUIPO, debito: 9500000, credito: 0 },
      { cuenta_id: CTA.BANCOS, debito: 0, credito: 9500000 },
    ],
  });
  estado = aplicarAsientoManual(estado, {
    fecha: INICIO_OPERACION,
    origen: 'apertura',
    descripcion: 'Inventario inicial de insumos a crédito con proveedor',
    detalles: [
      { cuenta_id: CTA.INVENTARIO, debito: 8500000, credito: 0 },
      { cuenta_id: CTA.PROVEEDORES, debito: 0, credito: 8500000 },
    ],
  });

  // 14 días de operación, tres ventas (turnos) por día.
  for (let dia = 0; dia < 14; dia += 1) {
    const fecha = sumaISO('2026-08-26', dia);
    for (let turno = 0; turno < 3; turno += 1) {
      estado = aplicarVenta(estado, {
        fecha,
        formaPago: (dia + turno) % 2 === 0 ? 'Efectivo' : 'Transferencia',
        lineas: canastaDelDia(dia, turno),
      });
    }
  }

  // Reposiciones de inventario.
  estado = aplicarCompra(estado, {
    fecha: '2026-08-30',
    proveedor: 'Distribuidora La Sabana',
    concepto: 'Carne, pan y vegetales',
    monto: 3600000,
    destino: 'Inventario',
    formaPago: 'Crédito',
  });
  estado = aplicarCompra(estado, {
    fecha: '2026-09-04',
    proveedor: 'Distribuidora La Sabana',
    concepto: 'Reposición semanal de insumos',
    monto: 4200000,
    destino: 'Inventario',
    formaPago: 'Transferencia',
  });
  estado = aplicarCompra(estado, {
    fecha: '2026-09-02',
    proveedor: 'Gases del Llano',
    concepto: 'Recarga de cilindros de gas',
    monto: 320000,
    destino: 'Gasto',
    categoriaGasto: 'Mantenimiento',
    formaPago: 'Efectivo',
  });

  // Abono parcial a proveedores.
  estado = aplicarAsientoManual(estado, {
    fecha: '2026-09-05',
    origen: 'compra',
    descripcion: 'Abono parcial a Distribuidora La Sabana',
    detalles: [
      { cuenta_id: CTA.PROVEEDORES, debito: 6000000, credito: 0 },
      { cuenta_id: CTA.BANCOS, debito: 0, credito: 6000000 },
    ],
  });

  // Gastos operativos del periodo.
  estado = aplicarGasto(estado, {
    fecha: '2026-08-28',
    categoria: 'Mercadeo',
    concepto: 'Pauta en redes y volantes de apertura',
    monto: 650000,
    formaPago: 'Transferencia',
  });
  estado = aplicarGasto(estado, {
    fecha: '2026-09-01',
    categoria: 'Arrendamiento',
    concepto: 'Canon del local comercial',
    monto: 3400000,
    formaPago: 'Transferencia',
  });
  estado = aplicarGasto(estado, {
    fecha: '2026-09-03',
    categoria: 'Servicios públicos',
    concepto: 'Energía, agua e internet',
    monto: 920000,
    formaPago: 'Transferencia',
  });

  // Nómina de la primera quincena.
  estado = aplicarNomina(estado, {
    fecha: '2026-08-31',
    periodo: '16–31 de agosto de 2026',
    empleadoIds: empleadosIniciales.filter((e) => e.activo).map((e) => e.id),
  });

  // Domicilios: última semana, 3 pedidos por día. Los de días anteriores quedan
  // entregados; los de hoy quedan en distintas etapas para el tablero.
  let contadorPedido = 0;
  for (let dia = 8; dia < 14; dia += 1) {
    const fecha = sumaISO('2026-08-26', dia);
    const esHoy = dia === 13;
    for (let k = 0; k < 3; k += 1) {
      estado = aplicarNuevoPedido(estado, entradaPedidoDemo(contadorPedido, fecha));
      const idPedido = estado.pedidos[estado.pedidos.length - 1].id;
      contadorPedido += 1;

      if (!esHoy) {
        estado = aplicarAvancePedido(estado, idPedido); // En preparación
        estado = aplicarAvancePedido(estado, idPedido); // En camino
        estado = aplicarAvancePedido(estado, idPedido); // Entregado
      } else if (k === 0) {
        estado = aplicarAvancePedido(estado, idPedido); // queda "En preparación"
      } else if (k === 1) {
        estado = aplicarAvancePedido(estado, idPedido);
        estado = aplicarAvancePedido(estado, idPedido); // queda "En camino"
      }
      // k === 2 queda "Recibido"
    }
  }

  // Se liquida una plataforma para mostrar el cobro; la otra queda por cobrar.
  estado = aplicarLiquidacionPlataforma(estado, 'plat-didi');

  // --- Salón: reservas del día y ocupación de mesas ---------------
  estado = sembrarSalon(estado);

  return estado;
}

/**
 * Agenda de reservas de hoy en distintos estados y unas cuantas mesas ocupadas
 * (dos walk-in, una reserva sentada y un almuerzo ya cerrado que deja la mesa
 * por limpiar), para que el tablero y el modelo 3D arranquen con movimiento.
 */
function sembrarSalon(estadoBase: EstadoApp): EstadoApp {
  let estado = estadoBase;
  const hoy = hoyISO();
  const manana = sumaISO(hoy, 1);
  const ultimaSesion = () => estado.sesiones[estado.sesiones.length - 1].id;

  // Reservas de hoy.
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '12:45', cliente: 'Almuerzo Prado', telefono: '310 2233445', personas: 4, zona: 'Salón', mesaId: 'M-03' }); // R-0001
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '20:00', cliente: 'Familia Ochoa', telefono: '311 9988776', personas: 6, zona: 'Salón', mesaId: 'M-06', notas: 'Cumpleaños, llevan torta' }); // R-0002
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '20:30', cliente: 'Grupo Herrera', telefono: '300 1212121', personas: 8, zona: 'Privado', mesaId: 'M-15' }); // R-0003
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '21:00', cliente: 'Nicolás Pardo', telefono: '315 4455667', personas: 2, zona: 'Terraza' }); // R-0004
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '19:00', cliente: 'Mesa Torres', telefono: '312 7766554', personas: 3 }); // R-0005
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '19:30', cliente: 'Cena Villa', telefono: '318 3344556', personas: 4, zona: 'Salón' }); // R-0006
  // Próximos días.
  estado = aplicarNuevaReserva(estado, { fecha: manana, hora: '13:00', cliente: 'Oficina Delta', telefono: '301 5566778', personas: 10, zona: 'Privado', mesaId: 'M-15' });
  estado = aplicarNuevaReserva(estado, { fecha: manana, hora: '20:00', cliente: 'Aniversario Ríos', telefono: '311 2020202', personas: 2, zona: 'Terraza' });

  estado = aplicarEstadoReserva(estado, 'R-0002', 'Confirmada');
  estado = aplicarEstadoReserva(estado, 'R-0003', 'Confirmada');
  estado = aplicarEstadoReserva(estado, 'R-0005', 'No-show');
  estado = aplicarEstadoReserva(estado, 'R-0006', 'Cancelada');

  // Almuerzo ya cerrado (S-0001): la mesa M-03 queda "Por limpiar".
  estado = aplicarSentarReserva(estado, { reservaId: 'R-0001', mesaId: 'M-03', comensales: 4, mesero: 'Valentina Ruiz' });
  const almuerzo = ultimaSesion();
  estado = aplicarConsumo(estado, almuerzo, 'ham-clasica', 2);
  estado = aplicarConsumo(estado, almuerzo, 'ham-pollo', 2);
  estado = aplicarConsumo(estado, almuerzo, 'papas-gajo', 2);
  estado = aplicarConsumo(estado, almuerzo, 'limonada', 4);
  estado = aplicarConsumo(estado, almuerzo, 'brownie', 2);
  estado = aplicarCerrarMesa(estado, almuerzo);

  // Familia Ochoa sentada con la cuenta abierta (S-0002).
  estado = aplicarSentarReserva(estado, { reservaId: 'R-0002', mesaId: 'M-06', comensales: 6, mesero: 'Laura Restrepo' });
  const ochoa = ultimaSesion();
  estado = aplicarConsumo(estado, ochoa, 'ham-doble', 3);
  estado = aplicarConsumo(estado, ochoa, 'ham-clasica', 3);
  estado = aplicarConsumo(estado, ochoa, 'papas-clasicas', 3);
  estado = aplicarConsumo(estado, ochoa, 'aros-cebolla', 2);
  estado = aplicarConsumo(estado, ochoa, 'gaseosa', 4);
  estado = aplicarConsumo(estado, ochoa, 'malteada', 2);

  // Walk-in en el salón (S-0003).
  estado = aplicarAbrirMesa(estado, { mesaId: 'M-01', comensales: 3, mesero: 'Valentina Ruiz' });
  const walkinSalon = ultimaSesion();
  estado = aplicarConsumo(estado, walkinSalon, 'ham-clasica', 2);
  estado = aplicarConsumo(estado, walkinSalon, 'ham-veggie', 1);
  estado = aplicarConsumo(estado, walkinSalon, 'papas-clasicas', 2);
  estado = aplicarConsumo(estado, walkinSalon, 'gaseosa', 3);

  // Walk-in en la terraza (S-0004).
  estado = aplicarAbrirMesa(estado, { mesaId: 'M-11', comensales: 2, mesero: 'Laura Restrepo' });
  const walkinTerraza = ultimaSesion();
  estado = aplicarConsumo(estado, walkinTerraza, 'ham-pollo', 2);
  estado = aplicarConsumo(estado, walkinTerraza, 'dedos-queso', 1);
  estado = aplicarConsumo(estado, walkinTerraza, 'limonada', 2);

  // Antigüedad realista de cada sesión (apertura y, si aplica, cierre).
  const ahora = Date.now();
  const MIN = 60000;
  const desfase: Record<string, { abre: number; cierra?: number }> = {
    'S-0001': { abre: 96, cierra: 34 },
    'S-0002': { abre: 52 },
    'S-0003': { abre: 38 },
    'S-0004': { abre: 21 },
  };
  estado = {
    ...estado,
    sesiones: estado.sesiones.map((s) => {
      const d = desfase[s.id];
      if (!d) return s;
      return {
        ...s,
        aperturaTs: ahora - d.abre * MIN,
        cierreTs: d.cierra != null ? ahora - d.cierra * MIN : s.cierreTs,
      };
    }),
  };

  return estado;
}
