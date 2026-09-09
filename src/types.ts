export type TipoCuenta = 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Gasto';

export interface Cuenta {
  id: number;
  nombre: string;
  tipo: TipoCuenta;
}

export interface DetalleAsiento {
  cuenta_id: number;
  debito: number;
  credito: number;
}

export type OrigenAsiento =
  | 'apertura'
  | 'venta'
  | 'compra'
  | 'gasto'
  | 'nomina'
  | 'domicilio'
  | 'liquidacion';

export interface Asiento {
  id: string;
  fecha: string; // ISO corta: YYYY-MM-DD
  descripcion: string;
  origen: OrigenAsiento;
  referencia?: string; // folio de la venta / compra / nómina que lo generó
  detalles: DetalleAsiento[];
}

export type CategoriaProducto =
  | 'Hamburguesas'
  | 'Combos'
  | 'Acompañamientos'
  | 'Bebidas'
  | 'Postres';

export interface ComponenteCombo {
  productoId: string;
  cantidad: number;
}

export interface Producto {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precio: number; // precio de venta base, sin impuesto
  costo: number; // costo estimado de insumos, alimenta el costo de ventas
  emoji: string; // representación visual del producto en el punto de venta
  descripcion?: string;
  /** Solo para combos: productos que arma, para mostrar el detalle y el ahorro. */
  componentes?: ComponenteCombo[];
}

export interface Empleado {
  id: string;
  nombre: string;
  cargo: string;
  salarioMensual: number;
  activo: boolean;
}

export type FormaPago = 'Efectivo' | 'Transferencia';
export type FormaPagoCompra = FormaPago | 'Crédito';
export type FormaPagoDomicilio = FormaPago | 'Plataforma';
export type CanalVenta = 'Mostrador' | 'Domicilio';

export type CategoriaGasto =
  | 'Arrendamiento'
  | 'Servicios públicos'
  | 'Mercadeo'
  | 'Mantenimiento'
  | 'Otros';

export interface LineaVenta {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnit: number;
  costoUnit: number;
}

export interface Venta {
  id: string; // V-0001
  fecha: string;
  lineas: LineaVenta[];
  base: number; // subtotal sin impuesto
  impuesto: number; // impuesto al consumo
  total: number; // base + impuesto (+ domicilio si aplica)
  costo: number; // costo de los insumos vendidos
  formaPago: FormaPagoDomicilio;
  canal: CanalVenta;
  domicilio: number; // ingreso por envío cobrado al cliente (0 en mostrador)
  pedidoId?: string; // folio del pedido a domicilio que la originó
  asientoId: string;
}

export type DestinoCompra = 'Inventario' | 'Gasto';

export interface Compra {
  id: string; // C-0001
  fecha: string;
  proveedor: string;
  concepto: string;
  monto: number;
  destino: DestinoCompra;
  categoriaGasto?: CategoriaGasto;
  formaPago: FormaPagoCompra;
  asientoId: string;
}

export interface Gasto {
  id: string; // G-0001
  fecha: string;
  categoria: CategoriaGasto;
  concepto: string;
  monto: number;
  formaPago: FormaPago;
  asientoId: string;
}

export interface LineaNomina {
  empleadoId: string;
  nombre: string;
  cargo: string;
  devengado: number;
  deducciones: number;
  neto: number;
}

export interface PagoNomina {
  id: string; // N-0001
  fecha: string;
  periodo: string;
  lineas: LineaNomina[];
  totalDevengado: number;
  totalDeducciones: number;
  totalNeto: number;
  asientoId: string;
}

export type ZonaDomicilio = 'Centro' | 'Chapinero' | 'Norte' | 'Sur' | 'Occidente';
export type CanalDomicilio = 'Propio' | 'Plataforma';
export type EstadoPedido =
  | 'Recibido'
  | 'En preparación'
  | 'En camino'
  | 'Entregado'
  | 'Cancelado';

export interface Domiciliario {
  id: string;
  nombre: string;
  telefono: string;
  tarifaEntrega: number; // lo que se le paga por cada entrega
  activo: boolean;
}

export interface Plataforma {
  id: string;
  nombre: string;
  comisionPct: number; // fracción sobre la base de productos (0.22 = 22%)
  activo: boolean;
}

export interface PedidoDomicilio {
  id: string; // D-0001
  fecha: string;
  creado: number; // orden de llegada
  cliente: string;
  telefono: string;
  direccion: string;
  zona: ZonaDomicilio;
  canal: CanalDomicilio;
  domiciliarioId?: string;
  plataformaId?: string;
  lineas: LineaVenta[];
  base: number;
  impuesto: number;
  domicilio: number; // valor del envío cobrado al cliente
  costoProductos: number;
  costoReparto: number; // pago al domiciliario propio (0 si plataforma)
  comisionPlataforma: number; // comisión de la plataforma (0 si propio)
  formaPago: FormaPagoDomicilio;
  estado: EstadoPedido;
  liquidado?: boolean; // solo plataforma: ya se cobró la liquidación
  ventaId?: string;
  asientoId?: string;
}

// --- Salón: mesas, reservas y ocupación ---------------------------

export type ZonaSalon = 'Salón' | 'Terraza' | 'Barra' | 'Privado';
export type FormaMesa = 'redonda' | 'cuadrada' | 'rectangular';

/**
 * Estado operativo de una mesa. No se guarda: se deriva de las sesiones
 * abiertas, las reservas del día y la marca de limpieza (`estadoDeMesa`).
 */
export type EstadoMesa = 'Libre' | 'Ocupada' | 'Reservada' | 'Por limpiar';

export interface Mesa {
  id: string; // M-01
  nombre: string; // "Mesa 1"
  zona: ZonaSalon;
  capacidad: number; // sillas
  forma: FormaMesa;
  /** Posición del centro en la planta, en metros (origen al centro del local). */
  x: number;
  z: number;
  ancho: number; // dimensiones del tablero para el modelo 3D
  fondo: number;
  /** Queda en true al cerrar una cuenta; el salón la marca "Por limpiar". */
  necesitaLimpieza: boolean;
}

export type EstadoReserva =
  | 'Pendiente'
  | 'Confirmada'
  | 'Sentada'
  | 'Cumplida'
  | 'No-show'
  | 'Cancelada';

export interface Reserva {
  id: string; // R-0001
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  cliente: string;
  telefono: string;
  personas: number;
  zona?: ZonaSalon;
  mesaId?: string; // mesa asignada, si la hay
  notas?: string;
  estado: EstadoReserva;
  creada: number; // orden de llegada
  sesionId?: string; // sesión de mesa generada al sentar la reserva
}

export interface LineaConsumo {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnit: number;
}

export interface SesionMesa {
  id: string; // S-0001
  mesaId: string;
  fecha: string;
  aperturaTs: number; // Date.now() al sentar a los comensales
  cierreTs?: number;
  comensales: number;
  mesero: string;
  reservaId?: string;
  consumo: LineaConsumo[];
  base: number; // sin impuesto
  impuesto: number;
  total: number;
  estado: 'Abierta' | 'Cerrada';
}

export interface EstadoApp {
  cuentas: Cuenta[];
  productos: Producto[];
  empleados: Empleado[];
  domiciliarios: Domiciliario[];
  plataformas: Plataforma[];
  asientos: Asiento[];
  ventas: Venta[];
  compras: Compra[];
  gastos: Gasto[];
  nominas: PagoNomina[];
  pedidos: PedidoDomicilio[];
  mesas: Mesa[];
  reservas: Reserva[];
  sesiones: SesionMesa[];
}
