import type {
  CanalDomicilio,
  CapturaComanda,
  ClienteFactura,
  EstadoApp,
  MedioPago,
  ZonaDomicilio,
} from '../types';
import { CTA, IMPUESTO_CONSUMO, PROPINA_SUGERIDA, catalogoCuentas } from './cuentas';
import { catalogoProductos } from './menu';
import { empleadosIniciales } from './personal';
import { domiciliariosIniciales, plataformasIniciales, tarifaZona, ZONAS_DOMICILIO } from './domicilios';
import { mesasIniciales } from './salon';
import { SEDE_PRINCIPAL, sedesIniciales } from './sedes';
import {
  aplicarAsientoManual,
  aplicarAvancePedido,
  aplicarCobrarMesa,
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
  aplicarEstadoReserva,
  aplicarNuevaReserva,
  aplicarSentarReserva,
} from '../lib/salon';
import { aplicarComandaMesa, type LineaPedida } from '../lib/comandas';
import type { DatosCobro } from '../lib/facturacion';
import { hoyISO, sumaISO } from '../lib/formato';

const SEDE = SEDE_PRINCIPAL;
const DIAS_HISTORICO = 13;

/** Generador determinista simple para armar canastas reproducibles. */
function generador(semilla: number) {
  let x = (semilla * 1103515245 + 12345) & 0x7fffffff;
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
}

const precio = new Map(catalogoProductos.map((p) => [p.id, p.precio]));
const vendibles = catalogoProductos.filter((p) => p.categoria !== 'Bebidas');
const bebidas = catalogoProductos.filter((p) => p.categoria === 'Bebidas');

/** Un pedido típico: 1 a 3 platos y bebidas para la mesa. */
function canasta(rnd: () => number): LineaPedida[] {
  const lineas = new Map<string, number>();
  const platos = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < platos; i += 1) {
    const p = vendibles[Math.floor(rnd() * vendibles.length)];
    lineas.set(p.id, (lineas.get(p.id) ?? 0) + 1);
  }
  const b = bebidas[Math.floor(rnd() * bebidas.length)];
  lineas.set(b.id, 1 + Math.floor(rnd() * 3));
  return [...lineas].map(([productoId, cantidad]) => ({ productoId, cantidad }));
}

const MEDIOS_PONDERADOS: MedioPago[] = [
  'Efectivo', 'Efectivo', 'Efectivo', 'Efectivo', 'Nequi', 'Nequi', 'Nequi',
  'Daviplata', 'Tarjeta', 'Bre-B',
];

const EMPRESAS: ClienteFactura[] = [
  { tipoId: 'NIT', numero: '900.456.789-1', nombre: 'Constructora del Sinú S.A.S.', correo: 'contabilidad@consinu.co' },
  { tipoId: 'NIT', numero: '901.112.334-5', nombre: 'Agropecuaria La Esperanza S.A.S.', correo: 'facturas@laesperanza.co' },
  { tipoId: 'CC', numero: '1.067.845.210', nombre: 'Mario Babilonia', correo: 'mbabilonia@gmail.com' },
];

/** Arma el cobro de una venta precargada: medio de pago, propina y, a veces, factura electrónica. */
function cobroDemo(lineas: LineaPedida[], rnd: () => number, conPropina: boolean): DatosCobro {
  const base = lineas.reduce((s, l) => s + (precio.get(l.productoId) ?? 0) * l.cantidad, 0);
  const total = base + Math.round(base * IMPUESTO_CONSUMO);
  const propina = conPropina && rnd() < 0.8 ? Math.round(base * PROPINA_SUGERIDA) : 0;
  const aPagar = total + propina;
  const mixto = rnd() < 0.06;
  const medio = MEDIOS_PONDERADOS[Math.floor(rnd() * MEDIOS_PONDERADOS.length)];
  const pagos = mixto
    ? [
        { medio: 'Efectivo' as MedioPago, monto: Math.round(aPagar / 2) },
        { medio: 'Nequi' as MedioPago, monto: aPagar - Math.round(aPagar / 2) },
      ]
    : [{ medio, monto: aPagar }];
  const fe = rnd() < 0.07;
  return {
    documento: fe ? 'FE' : 'POS',
    cliente: fe ? EMPRESAS[Math.floor(rnd() * EMPRESAS.length)] : undefined,
    propina,
    pagos,
  };
}

const MESEROS = empleadosIniciales.filter((e) => /^meser/i.test(e.cargo)).map((e) => e.nombre);

const NOMBRES_CLIENTE = [
  'María José Petro',
  'Carlos Doria',
  'Ana Lucía Ramos',
  'Jorge Montes',
  'Luisa Fernanda Hoyos',
  'Andrés Burgos',
  'Paola Ortega',
  'Felipe Lora',
  'Sara Pérez',
  'Diego Espitia',
];

const CALLES = ['Calle 29', 'Carrera 9', 'Calle 41', 'Carrera 14', 'Calle 62', 'Transversal 7', 'Calle 22'];

function entradaPedidoDemo(i: number, fecha: string): EntradaPedido {
  const rnd = generador(1000 + i);
  const canal: CanalDomicilio = i % 3 === 0 ? 'Plataforma' : 'Propio';
  const zona: ZonaDomicilio = ZONAS_DOMICILIO[i % ZONAS_DOMICILIO.length].zona;
  return {
    cliente: NOMBRES_CLIENTE[i % NOMBRES_CLIENTE.length],
    telefono: `31${i % 9} ${400 + i} ${1000 + i * 7}`,
    direccion: `${CALLES[i % CALLES.length]} # ${5 + (i % 30)}-${20 + (i % 40)}, ${zona}`,
    zona,
    canal,
    domiciliarioId:
      canal === 'Propio'
        ? domiciliariosIniciales[Math.floor(i / 3) % domiciliariosIniciales.length].id
        : undefined,
    plataformaId: canal === 'Plataforma' ? plataformasIniciales[i % 2].id : undefined,
    domicilio: tarifaZona(zona),
    formaPago: canal === 'Plataforma' ? 'Plataforma' : i % 2 === 0 ? 'Efectivo' : 'Nequi',
    lineas: canasta(rnd),
    fecha,
    sedeId: SEDE,
  };
}

/**
 * Estado inicial de la demostración, anclado a la fecha de hoy: apertura,
 * dos semanas de ventas de mesa y mostrador (con sus tiquetes POS y algunas
 * facturas electrónicas), compras, gastos, nómina, domicilios y un salón en
 * plena operación con comandas vivas en la cocina. Todo pasa por los mismos
 * `aplicar*` que usa el reducer, así folios y asientos quedan encadenados.
 */
export function construirEstadoInicial(): EstadoApp {
  const hoy = hoyISO();
  const inicio = sumaISO(hoy, -DIAS_HISTORICO);

  let estado: EstadoApp = {
    sedes: sedesIniciales,
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
    comandas: [],
    facturas: [],
  };

  estado = aplicarAsientoManual(estado, {
    fecha: sumaISO(inicio, -1),
    origen: 'apertura',
    descripcion: 'Aporte inicial de capital de los socios',
    detalles: [
      { cuenta_id: CTA.BANCOS, debito: 22000000, credito: 0 },
      { cuenta_id: CTA.CAJA, debito: 1000000, credito: 0 },
      { cuenta_id: CTA.CAPITAL, debito: 0, credito: 23000000 },
    ],
  });
  estado = aplicarAsientoManual(estado, {
    fecha: inicio,
    origen: 'apertura',
    descripcion: 'Horno de pizza, plancha, freidoras y línea fría de contado',
    detalles: [
      { cuenta_id: CTA.EQUIPO, debito: 12500000, credito: 0 },
      { cuenta_id: CTA.BANCOS, debito: 0, credito: 12500000 },
    ],
  });
  estado = aplicarAsientoManual(estado, {
    fecha: inicio,
    origen: 'apertura',
    descripcion: 'Inventario inicial de insumos a crédito con proveedor',
    detalles: [
      { cuenta_id: CTA.INVENTARIO, debito: 9000000, credito: 0 },
      { cuenta_id: CTA.PROVEEDORES, debito: 0, credito: 9000000 },
    ],
  });

  // Ventas de los días anteriores: más movimiento viernes y sábado.
  for (let dia = 0; dia < DIAS_HISTORICO; dia += 1) {
    const fecha = sumaISO(inicio, dia);
    const diaSemana = new Date(`${fecha}T12:00:00`).getDay();
    const tickets = diaSemana === 5 || diaSemana === 6 ? 34 : 24;
    for (let t = 0; t < tickets; t += 1) {
      const rnd = generador(dia * 100 + t + 7);
      const lineas = canasta(rnd);
      const enMesa = rnd() < 0.6;
      estado = aplicarVenta(estado, {
        fecha,
        lineas,
        cobro: cobroDemo(lineas, rnd, enMesa),
        canal: enMesa ? 'Mesa' : 'Mostrador',
        referencia: enMesa ? `Mesa ${1 + Math.floor(rnd() * 15)}` : undefined,
        atendio: enMesa ? MESEROS[t % MESEROS.length] : undefined,
        sedeId: SEDE,
      });
    }
  }

  // Reposiciones de inventario y gastos del periodo.
  estado = aplicarCompra(estado, {
    fecha: sumaISO(inicio, 3),
    proveedor: 'Carnes La Ganadería',
    concepto: 'Carne de res, cerdo, chorizo y butifarra',
    monto: 4200000,
    destino: 'Inventario',
    formaPago: 'Crédito',
    sedeId: SEDE,
  });
  estado = aplicarCompra(estado, {
    fecha: sumaISO(inicio, 6),
    proveedor: 'Distribuidora Sinú',
    concepto: 'Queso, harina, pan y salsas',
    monto: 3800000,
    destino: 'Inventario',
    formaPago: 'Transferencia',
    sedeId: SEDE,
  });
  estado = aplicarCompra(estado, {
    fecha: sumaISO(inicio, 10),
    proveedor: 'Distribuidora Sinú',
    concepto: 'Reposición semanal de insumos',
    monto: 4100000,
    destino: 'Inventario',
    formaPago: 'Transferencia',
    sedeId: SEDE,
  });
  estado = aplicarCompra(estado, {
    fecha: sumaISO(inicio, 5),
    proveedor: 'Gases de Córdoba',
    concepto: 'Recarga de cilindros de gas',
    monto: 360000,
    destino: 'Gasto',
    categoriaGasto: 'Mantenimiento',
    formaPago: 'Efectivo',
    sedeId: SEDE,
  });
  estado = aplicarAsientoManual(estado, {
    fecha: sumaISO(inicio, 8),
    origen: 'compra',
    descripcion: 'Abono parcial a Carnes La Ganadería',
    detalles: [
      { cuenta_id: CTA.PROVEEDORES, debito: 6000000, credito: 0 },
      { cuenta_id: CTA.BANCOS, debito: 0, credito: 6000000 },
    ],
  });
  estado = aplicarGasto(estado, {
    fecha: sumaISO(inicio, 1),
    categoria: 'Mercadeo',
    concepto: 'Pauta en Instagram y volantes',
    monto: 450000,
    formaPago: 'Transferencia',
    sedeId: SEDE,
  });
  estado = aplicarGasto(estado, {
    fecha: sumaISO(inicio, 4),
    categoria: 'Arrendamiento',
    concepto: 'Canon del local comercial',
    monto: 3200000,
    formaPago: 'Transferencia',
    sedeId: SEDE,
  });
  estado = aplicarGasto(estado, {
    fecha: sumaISO(inicio, 7),
    categoria: 'Servicios públicos',
    concepto: 'Energía, agua e internet',
    monto: 1350000,
    formaPago: 'Transferencia',
    sedeId: SEDE,
  });

  estado = aplicarNomina(estado, {
    fecha: sumaISO(inicio, 5),
    periodo: 'Quincena anterior',
    empleadoIds: empleadosIniciales.filter((e) => e.activo).map((e) => e.id),
    sedeId: SEDE,
  });

  // Domicilios de la última semana; los de hoy quedan en distintas etapas.
  let n = 0;
  for (let dia = DIAS_HISTORICO - 6; dia <= DIAS_HISTORICO; dia += 1) {
    const fecha = sumaISO(inicio, dia);
    const esHoy = fecha === hoy;
    for (let k = 0; k < 4; k += 1) {
      estado = aplicarNuevoPedido(estado, entradaPedidoDemo(n, fecha));
      const id = estado.pedidos[estado.pedidos.length - 1].id;
      n += 1;
      const pasos = !esHoy ? 3 : k === 0 ? 1 : k === 1 ? 2 : k === 2 ? 1 : 0;
      for (let p = 0; p < pasos; p += 1) estado = aplicarAvancePedido(estado, id);
    }
  }
  estado = aplicarLiquidacionPlataforma(estado, 'plat-didi', SEDE);

  // Dos ventas para llevar de hoy que todavía están en cocina.
  const llevar1: LineaPedida[] = [
    { productoId: 'combo-perro', cantidad: 2 },
    { productoId: 'salchipapa', cantidad: 1, nota: 'Salsas aparte' },
  ];
  const llevar2: LineaPedida[] = [{ productoId: 'pz-hawaiana', cantidad: 1 }];
  for (const [i, lineas] of [llevar1, llevar2].entries()) {
    estado = aplicarVenta(estado, {
      lineas,
      cobro: cobroDemo(lineas, generador(9000 + i), false),
      enviarCocina: true,
      sedeId: SEDE,
    });
  }

  return sembrarSalon(estado);
}

// --- Salón en operación ------------------------------------------------

interface AjusteComanda {
  edadMin: number;
  /** Cuántos platos (en orden) ya salieron; el siguiente queda "preparando". */
  listos?: number | 'todos';
  entregada?: boolean;
}

/**
 * Las comandas se crean "ahora"; esto las envejece para que el KDS arranque con
 * tarjetas verdes, amarillas y rojas, y con platos a medio preparar.
 */
function envejecer(estado: EstadoApp, ajustes: Record<string, AjusteComanda>): EstadoApp {
  const ahora = Date.now();
  return {
    ...estado,
    comandas: estado.comandas.map((c) => {
      const a = ajustes[c.id];
      if (!a) return c;
      const creadaTs = ahora - a.edadMin * 60000;
      // Sin `listos`, el primer plato (el más lento, va primero) queda en preparación.
      const listos = a.listos === 'todos' ? c.items.length : a.listos ?? 0;
      return {
        ...c,
        creadaTs,
        entregadaTs: a.entregada ? Math.min(ahora, creadaTs + 18 * 60000) : undefined,
        items: c.items.map((it, i) => {
          if (it.anulado) return it;
          if (a.entregada || i < listos) {
            return {
              ...it,
              estado: 'Listo',
              listoTs: Math.min(ahora, creadaTs + it.tiempoPrep * 60000),
            };
          }
          return i === listos ? { ...it, estado: 'Preparando' } : it;
        }),
      };
    }),
  };
}

function sembrarSalon(estadoBase: EstadoApp): EstadoApp {
  let estado = estadoBase;
  const hoy = hoyISO();
  const manana = sumaISO(hoy, 1);
  const sesion = () => estado.sesiones[estado.sesiones.length - 1].id;
  const comanda = () => estado.comandas[estado.comandas.length - 1].id;
  const pedir = (sesionId: string, lineas: LineaPedida[], captura: CapturaComanda = 'Celular') => {
    estado = aplicarComandaMesa(estado, { sesionId, lineas, captura });
    return comanda();
  };
  const [camilo, daniela, esteban] = MESEROS;

  // Reservas de hoy y mañana.
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '12:45', cliente: 'Almuerzo Petro', telefono: '310 223 3445', personas: 4, zona: 'Salón', mesaId: 'M-03', sedeId: SEDE }); // R-0001
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '19:00', cliente: 'Familia Ochoa', telefono: '311 998 8776', personas: 6, zona: 'Salón', mesaId: 'M-06', notas: 'Cumpleaños, llevan torta', sedeId: SEDE }); // R-0002
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '20:30', cliente: 'Grupo Herazo', telefono: '300 121 2121', personas: 8, zona: 'Privado', mesaId: 'M-15', sedeId: SEDE }); // R-0003
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '21:00', cliente: 'Nicolás Pardo', telefono: '315 445 5667', personas: 2, zona: 'Terraza', sedeId: SEDE }); // R-0004
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '18:30', cliente: 'Mesa Torres', telefono: '312 776 6554', personas: 3, sedeId: SEDE }); // R-0005
  estado = aplicarNuevaReserva(estado, { fecha: hoy, hora: '19:30', cliente: 'Cena Villadiego', telefono: '318 334 4556', personas: 4, zona: 'Salón', sedeId: SEDE }); // R-0006
  estado = aplicarNuevaReserva(estado, { fecha: manana, hora: '13:00', cliente: 'Oficina Delta', telefono: '301 556 6778', personas: 10, zona: 'Privado', mesaId: 'M-15', sedeId: SEDE });
  estado = aplicarNuevaReserva(estado, { fecha: manana, hora: '20:00', cliente: 'Aniversario Ríos', telefono: '311 202 0202', personas: 2, zona: 'Terraza', sedeId: SEDE });
  estado = aplicarEstadoReserva(estado, 'R-0002', 'Confirmada');
  estado = aplicarEstadoReserva(estado, 'R-0003', 'Confirmada');
  estado = aplicarEstadoReserva(estado, 'R-0005', 'No-show');
  estado = aplicarEstadoReserva(estado, 'R-0006', 'Cancelada');

  const ajustes: Record<string, AjusteComanda> = {};
  const aperturas: Record<string, number> = {};

  // Almuerzo ya cobrado: M-03 queda por limpiar.
  estado = aplicarSentarReserva(estado, { reservaId: 'R-0001', mesaId: 'M-03', comensales: 4, mesero: camilo });
  const almuerzo = sesion();
  const almuerzoLineas: LineaPedida[] = [
    { productoId: 'pz-costena', cantidad: 1 },
    { productoId: 'patacon-todo', cantidad: 1 },
    { productoId: 'limonada-coco', cantidad: 4 },
  ];
  ajustes[pedir(almuerzo, almuerzoLineas)] = { edadMin: 95, entregada: true };
  const base = almuerzoLineas.reduce((s, l) => s + (precio.get(l.productoId) ?? 0) * l.cantidad, 0);
  const propina = Math.round(base * PROPINA_SUGERIDA);
  estado = aplicarCobrarMesa(estado, almuerzo, {
    documento: 'FE',
    cliente: EMPRESAS[0],
    propina,
    pagos: [{ medio: 'Bre-B', monto: base + Math.round(base * IMPUESTO_CONSUMO) + propina }],
  });
  aperturas[almuerzo] = 100;

  // Familia Ochoa: primera ronda ya servida, la segunda en cocina.
  estado = aplicarSentarReserva(estado, { reservaId: 'R-0002', mesaId: 'M-06', comensales: 6, mesero: daniela });
  const ochoa = sesion();
  ajustes[pedir(ochoa, [
    { productoId: 'picada-4', cantidad: 1 },
    { productoId: 'jugo-agua', cantidad: 4, nota: 'Corozo' },
    { productoId: 'gaseosa-15', cantidad: 1 },
  ])] = { edadMin: 48, entregada: true };
  ajustes[pedir(ochoa, [
    { productoId: 'pz-hawaiana', cantidad: 1, nota: 'Mitad y mitad con pollo' },
    { productoId: 'brownie', cantidad: 2 },
  ])] = { edadMin: 9, listos: 0 };
  aperturas[ochoa] = 55;

  // Walk-in de 4: pizza mexicana y salchipapas, ya un poco atrasada.
  estado = aplicarAbrirMesa(estado, { mesaId: 'M-01', comensales: 4, mesero: camilo });
  const m1 = sesion();
  ajustes[pedir(m1, [
    { productoId: 'pz-mexicana', cantidad: 1 },
    { productoId: 'salchipapa-esp', cantidad: 1 },
    { productoId: 'jugo-leche', cantidad: 2, nota: 'Mango' },
    { productoId: 'gaseosa', cantidad: 2 },
  ])] = { edadMin: 17 };
  aperturas[m1] = 22;

  // Terraza 3: la comanda más atrasada (roja).
  estado = aplicarAbrirMesa(estado, { mesaId: 'M-11', comensales: 2, mesero: esteban });
  const m11 = sesion();
  ajustes[pedir(m11, [
    { productoId: 'pz-costena', cantidad: 1 },
    { productoId: 'limonada-coco', cantidad: 2 },
  ])] = { edadMin: 24 };
  aperturas[m11] = 30;

  // Mesa 8: comanda de papel recién digitada en caja.
  estado = aplicarAbrirMesa(estado, { mesaId: 'M-08', comensales: 2, mesero: esteban });
  const m8 = sesion();
  ajustes[pedir(m8, [
    { productoId: 'combo-costeno', cantidad: 1 },
    { productoId: 'perro-ranchero', cantidad: 1, nota: 'Sin cebolla' },
    { productoId: 'gaseosa', cantidad: 1 },
  ], 'Papel')] = { edadMin: 3 };
  aperturas[m8] = 8;

  // Terraza 4: todo listo en el pase, esperando que el mesero lo recoja.
  estado = aplicarAbrirMesa(estado, { mesaId: 'M-12', comensales: 3, mesero: daniela });
  const m12 = sesion();
  ajustes[pedir(m12, [
    { productoId: 'mazorcada', cantidad: 1 },
    { productoId: 'arepa-huevo', cantidad: 3 },
    { productoId: 'jugo-agua', cantidad: 3, nota: 'Maracuyá' },
  ])] = { edadMin: 11, listos: 'todos' };
  aperturas[m12] = 15;

  // Para llevar y domicilios del día, creados antes de sembrar el salón.
  const edades: Record<string, AjusteComanda[]> = {
    Mostrador: [{ edadMin: 7, listos: 1 }, { edadMin: 2 }],
    Domicilio: [{ edadMin: 13, listos: 2 }, { edadMin: 5 }],
  };
  for (const origen of ['Mostrador', 'Domicilio'] as const) {
    estado.comandas
      .filter((c) => c.origen === origen && !c.entregadaTs)
      .forEach((c, i) => {
        ajustes[c.id] = edades[origen][i] ?? { edadMin: 1 };
      });
  }

  estado = envejecer(estado, ajustes);

  const ahora = Date.now();
  return {
    ...estado,
    sesiones: estado.sesiones.map((s) => {
      const abre = aperturas[s.id];
      if (abre == null) return s;
      return {
        ...s,
        aperturaTs: ahora - abre * 60000,
        cierreTs: s.estado === 'Cerrada' ? ahora - 40 * 60000 : s.cierreTs,
      };
    }),
  };
}
