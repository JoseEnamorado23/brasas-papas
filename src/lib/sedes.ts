import type { EstadoApp } from '../types';
import { TODAS_SEDES } from '../data/sedes';

export { TODAS_SEDES };

/**
 * Recorta el estado a los datos de una sola sede. Los asientos sin `sedeId`
 * (apertura, inversión inicial) son compartidos y se conservan en cualquier
 * sede: como cada asiento individual está balanceado (débitos = créditos),
 * cualquier subconjunto de asientos completos mantiene cuadrada la ecuación
 * contable, así que esto no descuadra los estados financieros por sede.
 */
export function filtrarPorSede(estado: EstadoApp, sedeId: string): EstadoApp {
  if (sedeId === TODAS_SEDES) return estado;
  return {
    ...estado,
    asientos: estado.asientos.filter((a) => !a.sedeId || a.sedeId === sedeId),
    empleados: estado.empleados.filter((e) => e.sedeId === sedeId),
    ventas: estado.ventas.filter((v) => v.sedeId === sedeId),
    compras: estado.compras.filter((c) => c.sedeId === sedeId),
    gastos: estado.gastos.filter((g) => g.sedeId === sedeId),
    nominas: estado.nominas.filter((n) => !n.sedeId || n.sedeId === sedeId),
    pedidos: estado.pedidos.filter((p) => p.sedeId === sedeId),
    mesas: estado.mesas.filter((m) => m.sedeId === sedeId),
    reservas: estado.reservas.filter((r) => r.sedeId === sedeId),
    sesiones: estado.sesiones.filter((s) => s.sedeId === sedeId),
    eventos: estado.eventos.filter((ev) => ev.sedeId === sedeId),
  };
}

/** Sede efectiva para operar un formulario cuando la vista global está en "todas". */
export const sedeParaOperar = (sedeActual: string, sedes: EstadoApp['sedes']): string =>
  sedeActual !== TODAS_SEDES ? sedeActual : (sedes[0]?.id ?? '');
