import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type {
  CanalDomicilio,
  CapturaComanda,
  CategoriaGasto,
  CategoriaProducto,
  DestinoCompra,
  Domiciliario,
  EstacionCocina,
  EstadoApp,
  EstadoReserva,
  Empleado,
  FormaPago,
  FormaPagoCompra,
  FormaPagoDomicilio,
  Producto,
  ZonaDomicilio,
  ZonaSalon,
} from '../types';
import { construirEstadoInicial } from '../data/seed';
import { SEDE_PRINCIPAL } from '../data/sedes';
import {
  aplicarAvancePedido,
  aplicarCancelacionPedido,
  aplicarCobrarMesa,
  aplicarCompra,
  aplicarGasto,
  aplicarLiquidacionPlataforma,
  aplicarNomina,
  aplicarNuevoPedido,
  aplicarVenta,
} from '../lib/operaciones';
import {
  aplicarAbrirMesa,
  aplicarEstadoReserva,
  aplicarLimpiarMesa,
  aplicarNuevaReserva,
  aplicarSentarReserva,
} from '../lib/salon';
import {
  aplicarAnularLinea,
  aplicarAvanzarItem,
  aplicarComandaMesa,
  aplicarEntregarComanda,
  aplicarListoEstacion,
  type LineaPedida,
} from '../lib/comandas';
import type { DatosCobro } from '../lib/facturacion';

export type Accion =
  | {
      tipo: 'VENTA';
      lineas: LineaPedida[];
      cobro: DatosCobro;
      enviarCocina: boolean;
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
  | { tipo: 'COMANDA_MESA'; sesionId: string; lineas: LineaPedida[]; captura: CapturaComanda }
  | { tipo: 'ANULAR_LINEA'; comandaId: string; lineaId: string; motivo: string }
  | { tipo: 'AVANZAR_ITEM'; comandaId: string; itemId: string }
  | { tipo: 'LISTO_ESTACION'; comandaId: string; estacion?: EstacionCocina }
  | { tipo: 'ENTREGAR_COMANDA'; comandaId: string }
  | { tipo: 'COBRAR_MESA'; sesionId: string; cobro: DatosCobro }
  | { tipo: 'LIMPIAR_MESA'; mesaId: string }
  | { tipo: 'AGOTADO'; productoId: string; agotado: boolean }
  | { tipo: 'REINICIAR' };

const EMOJI_POR_CATEGORIA: Record<CategoriaProducto, string> = {
  Combos: '🍔',
  Pizzas: '🍕',
  Hamburguesas: '🍔',
  Perros: '🌭',
  'Salchipapas y picadas': '🍟',
  Fritos: '🫓',
  Bebidas: '🥤',
  Postres: '🍰',
};

const ESTACION_POR_CATEGORIA: Record<CategoriaProducto, EstacionCocina> = {
  Combos: 'Cocina',
  Pizzas: 'Horno',
  Hamburguesas: 'Cocina',
  Perros: 'Cocina',
  'Salchipapas y picadas': 'Cocina',
  Fritos: 'Cocina',
  Bebidas: 'Barra',
  Postres: 'Barra',
};

function reductor(estado: EstadoApp, accion: Accion): EstadoApp {
  switch (accion.tipo) {
    case 'VENTA':
      return aplicarVenta(estado, {
        lineas: accion.lineas,
        cobro: accion.cobro,
        enviarCocina: accion.enviarCocina,
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
        estacion: ESTACION_POR_CATEGORIA[accion.categoria],
        tiempoPrep: ESTACION_POR_CATEGORIA[accion.categoria] === 'Barra' ? 3 : 10,
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

    case 'COMANDA_MESA':
      return aplicarComandaMesa(estado, {
        sesionId: accion.sesionId,
        lineas: accion.lineas,
        captura: accion.captura,
      });

    case 'ANULAR_LINEA':
      return aplicarAnularLinea(estado, accion.comandaId, accion.lineaId, accion.motivo);

    case 'AVANZAR_ITEM':
      return aplicarAvanzarItem(estado, accion.comandaId, accion.itemId);

    case 'LISTO_ESTACION':
      return aplicarListoEstacion(estado, accion.comandaId, accion.estacion);

    case 'ENTREGAR_COMANDA':
      return aplicarEntregarComanda(estado, accion.comandaId);

    case 'COBRAR_MESA':
      return aplicarCobrarMesa(estado, accion.sesionId, accion.cobro);

    case 'LIMPIAR_MESA':
      return aplicarLimpiarMesa(estado, accion.mesaId);

    case 'AGOTADO':
      return {
        ...estado,
        productos: estado.productos.map((p) =>
          p.id === accion.productoId ? { ...p, agotado: accion.agotado } : p,
        ),
      };

    case 'REINICIAR':
      return construirEstadoInicial();

    default:
      return estado;
  }
}

interface ValorContexto {
  estado: EstadoApp;
  dispatch: (accion: Accion) => void;
  /** Sede con la que se opera. Hoy hay una sola; el modelo ya admite más. */
  sede: string;
}

const TiendaContext = createContext<ValorContexto | null>(null);

export function TiendaProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reductor, undefined, construirEstadoInicial);
  const valor = useMemo(() => ({ estado, dispatch, sede: SEDE_PRINCIPAL }), [estado]);
  return <TiendaContext.Provider value={valor}>{children}</TiendaContext.Provider>;
}

export function useTienda(): ValorContexto {
  const ctx = useContext(TiendaContext);
  if (!ctx) throw new Error('useTienda debe usarse dentro de <TiendaProvider>');
  return ctx;
}
