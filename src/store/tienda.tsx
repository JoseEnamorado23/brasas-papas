import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type {
  CanalDomicilio,
  CategoriaGasto,
  CategoriaProducto,
  DestinoCompra,
  Domiciliario,
  EstadoApp,
  Empleado,
  FormaPago,
  FormaPagoCompra,
  FormaPagoDomicilio,
  Producto,
  ZonaDomicilio,
} from '../types';
import { construirEstadoInicial } from '../data/seed';
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

export type Accion =
  | { tipo: 'VENTA'; lineas: { productoId: string; cantidad: number }[]; formaPago: FormaPago }
  | {
      tipo: 'COMPRA';
      proveedor: string;
      concepto: string;
      monto: number;
      destino: DestinoCompra;
      categoriaGasto?: CategoriaGasto;
      formaPago: FormaPagoCompra;
    }
  | {
      tipo: 'GASTO';
      categoria: CategoriaGasto;
      concepto: string;
      monto: number;
      formaPago: FormaPago;
    }
  | { tipo: 'NOMINA'; periodo: string; empleadoIds: string[] }
  | { tipo: 'NUEVO_EMPLEADO'; nombre: string; cargo: string; salarioMensual: number }
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
    }
  | { tipo: 'AVANZAR_PEDIDO'; pedidoId: string }
  | { tipo: 'CANCELAR_PEDIDO'; pedidoId: string }
  | { tipo: 'LIQUIDAR_PLATAFORMA'; plataformaId: string }
  | { tipo: 'NUEVO_DOMICILIARIO'; nombre: string; telefono: string; tarifaEntrega: number }
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
      return aplicarVenta(estado, { lineas: accion.lineas, formaPago: accion.formaPago });

    case 'COMPRA':
      return aplicarCompra(estado, accion);

    case 'GASTO':
      return aplicarGasto(estado, accion);

    case 'NOMINA':
      return aplicarNomina(estado, {
        periodo: accion.periodo,
        empleadoIds: accion.empleadoIds,
      });

    case 'NUEVO_EMPLEADO': {
      const nuevo: Empleado = {
        id: `emp-${estado.empleados.length + 1}-${Date.now()}`,
        nombre: accion.nombre,
        cargo: accion.cargo,
        salarioMensual: accion.salarioMensual,
        activo: true,
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
      });

    case 'AVANZAR_PEDIDO':
      return aplicarAvancePedido(estado, accion.pedidoId);

    case 'CANCELAR_PEDIDO':
      return aplicarCancelacionPedido(estado, accion.pedidoId);

    case 'LIQUIDAR_PLATAFORMA':
      return aplicarLiquidacionPlataforma(estado, accion.plataformaId);

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

    case 'REINICIAR':
      return construirEstadoInicial();

    default:
      return estado;
  }
}

interface ValorContexto {
  estado: EstadoApp;
  dispatch: (accion: Accion) => void;
}

const TiendaContext = createContext<ValorContexto | null>(null);

export function TiendaProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reductor, undefined, construirEstadoInicial);
  const valor = useMemo(() => ({ estado, dispatch }), [estado]);
  return <TiendaContext.Provider value={valor}>{children}</TiendaContext.Provider>;
}

export function useTienda(): ValorContexto {
  const ctx = useContext(TiendaContext);
  if (!ctx) throw new Error('useTienda debe usarse dentro de <TiendaProvider>');
  return ctx;
}
