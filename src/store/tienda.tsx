import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type {
  CanalDomicilio,
  CategoriaGasto,
  CategoriaProducto,
  DestinoCompra,
  Domiciliario,
  EstadoApp,
  EstadoEvento,
  EstadoReserva,
  Empleado,
  FormaPago,
  FormaPagoCompra,
  FormaPagoDomicilio,
  Producto,
  TipoEvento,
  ZonaDomicilio,
  ZonaSalon,
} from '../types';
import { construirEstadoInicial } from '../data/seed';
import { TODAS_SEDES } from '../data/sedes';
import {
  aplicarAvancePedido,
  aplicarCancelacionPedido,
  aplicarCompra,
  aplicarGasto,
  aplicarLiquidacionPlataforma,
  aplicarNomina,
  aplicarNuevoPedido,
  aplicarVenta,
} from '../lib/operaciones';
import {
  aplicarAbrirMesa,
  aplicarCerrarMesa,
  aplicarConsumo,
  aplicarEstadoReserva,
  aplicarLimpiarMesa,
  aplicarNuevaReserva,
  aplicarQuitarConsumo,
  aplicarSentarReserva,
} from '../lib/salon';
import {
  aplicarAnticipoEvento,
  aplicarCotizarEvento,
  aplicarEstadoEvento,
  aplicarNuevaSolicitudEvento,
} from '../lib/eventos';

export type Accion =
  | {
      tipo: 'VENTA';
      lineas: { productoId: string; cantidad: number }[];
      formaPago: FormaPago;
      sedeId: string;
    }
  | {
      tipo: 'COMPRA';
      proveedor: string;
      concepto: string;
      monto: number;
      destino: DestinoCompra;
      categoriaGasto?: CategoriaGasto;
      formaPago: FormaPagoCompra;
      sedeId: string;
    }
  | {
      tipo: 'GASTO';
      categoria: CategoriaGasto;
      concepto: string;
      monto: number;
      formaPago: FormaPago;
      sedeId: string;
    }
  | { tipo: 'NOMINA'; periodo: string; empleadoIds: string[]; sedeId?: string }
  | {
      tipo: 'NUEVO_EMPLEADO';
      nombre: string;
      cargo: string;
      salarioMensual: number;
      sedeId: string;
    }
  | {
      tipo: 'NUEVO_PRODUCTO';
      nombre: string;
      categoria: CategoriaProducto;
      precio: number;
      costo: number;
      emoji?: string;
    }
  | {
      tipo: 'NUEVO_PEDIDO';
      cliente: string;
      telefono: string;
      direccion: string;
      zona: ZonaDomicilio;
      canal: CanalDomicilio;
      domiciliarioId?: string;
      plataformaId?: string;
      domicilio: number;
      formaPago: FormaPagoDomicilio;
      lineas: { productoId: string; cantidad: number }[];
      sedeId: string;
    }
  | { tipo: 'AVANZAR_PEDIDO'; pedidoId: string }
  | { tipo: 'CANCELAR_PEDIDO'; pedidoId: string }
  | { tipo: 'LIQUIDAR_PLATAFORMA'; plataformaId: string; sedeId?: string }
  | { tipo: 'NUEVO_DOMICILIARIO'; nombre: string; telefono: string; tarifaEntrega: number }
  | {
      tipo: 'NUEVA_RESERVA';
      fecha: string;
      hora: string;
      cliente: string;
      telefono: string;
      personas: number;
      zona?: ZonaSalon;
      mesaId?: string;
      notas?: string;
      sedeId: string;
    }
  | {
      tipo: 'ESTADO_RESERVA';
      reservaId: string;
      estado: Extract<EstadoReserva, 'Pendiente' | 'Confirmada' | 'No-show' | 'Cancelada'>;
    }
  | {
      tipo: 'SENTAR_RESERVA';
      reservaId: string;
      mesaId: string;
      comensales: number;
      mesero: string;
    }
  | { tipo: 'ABRIR_MESA'; mesaId: string; comensales: number; mesero: string }
  | { tipo: 'CONSUMO_MESA'; sesionId: string; productoId: string; delta: number }
  | { tipo: 'QUITAR_CONSUMO'; sesionId: string; productoId: string }
  | { tipo: 'CERRAR_MESA'; sesionId: string }
  | { tipo: 'LIMPIAR_MESA'; mesaId: string }
  | {
      tipo: 'NUEVA_SOLICITUD_EVENTO';
      sedeId: string;
      cliente: string;
      telefono: string;
      fecha: string;
      hora: string;
      lugar: string;
      tipo_evento: TipoEvento;
      numeroPersonas: number;
      descripcion: string;
    }
  | { tipo: 'COTIZAR_EVENTO'; eventoId: string; valorCotizado: number }
  | { tipo: 'ESTADO_EVENTO'; eventoId: string; estado: EstadoEvento }
  | { tipo: 'ANTICIPO_EVENTO'; eventoId: string; pagado: boolean; valorAnticipo?: number }
  | { tipo: 'REINICIAR' };

const EMOJI_POR_CATEGORIA: Record<CategoriaProducto, string> = {
  Combos: '🍔',
  Hamburguesas: '🍔',
  Acompañamientos: '🍟',
  Bebidas: '🥤',
  Postres: '🍨',
};

function reductor(estado: EstadoApp, accion: Accion): EstadoApp {
  switch (accion.tipo) {
    case 'VENTA':
      return aplicarVenta(estado, {
        lineas: accion.lineas,
        formaPago: accion.formaPago,
        sedeId: accion.sedeId,
      });

    case 'COMPRA':
      return aplicarCompra(estado, accion);

    case 'GASTO':
      return aplicarGasto(estado, accion);

    case 'NOMINA':
      return aplicarNomina(estado, {
        periodo: accion.periodo,
        empleadoIds: accion.empleadoIds,
        sedeId: accion.sedeId,
      });

    case 'NUEVO_EMPLEADO': {
      const nuevo: Empleado = {
        id: `emp-${estado.empleados.length + 1}-${Date.now()}`,
        nombre: accion.nombre,
        cargo: accion.cargo,
        salarioMensual: accion.salarioMensual,
        activo: true,
        sedeId: accion.sedeId,
      };
      return { ...estado, empleados: [...estado.empleados, nuevo] };
    }

    case 'NUEVO_PRODUCTO': {
      const nuevo: Producto = {
        id: `prod-${estado.productos.length + 1}-${Date.now()}`,
        nombre: accion.nombre,
        categoria: accion.categoria,
        precio: accion.precio,
        costo: accion.costo,
        emoji: accion.emoji ?? EMOJI_POR_CATEGORIA[accion.categoria],
      };
      return { ...estado, productos: [...estado.productos, nuevo] };
    }

    case 'NUEVO_PEDIDO':
      return aplicarNuevoPedido(estado, {
        cliente: accion.cliente,
        telefono: accion.telefono,
        direccion: accion.direccion,
        zona: accion.zona,
        canal: accion.canal,
        domiciliarioId: accion.domiciliarioId,
        plataformaId: accion.plataformaId,
        domicilio: accion.domicilio,
        formaPago: accion.formaPago,
        lineas: accion.lineas,
        sedeId: accion.sedeId,
      });

    case 'AVANZAR_PEDIDO':
      return aplicarAvancePedido(estado, accion.pedidoId);

    case 'CANCELAR_PEDIDO':
      return aplicarCancelacionPedido(estado, accion.pedidoId);

    case 'LIQUIDAR_PLATAFORMA':
      return aplicarLiquidacionPlataforma(estado, accion.plataformaId, accion.sedeId);

    case 'NUEVO_DOMICILIARIO': {
      const nuevo: Domiciliario = {
        id: `dom-${estado.domiciliarios.length + 1}-${Date.now()}`,
        nombre: accion.nombre,
        telefono: accion.telefono,
        tarifaEntrega: accion.tarifaEntrega,
        activo: true,
      };
      return { ...estado, domiciliarios: [...estado.domiciliarios, nuevo] };
    }

    case 'NUEVA_RESERVA':
      return aplicarNuevaReserva(estado, {
        fecha: accion.fecha,
        hora: accion.hora,
        cliente: accion.cliente,
        telefono: accion.telefono,
        personas: accion.personas,
        zona: accion.zona,
        mesaId: accion.mesaId,
        notas: accion.notas,
        sedeId: accion.sedeId,
      });

    case 'ESTADO_RESERVA':
      return aplicarEstadoReserva(estado, accion.reservaId, accion.estado);

    case 'SENTAR_RESERVA':
      return aplicarSentarReserva(estado, {
        reservaId: accion.reservaId,
        mesaId: accion.mesaId,
        comensales: accion.comensales,
        mesero: accion.mesero,
      });

    case 'ABRIR_MESA':
      return aplicarAbrirMesa(estado, {
        mesaId: accion.mesaId,
        comensales: accion.comensales,
        mesero: accion.mesero,
      });

    case 'CONSUMO_MESA':
      return aplicarConsumo(estado, accion.sesionId, accion.productoId, accion.delta);

    case 'QUITAR_CONSUMO':
      return aplicarQuitarConsumo(estado, accion.sesionId, accion.productoId);

    case 'CERRAR_MESA':
      return aplicarCerrarMesa(estado, accion.sesionId);

    case 'LIMPIAR_MESA':
      return aplicarLimpiarMesa(estado, accion.mesaId);

    case 'NUEVA_SOLICITUD_EVENTO':
      return aplicarNuevaSolicitudEvento(estado, {
        sedeId: accion.sedeId,
        cliente: accion.cliente,
        telefono: accion.telefono,
        fecha: accion.fecha,
        hora: accion.hora,
        lugar: accion.lugar,
        tipo: accion.tipo_evento,
        numeroPersonas: accion.numeroPersonas,
        descripcion: accion.descripcion,
      });

    case 'COTIZAR_EVENTO':
      return aplicarCotizarEvento(estado, accion.eventoId, accion.valorCotizado);

    case 'ESTADO_EVENTO':
      return aplicarEstadoEvento(estado, accion.eventoId, accion.estado);

    case 'ANTICIPO_EVENTO':
      return aplicarAnticipoEvento(estado, accion.eventoId, accion.pagado, accion.valorAnticipo);

    case 'REINICIAR':
      return construirEstadoInicial();

    default:
      return estado;
  }
}

interface ValorContexto {
  estado: EstadoApp;
  dispatch: (accion: Accion) => void;
  /** Sede seleccionada globalmente: el id de una sede, o `TODAS_SEDES` para el consolidado. */
  sedeActual: string;
  setSedeActual: (sedeId: string) => void;
}

const TiendaContext = createContext<ValorContexto | null>(null);

export function TiendaProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reductor, undefined, construirEstadoInicial);
  const [sedeActual, setSedeActual] = useState<string>(TODAS_SEDES);
  const valor = useMemo(
    () => ({ estado, dispatch, sedeActual, setSedeActual }),
    [estado, sedeActual],
  );
  return <TiendaContext.Provider value={valor}>{children}</TiendaContext.Provider>;
}

export function useTienda(): ValorContexto {
  const ctx = useContext(TiendaContext);
  if (!ctx) throw new Error('useTienda debe usarse dentro de <TiendaProvider>');
  return ctx;
}
