import type {
  EstadoApp,
  EstadoMesa,
  EstadoReserva,
  LineaConsumo,
  Mesa,
  Reserva,
  SesionMesa,
  ZonaSalon,
} from '../types';
import { IMPUESTO_CONSUMO } from '../data/cuentas';
import { folio, hoyISO } from './formato';

// --- Cálculo del consumo de una sesión --------------------------------

export interface TotalesConsumo {
  base: number;
  impuesto: number;
  total: number;
}

export function totalesConsumo(lineas: LineaConsumo[]): TotalesConsumo {
  const base = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const impuesto = Math.round(base * IMPUESTO_CONSUMO);
  return { base, impuesto, total: base + impuesto };
}

const conTotales = (sesion: SesionMesa): SesionMesa => ({
  ...sesion,
  ...totalesConsumo(sesion.consumo),
});

// --- Reservas --------------------------------------------------------

export interface EntradaReserva {
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

export function aplicarNuevaReserva(estado: EstadoApp, entrada: EntradaReserva): EstadoApp {
  if (!entrada.cliente.trim() || entrada.personas <= 0 || !entrada.sedeId) return estado;

  const reserva: Reserva = {
    id: folio('R', estado.reservas.length),
    fecha: entrada.fecha,
    hora: entrada.hora,
    cliente: entrada.cliente.trim(),
    telefono: entrada.telefono.trim(),
    personas: entrada.personas,
    zona: entrada.zona,
    mesaId: entrada.mesaId,
    notas: entrada.notas?.trim() || undefined,
    estado: 'Pendiente',
    creada: estado.reservas.length + 1,
    sedeId: entrada.sedeId,
  };

  return { ...estado, reservas: [...estado.reservas, reserva] };
}

/** Cambia el estado de una reserva que aún no se ha sentado. */
export function aplicarEstadoReserva(
  estado: EstadoApp,
  reservaId: string,
  nuevo: Extract<EstadoReserva, 'Pendiente' | 'Confirmada' | 'No-show' | 'Cancelada'>,
): EstadoApp {
  return {
    ...estado,
    reservas: estado.reservas.map((r) =>
      r.id === reservaId && r.estado !== 'Sentada' && r.estado !== 'Cumplida'
        ? { ...r, estado: nuevo }
        : r,
    ),
  };
}

// --- Sesiones de mesa ----------------------------------------------

export interface EntradaSentar {
  reservaId: string;
  mesaId: string;
  comensales: number;
  mesero: string;
}

export function aplicarSentarReserva(estado: EstadoApp, entrada: EntradaSentar): EstadoApp {
  const reserva = estado.reservas.find((r) => r.id === entrada.reservaId);
  const mesa = estado.mesas.find((x) => x.id === entrada.mesaId);
  if (!reserva || !mesa) return estado;
  if (reserva.estado === 'Sentada' || reserva.estado === 'Cumplida') return estado;
  if (estado.sesiones.some((s) => s.mesaId === entrada.mesaId && s.estado === 'Abierta')) {
    return estado; // la mesa ya está ocupada
  }

  const sesion: SesionMesa = conTotales({
    id: folio('S', estado.sesiones.length),
    mesaId: entrada.mesaId,
    fecha: hoyISO(),
    aperturaTs: Date.now(),
    comensales: entrada.comensales > 0 ? entrada.comensales : reserva.personas,
    mesero: entrada.mesero,
    reservaId: reserva.id,
    consumo: [],
    base: 0,
    impuesto: 0,
    total: 0,
    estado: 'Abierta',
    sedeId: mesa.sedeId,
  });

  return {
    ...estado,
    sesiones: [...estado.sesiones, sesion],
    reservas: estado.reservas.map((r) =>
      r.id === reserva.id
        ? { ...r, estado: 'Sentada', mesaId: entrada.mesaId, sesionId: sesion.id }
        : r,
    ),
  };
}

export interface EntradaAbrirMesa {
  mesaId: string;
  comensales: number;
  mesero: string;
}

export function aplicarAbrirMesa(estado: EstadoApp, entrada: EntradaAbrirMesa): EstadoApp {
  const mesa = estado.mesas.find((x) => x.id === entrada.mesaId);
  if (!mesa || entrada.comensales <= 0) return estado;
  if (estado.sesiones.some((s) => s.mesaId === entrada.mesaId && s.estado === 'Abierta')) {
    return estado;
  }

  const sesion: SesionMesa = {
    id: folio('S', estado.sesiones.length),
    mesaId: entrada.mesaId,
    fecha: hoyISO(),
    aperturaTs: Date.now(),
    comensales: entrada.comensales,
    mesero: entrada.mesero,
    consumo: [],
    base: 0,
    impuesto: 0,
    total: 0,
    estado: 'Abierta',
    sedeId: mesa.sedeId,
  };

  return { ...estado, sesiones: [...estado.sesiones, sesion] };
}

/** Cierra la cuenta: la mesa queda por limpiar y la reserva, si la hubo, cumplida. */
export function aplicarCerrarMesa(estado: EstadoApp, sesionId: string): EstadoApp {
  const sesion = estado.sesiones.find((s) => s.id === sesionId);
  if (!sesion || sesion.estado !== 'Abierta') return estado;

  return {
    ...estado,
    sesiones: estado.sesiones.map((s) =>
      s.id === sesionId ? { ...s, estado: 'Cerrada', cierreTs: Date.now() } : s,
    ),
    mesas: estado.mesas.map((mesa) =>
      mesa.id === sesion.mesaId ? { ...mesa, necesitaLimpieza: true } : mesa,
    ),
    reservas: estado.reservas.map((r) =>
      r.sesionId === sesionId ? { ...r, estado: 'Cumplida' } : r,
    ),
  };
}

export function aplicarLimpiarMesa(estado: EstadoApp, mesaId: string): EstadoApp {
  return {
    ...estado,
    mesas: estado.mesas.map((mesa) =>
      mesa.id === mesaId ? { ...mesa, necesitaLimpieza: false } : mesa,
    ),
  };
}

// --- Estado derivado y reportes ----------------------------------

const RESERVA_VIGENTE = new Set<EstadoReserva>(['Pendiente', 'Confirmada']);

export const sesionAbiertaDeMesa = (
  estado: EstadoApp,
  mesaId: string,
): SesionMesa | undefined =>
  estado.sesiones.find((s) => s.mesaId === mesaId && s.estado === 'Abierta');

/** Reserva del día asignada a la mesa que todavía no se ha sentado. */
export const reservaActivaDeMesa = (
  estado: EstadoApp,
  mesaId: string,
  fecha: string,
): Reserva | undefined =>
  estado.reservas
    .filter((r) => r.mesaId === mesaId && r.fecha === fecha && RESERVA_VIGENTE.has(r.estado))
    .sort((a, b) => a.hora.localeCompare(b.hora))[0];

export function estadoDeMesa(estado: EstadoApp, mesa: Mesa, fecha: string): EstadoMesa {
  if (sesionAbiertaDeMesa(estado, mesa.id)) return 'Ocupada';
  if (mesa.necesitaLimpieza) return 'Por limpiar';
  if (reservaActivaDeMesa(estado, mesa.id, fecha)) return 'Reservada';
  return 'Libre';
}

export interface MesaVista {
  mesa: Mesa;
  estado: EstadoMesa;
  sesion?: SesionMesa;
  reserva?: Reserva;
}

export function vistaSalon(estado: EstadoApp, fecha: string = hoyISO()): MesaVista[] {
  return estado.mesas.map((mesa) => ({
    mesa,
    estado: estadoDeMesa(estado, mesa, fecha),
    sesion: sesionAbiertaDeMesa(estado, mesa.id),
    reserva: reservaActivaDeMesa(estado, mesa.id, fecha),
  }));
}

export const minutosTranscurridos = (desde: number, hasta: number = Date.now()): number =>
  Math.max(0, Math.round((hasta - desde) / 60000));

export interface IndicadoresSalon {
  totalMesas: number;
  libres: number;
  ocupadas: number;
  reservadas: number;
  porLimpiar: number;
  capacidadTotal: number;
  comensalesSentados: number;
  ocupacionPct: number; // mesas ocupadas / total
  cuentaAbiertaTotal: number; // suma de consumos en curso
  sesionesCerradasHoy: number;
  ticketPromedio: number; // sobre sesiones cerradas hoy
  rotacion: number; // sesiones cerradas hoy / mesas
  permanenciaMedia: number; // minutos, sesiones cerradas hoy
}

export function indicadoresSalon(
  estado: EstadoApp,
  fecha: string = hoyISO(),
): IndicadoresSalon {
  const vistas = vistaSalon(estado, fecha);
  const cuenta = (e: EstadoMesa) => vistas.filter((v) => v.estado === e).length;

  const abiertas = vistas.filter((v) => v.sesion);
  const cerradasHoy = estado.sesiones.filter(
    (s) => s.estado === 'Cerrada' && s.fecha === fecha,
  );
  const ingresoCerradas = cerradasHoy.reduce((s, x) => s + x.base, 0);
  const permanencia = cerradasHoy.reduce(
    (s, x) => s + minutosTranscurridos(x.aperturaTs, x.cierreTs ?? x.aperturaTs),
    0,
  );

  const ocupadas = cuenta('Ocupada');

  return {
    totalMesas: estado.mesas.length,
    libres: cuenta('Libre'),
    ocupadas,
    reservadas: cuenta('Reservada'),
    porLimpiar: cuenta('Por limpiar'),
    capacidadTotal: estado.mesas.reduce((s, m) => s + m.capacidad, 0),
    comensalesSentados: abiertas.reduce((s, v) => s + (v.sesion?.comensales ?? 0), 0),
    ocupacionPct: estado.mesas.length ? ocupadas / estado.mesas.length : 0,
    cuentaAbiertaTotal: abiertas.reduce((s, v) => s + (v.sesion?.total ?? 0), 0),
    sesionesCerradasHoy: cerradasHoy.length,
    ticketPromedio: cerradasHoy.length ? ingresoCerradas / cerradasHoy.length : 0,
    rotacion: estado.mesas.length ? cerradasHoy.length / estado.mesas.length : 0,
    permanenciaMedia: cerradasHoy.length ? Math.round(permanencia / cerradasHoy.length) : 0,
  };
}

/** Reservas de una fecha, ordenadas por hora. */
export const reservasDelDia = (estado: EstadoApp, fecha: string): Reserva[] =>
  estado.reservas
    .filter((r) => r.fecha === fecha)
    .sort((a, b) => a.hora.localeCompare(b.hora) || a.creada - b.creada);
