import type { EstadoApp, EstadoEvento, SolicitudEvento, TipoEvento } from '../types';
import { folio } from './formato';

export interface EntradaSolicitudEvento {
  sedeId: string;
  cliente: string;
  telefono: string;
  fecha: string;
  hora: string;
  lugar: string;
  tipo: TipoEvento;
  numeroPersonas: number;
  descripcion: string;
}

export function aplicarNuevaSolicitudEvento(
  estado: EstadoApp,
  entrada: EntradaSolicitudEvento,
): EstadoApp {
  if (!entrada.cliente.trim() || !entrada.sedeId || entrada.numeroPersonas <= 0) return estado;

  const solicitud: SolicitudEvento = {
    id: folio('EV', estado.eventos.length),
    sedeId: entrada.sedeId,
    cliente: entrada.cliente.trim(),
    telefono: entrada.telefono.trim(),
    fecha: entrada.fecha,
    hora: entrada.hora,
    lugar: entrada.lugar.trim(),
    tipo: entrada.tipo,
    numeroPersonas: entrada.numeroPersonas,
    descripcion: entrada.descripcion.trim(),
    estado: 'Pendiente por cotizar',
    anticipoPagado: false,
    creada: estado.eventos.length + 1,
  };

  return { ...estado, eventos: [...estado.eventos, solicitud] };
}

/** Registra o actualiza el valor cotizado y pasa la solicitud a "Cotizado". */
export function aplicarCotizarEvento(
  estado: EstadoApp,
  eventoId: string,
  valorCotizado: number,
): EstadoApp {
  if (valorCotizado <= 0) return estado;
  return {
    ...estado,
    eventos: estado.eventos.map((ev) =>
      ev.id === eventoId && ev.estado !== 'Realizado' && ev.estado !== 'Cancelado'
        ? { ...ev, valorCotizado, estado: 'Cotizado' }
        : ev,
    ),
  };
}

const TRANSICIONES_VALIDAS: Record<EstadoEvento, EstadoEvento[]> = {
  'Pendiente por cotizar': ['Cotizado', 'Cancelado'],
  Cotizado: ['Pendiente por cotizar', 'Confirmado', 'Cancelado'],
  Confirmado: ['Realizado', 'Cancelado'],
  Realizado: [],
  Cancelado: [],
};

export function aplicarEstadoEvento(
  estado: EstadoApp,
  eventoId: string,
  nuevo: EstadoEvento,
): EstadoApp {
  return {
    ...estado,
    eventos: estado.eventos.map((ev) =>
      ev.id === eventoId && TRANSICIONES_VALIDAS[ev.estado].includes(nuevo)
        ? { ...ev, estado: nuevo }
        : ev,
    ),
  };
}

export function aplicarAnticipoEvento(
  estado: EstadoApp,
  eventoId: string,
  pagado: boolean,
  valorAnticipo?: number,
): EstadoApp {
  return {
    ...estado,
    eventos: estado.eventos.map((ev) =>
      ev.id === eventoId
        ? { ...ev, anticipoPagado: pagado, valorAnticipo: pagado ? valorAnticipo : undefined }
        : ev,
    ),
  };
}

/** Solicitudes ordenadas por fecha y hora del evento (las más próximas primero). */
export const eventosOrdenados = (estado: EstadoApp): SolicitudEvento[] =>
  [...estado.eventos].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora),
  );

export interface IndicadoresEventos {
  total: number;
  pendientesPorCotizar: number;
  cotizados: number;
  confirmados: number;
  realizados: number;
  valorCotizadoPendiente: number; // cotizados + confirmados, sin anticipo pagado
  proximos30Dias: number;
}

export function indicadoresEventos(estado: EstadoApp, hoyISO: string): IndicadoresEventos {
  const limite = new Date(`${hoyISO}T00:00:00`);
  limite.setDate(limite.getDate() + 30);
  const limiteISO = limite.toISOString().slice(0, 10);

  const cuenta = (e: EstadoEvento) => estado.eventos.filter((ev) => ev.estado === e).length;

  return {
    total: estado.eventos.length,
    pendientesPorCotizar: cuenta('Pendiente por cotizar'),
    cotizados: cuenta('Cotizado'),
    confirmados: cuenta('Confirmado'),
    realizados: cuenta('Realizado'),
    valorCotizadoPendiente: estado.eventos
      .filter((ev) => (ev.estado === 'Cotizado' || ev.estado === 'Confirmado') && !ev.anticipoPagado)
      .reduce((s, ev) => s + (ev.valorCotizado ?? 0), 0),
    proximos30Dias: estado.eventos.filter(
      (ev) =>
        ev.fecha >= hoyISO &&
        ev.fecha <= limiteISO &&
        ev.estado !== 'Cancelado' &&
        ev.estado !== 'Realizado',
    ).length,
  };
}
