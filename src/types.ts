export type TipoCuenta = 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Gasto';

// --- Sedes ------------------------------------------------------------

export interface Sede {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
}

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
  /** Sede que originó el movimiento; ausente en asientos compartidos (p. ej. la apertura). */
  sedeId?: string;
}

export type CategoriaProducto =
  | 'Combos'
  | 'Pizzas'
  | 'Hamburguesas'
  | 'Perros'
  | 'Salchipapas y picadas'
  | 'Fritos'
  | 'Bebidas'
  | 'Postres';

/** Estación de cocina a la que el KDS enruta cada producto. */
export type EstacionCocina = 'Horno' | 'Cocina' | 'Barra';

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
  /** Estación que lo prepara (los combos se reparten según sus componentes). */
  estacion: EstacionCocina;
  /** Minutos estándar de preparación: alimentan el semáforo del KDS. */
  tiempoPrep: number;
  /** Marcado como agotado: el mesero y la caja no lo pueden vender. */
  agotado?: boolean;
}

export interface Empleado {
  id: string;
  nombre: string;
  cargo: string;
  salarioMensual: number;
  activo: boolean;
  sedeId: string;
}

export type FormaPago = 'Efectivo' | 'Transferencia';
export type FormaPagoCompra = FormaPago | 'Crédito';
export type CanalVenta = 'Mesa' | 'Mostrador' | 'Domicilio';

/** Medios con los que se cobra en caja. Todo lo que no es efectivo entra a bancos. */
export type MedioPago = 'Efectivo' | 'Nequi' | 'Daviplata' | 'Bre-B' | 'Tarjeta';
export type FormaPagoDomicilio = MedioPago | 'Plataforma';
/** Resumen del pago de una venta: un medio, varios (mixto) o la plataforma de domicilios. */
export type FormaPagoVenta = FormaPagoDomicilio | 'Mixto';

export interface Pago {
  medio: MedioPago;
  monto: number;
}

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
  total: number; // base + impuesto (+ domicilio si aplica); no incluye propina
  costo: number; // costo de los insumos vendidos
  formaPago: FormaPagoVenta;
  pagos?: Pago[];
  /** Propina voluntaria: no es ingreso del restaurante, se debe a los empleados. */
  propina: number;
  canal: CanalVenta;
  domicilio: number; // ingreso por envío cobrado al cliente (0 en mostrador)
  pedidoId?: string; // folio del pedido a domicilio que la originó
  sesionId?: string; // sesión de mesa que la originó
  facturaId?: string; // documento electrónico emitido
  asientoId: string;
  sedeId: string;
}

// --- Facturación electrónica (simulada) -----------------------------

/** POS = documento equivalente electrónico tiquete POS; FE = factura electrónica de venta. */
export type TipoDocumento = 'POS' | 'FE';
export type TipoIdentificacion = 'CC' | 'NIT' | 'CE';

export interface ClienteFactura {
  tipoId: TipoIdentificacion;
  numero: string;
  nombre: string;
  correo?: string;
}

export interface Factura {
  id: string; // POS-1001 · FE-201
  tipo: TipoDocumento;
  prefijo: string;
  numero: number;
  fecha: string;
  emitidaTs: number;
  ventaId: string;
  cliente: ClienteFactura;
  lineas: LineaVenta[];
  base: number;
  impuesto: number;
  domicilio: number;
  propina: number;
  total: number; // lo que paga el cliente, incluida la propina
  pagos: Pago[];
  formaPago: FormaPagoVenta;
  /** Código único (CUDE para POS, CUFE para FE). Aquí es una huella simulada. */
  codigoUnico: string;
  canal: CanalVenta;
  referencia?: string; // "Mesa 6", "Domicilio D-0012"…
  atendio?: string;
}

// --- Comandas y cocina (KDS) ----------------------------------------

export type OrigenComanda = 'Mesa' | 'Mostrador' | 'Domicilio';
/** Cómo llegó la comanda: celular del mesero, comanda de papel digitada, o tomada en caja (mostrador y domicilios). */
export type CapturaComanda = 'Celular' | 'Papel' | 'Caja';
export type EstadoItemComanda = 'Pendiente' | 'Preparando' | 'Listo';

/** Lo que pidió el cliente, tal como se cobra (un combo es una sola línea). */
export interface LineaComanda {
  id: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnit: number;
  nota?: string;
  anulada?: { motivo: string; ts: number };
}

/** Lo que prepara la cocina: los combos se abren en sus componentes. */
export interface ItemComanda {
  id: string;
  lineaId: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  nota?: string;
  estacion: EstacionCocina;
  tiempoPrep: number;
  estado: EstadoItemComanda;
  listoTs?: number;
  /** Combo al que pertenece el componente (el KDS reparte los combos por estación). */
  combo?: string;
  anulado?: { motivo: string; ts: number };
}

export interface Comanda {
  id: string; // K-0001
  origen: OrigenComanda;
  referencia: string; // id de la sesión, venta o pedido
  etiqueta: string; // "Mesa 6", "Para llevar V-0045", "Domicilio D-0019"
  ronda: number;
  mesero?: string;
  captura: CapturaComanda;
  creadaTs: number;
  lineas: LineaComanda[];
  items: ItemComanda[];
  entregadaTs?: number;
  sedeId: string;
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
  sedeId: string;
}

export interface Gasto {
  id: string; // G-0001
  fecha: string;
  categoria: CategoriaGasto;
  concepto: string;
  monto: number;
  formaPago: FormaPago;
  asientoId: string;
  sedeId: string;
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
  /** Sede a la que pertenece la nómina; ausente si el pago abarca varias sedes. */
  sedeId?: string;
}

export type ZonaDomicilio =
  | 'Centro'
  | 'Norte'
  | 'La Castellana'
  | 'El Recreo'
  | 'Mocarí'
  | 'La Granja'
  | 'Sur';
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
  sedeId: string;
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
  sedeId: string;
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
  sedeId: string;
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
  ventaId?: string; // venta generada al cobrar la mesa
  sedeId: string;
}

export interface EstadoApp {
  sedes: Sede[];
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
  comandas: Comanda[];
  facturas: Factura[];
}
