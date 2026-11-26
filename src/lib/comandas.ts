import type {
  CapturaComanda,
  Comanda,
  EstacionCocina,
  EstadoApp,
  ItemComanda,
  LineaComanda,
  LineaConsumo,
  OrigenComanda,
} from '../types';
import { folio } from './formato';
import { totalesConsumo } from './salon';

/** Lo que llega desde la pantalla del mesero o de la caja. */
export interface LineaPedida {
  productoId: string;
  cantidad: number;
  nota?: string;
}

export interface EntradaComanda {
  origen: OrigenComanda;
  referencia: string;
  etiqueta: string;
  mesero?: string;
  captura: CapturaComanda;
  lineas: LineaPedida[];
  sedeId: string;
  ts?: number;
}

/**
 * Crea la comanda: guarda las líneas como se cobran y las abre en ítems de
 * cocina, uno por producto real. Un combo se reparte entre las estaciones de
 * sus componentes (la pizza al horno, la gaseosa a la barra).
 */
export function crearComanda(estado: EstadoApp, entrada: EntradaComanda): EstadoApp {
  const id = folio('K', estado.comandas.length);
  const lineas: LineaComanda[] = [];
  const items: ItemComanda[] = [];

  entrada.lineas.forEach((pedida, i) => {
    const producto = estado.productos.find((p) => p.id === pedida.productoId);
    if (!producto || pedida.cantidad <= 0) return;
    const lineaId = `${id}-L${i + 1}`;
    const nota = pedida.nota?.trim() || undefined;
    lineas.push({
      id: lineaId,
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad: pedida.cantidad,
      precioUnit: producto.precio,
      nota,
    });

    const partes = producto.componentes?.length
      ? producto.componentes.map((c) => ({
          producto: estado.productos.find((p) => p.id === c.productoId),
          cantidad: c.cantidad * pedida.cantidad,
          combo: producto.nombre,
        }))
      : [{ producto, cantidad: pedida.cantidad, combo: undefined }];

    partes.forEach((parte, k) => {
      if (!parte.producto) return;
      items.push({
        id: `${lineaId}-${k + 1}`,
        lineaId,
        productoId: parte.producto.id,
        nombre: parte.producto.nombre,
        cantidad: parte.cantidad,
        nota,
        estacion: parte.producto.estacion,
        tiempoPrep: parte.producto.tiempoPrep,
        estado: 'Pendiente',
        combo: parte.combo,
      });
    });
  });

  if (lineas.length === 0) return estado;

  const ronda =
    estado.comandas.filter((c) => c.referencia === entrada.referencia).length + 1;

  const comanda: Comanda = {
    id,
    origen: entrada.origen,
    referencia: entrada.referencia,
    etiqueta: entrada.etiqueta,
    ronda,
    mesero: entrada.mesero,
    captura: entrada.captura,
    creadaTs: entrada.ts ?? Date.now(),
    lineas,
    items,
    sedeId: entrada.sedeId,
  };
  return { ...estado, comandas: [...estado.comandas, comanda] };
}

// --- Mesas -------------------------------------------------------------

/** Suma o resta unidades de un producto al consumo de la sesión y recalcula totales. */
function ajustarConsumo(consumo: LineaConsumo[], linea: LineaComanda, signo: 1 | -1) {
  const existe = consumo.find((l) => l.productoId === linea.productoId);
  if (!existe) {
    return signo > 0
      ? [
          ...consumo,
          {
            productoId: linea.productoId,
            nombre: linea.nombre,
            cantidad: linea.cantidad,
            precioUnit: linea.precioUnit,
          },
        ]
      : consumo;
  }
  const cantidad = existe.cantidad + signo * linea.cantidad;
  return cantidad <= 0
    ? consumo.filter((l) => l.productoId !== linea.productoId)
    : consumo.map((l) => (l.productoId === linea.productoId ? { ...l, cantidad } : l));
}

export interface EntradaComandaMesa {
  sesionId: string;
  lineas: LineaPedida[];
  captura: CapturaComanda;
  ts?: number;
}

/** El mesero envía una ronda: se crea la comanda y se carga a la cuenta de la mesa. */
export function aplicarComandaMesa(estado: EstadoApp, entrada: EntradaComandaMesa): EstadoApp {
  const sesion = estado.sesiones.find((s) => s.id === entrada.sesionId);
  if (!sesion || sesion.estado !== 'Abierta') return estado;
  const mesa = estado.mesas.find((m) => m.id === sesion.mesaId);

  const conComanda = crearComanda(estado, {
    origen: 'Mesa',
    referencia: sesion.id,
    etiqueta: mesa?.nombre ?? sesion.mesaId,
    mesero: sesion.mesero,
    captura: entrada.captura,
    lineas: entrada.lineas,
    sedeId: sesion.sedeId,
    ts: entrada.ts,
  });
  if (conComanda === estado) return estado;

  const comanda = conComanda.comandas[conComanda.comandas.length - 1];
  const consumo = comanda.lineas.reduce((acc, l) => ajustarConsumo(acc, l, 1), sesion.consumo);

  return {
    ...conComanda,
    sesiones: conComanda.sesiones.map((s) =>
      s.id === sesion.id ? { ...s, consumo, ...totalesConsumo(consumo) } : s,
    ),
  };
}

/**
 * Anula una línea ya enviada. La cocina la ve tachada en rojo y, si es de una
 * mesa, sale de la cuenta. El motivo queda registrado para auditoría.
 */
export function aplicarAnularLinea(
  estado: EstadoApp,
  comandaId: string,
  lineaId: string,
  motivo: string,
): EstadoApp {
  const comanda = estado.comandas.find((c) => c.id === comandaId);
  const linea = comanda?.lineas.find((l) => l.id === lineaId);
  if (!comanda || !linea || linea.anulada) return estado;
  const marca = { motivo: motivo.trim() || 'Sin motivo', ts: Date.now() };

  const comandas = estado.comandas.map((c) =>
    c.id !== comandaId
      ? c
      : {
          ...c,
          lineas: c.lineas.map((l) => (l.id === lineaId ? { ...l, anulada: marca } : l)),
          items: c.items.map((it) => (it.lineaId === lineaId ? { ...it, anulado: marca } : it)),
        },
  );

  const sesiones =
    comanda.origen === 'Mesa'
      ? estado.sesiones.map((s) => {
          if (s.id !== comanda.referencia || s.estado !== 'Abierta') return s;
          const consumo = ajustarConsumo(s.consumo, linea, -1);
          return { ...s, consumo, ...totalesConsumo(consumo) };
        })
      : estado.sesiones;

  return { ...estado, comandas, sesiones };
}

// --- Cocina --------------------------------------------------------------

const SIGUIENTE: Record<ItemComanda['estado'], ItemComanda['estado']> = {
  Pendiente: 'Preparando',
  Preparando: 'Listo',
  Listo: 'Pendiente',
};

/** Toque sobre un plato en el KDS: pendiente → preparando → listo (y vuelve si se equivocan). */
export function aplicarAvanzarItem(estado: EstadoApp, comandaId: string, itemId: string): EstadoApp {
  return {
    ...estado,
    comandas: estado.comandas.map((c) =>
      c.id !== comandaId
        ? c
        : {
            ...c,
            items: c.items.map((it) => {
              if (it.id !== itemId || it.anulado) return it;
              const estadoItem = SIGUIENTE[it.estado];
              return {
                ...it,
                estado: estadoItem,
                listoTs: estadoItem === 'Listo' ? Date.now() : undefined,
              };
            }),
          },
    ),
  };
}

/** "Bump": la estación da por terminados todos sus platos de la comanda. */
export function aplicarListoEstacion(
  estado: EstadoApp,
  comandaId: string,
  estacion?: EstacionCocina,
): EstadoApp {
  const ahora = Date.now();
  return {
    ...estado,
    comandas: estado.comandas.map((c) =>
      c.id !== comandaId
        ? c
        : {
            ...c,
            items: c.items.map((it) =>
              it.anulado || it.estado === 'Listo' || (estacion && it.estacion !== estacion)
                ? it
                : { ...it, estado: 'Listo', listoTs: ahora },
            ),
          },
    ),
  };
}

/** El mesero o el domiciliario se llevan la comanda del pase. */
export function aplicarEntregarComanda(estado: EstadoApp, comandaId: string): EstadoApp {
  return {
    ...estado,
    comandas: estado.comandas.map((c) =>
      c.id === comandaId && !c.entregadaTs ? { ...c, entregadaTs: Date.now() } : c,
    ),
  };
}

/** Marca como entregadas todas las comandas de una mesa, venta o pedido. */
export function entregarComandasDe(estado: EstadoApp, referencia: string): EstadoApp {
  const ahora = Date.now();
  return {
    ...estado,
    comandas: estado.comandas.map((c) =>
      c.referencia === referencia && !c.entregadaTs
        ? {
            ...c,
            entregadaTs: ahora,
            items: c.items.map((it) =>
              it.anulado || it.estado === 'Listo' ? it : { ...it, estado: 'Listo', listoTs: ahora },
            ),
          }
        : c,
    ),
  };
}

// --- Estado derivado -------------------------------------------------------

export const itemsVivos = (c: Comanda): ItemComanda[] => c.items.filter((it) => !it.anulado);

export type EstadoComanda = 'En cocina' | 'Lista' | 'Entregada' | 'Anulada';

export function estadoComanda(c: Comanda): EstadoComanda {
  if (c.entregadaTs) return 'Entregada';
  const vivos = itemsVivos(c);
  if (vivos.length === 0) return 'Anulada';
  return vivos.every((it) => it.estado === 'Listo') ? 'Lista' : 'En cocina';
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo';

/**
 * Semáforo de la comanda: el estándar es el plato más lento que falta. Verde
 * dentro del estándar, amarillo hasta un 50% por encima y rojo después.
 */
export function semaforo(c: Comanda, ahora: number, estacion?: EstacionCocina): Semaforo {
  const pendientes = itemsVivos(c).filter(
    (it) => it.estado !== 'Listo' && (!estacion || it.estacion === estacion),
  );
  const estandar = Math.max(0, ...pendientes.map((it) => it.tiempoPrep));
  if (estandar === 0) return 'verde';
  const minutos = (ahora - c.creadaTs) / 60000;
  if (minutos <= estandar) return 'verde';
  if (minutos <= estandar * 1.5) return 'amarillo';
  return 'rojo';
}

/**
 * Sincronización de tiempos: un plato rápido espera a que el más lento de la
 * comanda vaya adelantado, para que todo salga caliente al tiempo. Devuelve
 * los minutos que faltan para empezarlo (0 si ya se puede).
 */
export function minutosParaIniciar(c: Comanda, item: ItemComanda, ahora: number): number {
  if (item.estado !== 'Pendiente') return 0;
  const masLento = Math.max(
    ...itemsVivos(c)
      .filter((it) => it.estado !== 'Listo')
      .map((it) => it.tiempoPrep),
  );
  const transcurrido = (ahora - c.creadaTs) / 60000;
  return Math.max(0, Math.ceil(masLento - item.tiempoPrep - transcurrido));
}

/** Minutos que tardó la cocina en dejar lista la comanda (o la estación). */
export function minutosPreparacion(c: Comanda, estacion?: EstacionCocina): number | null {
  const items = itemsVivos(c).filter((it) => !estacion || it.estacion === estacion);
  if (items.length === 0 || items.some((it) => it.estado !== 'Listo' || !it.listoTs)) return null;
  return (Math.max(...items.map((it) => it.listoTs!)) - c.creadaTs) / 60000;
}

export const formatoCronometro = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
