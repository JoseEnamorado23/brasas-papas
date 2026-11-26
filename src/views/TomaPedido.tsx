import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  ChefHat,
  CheckCircle2,
  ClipboardList,
  Minus,
  NotebookPen,
  Plus,
  Printer,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { CapturaComanda, Comanda, LineaComanda, Producto } from '../types';
import { useTienda } from '../store/tienda';
import { useNavegacion } from '../store/navegacion';
import { CLASE_ESTADO_MESA, ZONAS_SALON } from '../data/salon';
import { NOTAS_RAPIDAS } from '../data/menu';
import { esMesero } from '../data/personal';
import { EMISOR } from '../data/facturacion';
import { IMPUESTO_CONSUMO, PROPINA_SUGERIDA } from '../data/cuentas';
import { formatoMoneda, hoyISO } from '../lib/formato';
import { minutosTranscurridos, vistaSalon, type MesaVista } from '../lib/salon';
import { estadoComanda, itemsVivos } from '../lib/comandas';
import type { LineaPedida } from '../lib/comandas';
import { Carta } from '../components/Carta';
import { CobrarMesa } from '../components/CobrarMesa';
import { Modal } from '../components/Modal';
import { Boton, Campo, Entrada, EstadoVacio, Selector } from '../components/ui';

interface LineaBorrador extends LineaPedida {
  clave: string;
}

/**
 * Pantalla del mesero, pensada para el celular: elige la mesa, arma la ronda
 * con notas y la manda a cocina. La misma pantalla sirve en caja para digitar
 * una comanda que el mesero tomó en papel (queda marcada como "papel").
 */
export function TomaPedido() {
  const { estado } = useTienda();
  const nav = useNavegacion();
  const [mesaId, setMesaId] = useState<string | null>(nav.mesaId);
  const [captura, setCaptura] = useState<CapturaComanda>('Celular');

  useEffect(() => {
    if (nav.mesaId) setMesaId(nav.mesaId);
  }, [nav.mesaId]);

  // Refresca minutos y estados de cocina.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const vistas = vistaSalon(estado, hoyISO());
  const seleccionada = mesaId ? vistas.find((v) => v.mesa.id === mesaId) : undefined;

  return (
    <div className="space-y-4">
      <SelectorCaptura captura={captura} onCambiar={setCaptura} />
      {seleccionada?.sesion ? (
        <PedidoMesa
          vista={seleccionada}
          captura={captura}
          onVolver={() => setMesaId(null)}
        />
      ) : (
        <PlanoMesas vistas={vistas} onElegir={setMesaId} />
      )}
    </div>
  );
}

function SelectorCaptura({
  captura,
  onCambiar,
}: {
  captura: CapturaComanda;
  onCambiar: (c: CapturaComanda) => void;
}) {
  const opciones: { valor: CapturaComanda; titulo: string; detalle: string; icono: typeof Smartphone }[] = [
    {
      valor: 'Celular',
      titulo: 'Celular del mesero',
      detalle: 'El mesero toma el pedido en la mesa y llega directo a cocina.',
      icono: Smartphone,
    },
    {
      valor: 'Papel',
      titulo: 'Digitar comanda de papel',
      detalle: 'Respaldo en hora pico: el mesero anota en papel y en caja se digita.',
      icono: NotebookPen,
    },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {opciones.map((o) => {
        const Icono = o.icono;
        const activo = captura === o.valor;
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => onCambiar(o.valor)}
            aria-pressed={activo}
            className={[
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              activo ? 'border-ink bg-surface ring-1 ring-ink' : 'border-line bg-surface/60 hover:border-ink/50',
            ].join(' ')}
          >
            <Icono className={['mt-0.5 h-4 w-4 shrink-0', activo ? 'text-ink' : 'text-muted'].join(' ')} />
            <span>
              <span className="block text-sm font-medium text-ink">{o.titulo}</span>
              <span className="mt-0.5 block text-xs text-muted">{o.detalle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// --- Plano 2D de mesas ------------------------------------------------

function PlanoMesas({
  vistas,
  onElegir,
}: {
  vistas: MesaVista[];
  onElegir: (mesaId: string) => void;
}) {
  const { estado, dispatch } = useTienda();
  const nav = useNavegacion();
  const [abrir, setAbrir] = useState<MesaVista | null>(null);

  const listasPorSesion = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of estado.comandas) {
      if (c.origen === 'Mesa' && estadoComanda(c) === 'Lista') {
        m.set(c.referencia, (m.get(c.referencia) ?? 0) + 1);
      }
    }
    return m;
  }, [estado.comandas]);

  const tocar = (v: MesaVista) => {
    if (v.estado === 'Ocupada') onElegir(v.mesa.id);
    else if (v.estado === 'Libre') setAbrir(v);
    else if (v.estado === 'Por limpiar') dispatch({ tipo: 'LIMPIAR_MESA', mesaId: v.mesa.id });
    else nav.ir('mesas');
  };

  return (
    <div className="space-y-4">
      {ZONAS_SALON.map((zona) => {
        const enZona = vistas.filter((v) => v.mesa.zona === zona);
        if (enZona.length === 0) return null;
        return (
          <section key={zona}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{zona}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {enZona.map((v) => {
                const listas = v.sesion ? listasPorSesion.get(v.sesion.id) ?? 0 : 0;
                return (
                  <button
                    key={v.mesa.id}
                    type="button"
                    onClick={() => tocar(v)}
                    className={[
                      'relative flex min-h-[92px] flex-col justify-between rounded-lg border bg-surface p-2.5 text-left transition-colors hover:border-ink',
                      v.estado === 'Ocupada' ? 'border-ember/50' : 'border-line',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-display text-sm font-semibold text-ink">{v.mesa.nombre}</span>
                      <span className="text-[10px] text-muted">{v.mesa.capacidad}p</span>
                    </div>
                    {v.sesion ? (
                      <div className="text-[11px] leading-tight">
                        <p className="font-mono font-semibold tabular text-ink">
                          {formatoMoneda(v.sesion.total)}
                        </p>
                        <p className="text-muted">
                          {minutosTranscurridos(v.sesion.aperturaTs)} min · {v.sesion.mesero.split(' ')[0]}
                        </p>
                      </div>
                    ) : (
                      <span
                        className={[
                          'self-start rounded px-1.5 py-0.5 text-[10px] font-medium',
                          CLASE_ESTADO_MESA[v.estado],
                        ].join(' ')}
                      >
                        {v.estado === 'Por limpiar' ? 'Tocar al limpiar' : v.estado}
                      </span>
                    )}
                    {listas > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex items-center gap-1 rounded-full bg-balance px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                        <CheckCircle2 className="h-3 w-3" />
                        Listo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-xs text-muted">
        Toca una mesa ocupada para pedir, una libre para abrirla y una "por limpiar" cuando quede
        lista. Las reservadas se sientan desde el salón.
      </p>
      {abrir && <AbrirMesa vista={abrir} onCerrar={() => setAbrir(null)} onAbierta={onElegir} />}
    </div>
  );
}

function AbrirMesa({
  vista,
  onCerrar,
  onAbierta,
}: {
  vista: MesaVista;
  onCerrar: () => void;
  onAbierta: (mesaId: string) => void;
}) {
  const { estado, dispatch } = useTienda();
  const meseros = estado.empleados.filter(esMesero);
  const [comensales, setComensales] = useState(Math.min(2, vista.mesa.capacidad));
  const [mesero, setMesero] = useState(meseros[0]?.nombre ?? '');

  return (
    <Modal titulo={`Abrir ${vista.mesa.nombre}`} descripcion={`${vista.mesa.zona} · ${vista.mesa.capacidad} puestos`} onCerrar={onCerrar} ancho="max-w-sm">
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Comensales</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: Math.max(vista.mesa.capacidad, 4) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setComensales(n)}
                className={[
                  'rounded-md border py-2 font-mono text-sm',
                  comensales === n ? 'border-ink bg-ink text-paper' : 'border-line text-ink hover:border-ink',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <Campo etiqueta="Mesero">
          <Selector value={mesero} onChange={(e) => setMesero(e.target.value)}>
            {meseros.map((m) => (
              <option key={m.id} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
        <Boton
          type="button"
          className="w-full"
          disabled={!mesero}
          onClick={() => {
            dispatch({ tipo: 'ABRIR_MESA', mesaId: vista.mesa.id, comensales, mesero });
            onAbierta(vista.mesa.id);
            onCerrar();
          }}
        >
          Abrir y tomar pedido
        </Boton>
      </div>
    </Modal>
  );
}

// --- Pedido de una mesa ---------------------------------------------

function PedidoMesa({
  vista,
  captura,
  onVolver,
}: {
  vista: MesaVista;
  captura: CapturaComanda;
  onVolver: () => void;
}) {
  const { estado, dispatch } = useTienda();
  const sesion = vista.sesion!;
  const [borrador, setBorrador] = useState<LineaBorrador[]>([]);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [enviada, setEnviada] = useState<number | null>(null);

  const comandas = estado.comandas.filter((c) => c.referencia === sesion.id);

  const cantidades = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of borrador) m[l.productoId] = (m[l.productoId] ?? 0) + l.cantidad;
    return m;
  }, [borrador]);

  const agregar = (p: Producto) =>
    setBorrador((prev) => {
      const sinNota = prev.find((l) => l.productoId === p.id && !l.nota);
      if (sinNota) {
        return prev.map((l) => (l === sinNota ? { ...l, cantidad: l.cantidad + 1 } : l));
      }
      return [...prev, { clave: `${p.id}-${Date.now()}`, productoId: p.id, cantidad: 1 }];
    });

  const totalBorrador = borrador.reduce((s, l) => {
    const p = estado.productos.find((x) => x.id === l.productoId);
    return s + (p?.precio ?? 0) * l.cantidad;
  }, 0);
  const unidades = borrador.reduce((s, l) => s + l.cantidad, 0);

  const enviar = () => {
    if (borrador.length === 0) return;
    dispatch({
      tipo: 'COMANDA_MESA',
      sesionId: sesion.id,
      captura,
      lineas: borrador.map(({ productoId, cantidad, nota }) => ({ productoId, cantidad, nota })),
    });
    setEnviada(comandas.length + 1);
    setBorrador([]);
    setHojaAbierta(false);
  };

  useEffect(() => {
    if (enviada == null) return;
    const id = setTimeout(() => setEnviada(null), 3500);
    return () => clearTimeout(id);
  }, [enviada]);

  const panelBorrador = (
    <Borrador
      lineas={borrador}
      onCambiar={setBorrador}
      total={totalBorrador}
      captura={captura}
      onEnviar={enviar}
    />
  );

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-muted hover:bg-paper hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Mesas
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-ink">{vista.mesa.nombre}</p>
          <p className="text-xs text-muted">
            {sesion.comensales} comensales · {sesion.mesero} · {minutosTranscurridos(sesion.aperturaTs)} min
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted">Cuenta</p>
          <p className="font-mono text-sm font-semibold tabular text-ink">{formatoMoneda(sesion.total)}</p>
        </div>
      </div>

      {enviada != null && (
        <div className="aparecer flex items-center gap-2 rounded-lg border border-balance/30 bg-balance/10 px-3 py-2 text-sm text-balance">
          <ChefHat className="h-4 w-4" />
          Ronda {enviada} enviada a cocina{captura === 'Papel' ? ' (digitada de papel)' : ''}.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Carta productos={estado.productos} cantidades={cantidades} onAgregar={agregar} compacta />

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="hidden lg:block">{panelBorrador}</div>
          <Enviado comandas={comandas} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Precuenta vista={vista} />
            <CobrarMesa sesion={sesion} nombreMesa={vista.mesa.nombre} />
          </div>
        </div>
      </div>

      {/* Barra inferior en el celular: la ronda en curso siempre a la vista. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setHojaAbierta(true)}
          disabled={unidades === 0}
          className="flex w-full items-center justify-between rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper disabled:bg-ink/40"
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {unidades === 0 ? 'Toca productos para armar la ronda' : `Ronda nueva · ${unidades} und`}
          </span>
          {unidades > 0 && <span className="font-mono tabular">{formatoMoneda(totalBorrador)}</span>}
        </button>
      </div>
      {hojaAbierta && (
        <Modal titulo="Ronda nueva" descripcion={vista.mesa.nombre} onCerrar={() => setHojaAbierta(false)}>
          {panelBorrador}
        </Modal>
      )}
    </div>
  );
}

function Borrador({
  lineas,
  onCambiar,
  total,
  captura,
  onEnviar,
}: {
  lineas: LineaBorrador[];
  onCambiar: (fn: (prev: LineaBorrador[]) => LineaBorrador[]) => void;
  total: number;
  captura: CapturaComanda;
  onEnviar: () => void;
}) {
  const { estado } = useTienda();
  const [notaDe, setNotaDe] = useState<string | null>(null);

  const actualizar = (clave: string, cambio: Partial<LineaBorrador>) =>
    onCambiar((prev) =>
      prev
        .map((l) => (l.clave === clave ? { ...l, ...cambio } : l))
        .filter((l) => l.cantidad > 0),
    );

  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-display text-[15px] font-semibold text-ink">Ronda nueva</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted">
          {captura === 'Celular' ? <Smartphone className="h-3 w-3" /> : <NotebookPen className="h-3 w-3" />}
          {captura === 'Celular' ? 'Desde el celular' : 'Comanda de papel'}
        </span>
      </header>
      {lineas.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">
          Toca productos de la carta. Cada plato puede llevar su nota para cocina.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {lineas.map((l) => {
            const p = estado.productos.find((x) => x.id === l.productoId);
            if (!p) return null;
            const editando = notaDe === l.clave;
            return (
              <li key={l.clave} className="px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span aria-hidden>{p.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{p.nombre}</span>
                  <button
                    type="button"
                    onClick={() => actualizar(l.clave, { cantidad: l.cantidad - 1 })}
                    className="grid h-7 w-7 place-items-center rounded border border-line hover:border-ink"
                    aria-label={`Quitar una unidad de ${p.nombre}`}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center font-mono tabular">{l.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => actualizar(l.clave, { cantidad: l.cantidad + 1 })}
                    className="grid h-7 w-7 place-items-center rounded border border-line hover:border-ink"
                    aria-label={`Agregar una unidad de ${p.nombre}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2 pl-6">
                  {l.nota ? (
                    <span className="rounded bg-[#C98A1B]/15 px-1.5 py-0.5 text-[11px] font-medium text-[#8a5d0c]">
                      {l.nota}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setNotaDe(editando ? null : l.clave)}
                    className="text-[11px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    {l.nota ? 'Cambiar nota' : '+ Nota para cocina'}
                  </button>
                </div>
                {editando && (
                  <div className="mt-2 space-y-2 pl-6">
                    <div className="flex flex-wrap gap-1">
                      {NOTAS_RAPIDAS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            actualizar(l.clave, {
                              nota: l.nota?.includes(n) ? l.nota : [l.nota, n].filter(Boolean).join(', '),
                            })
                          }
                          className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink/80 hover:border-ink"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <Entrada
                      value={l.nota ?? ''}
                      onChange={(e) => actualizar(l.clave, { nota: e.target.value })}
                      placeholder="Ej.: término medio, sabor maracuyá…"
                      className="w-full !py-1.5 text-xs"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-line px-4 py-3">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted">Valor de la ronda</span>
          <span className="font-mono font-semibold tabular text-ink">{formatoMoneda(total)}</span>
        </div>
        <Boton type="button" onClick={onEnviar} disabled={lineas.length === 0} className="w-full !py-2.5">
          <Send className="h-4 w-4" />
          Enviar a cocina
        </Boton>
      </div>
    </section>
  );
}

const ETIQUETA_LINEA = {
  'En cola': 'bg-paper text-muted',
  'En preparación': 'bg-[#C98A1B]/15 text-[#8a5d0c]',
  Listo: 'bg-balance/10 text-balance',
  Servido: 'bg-ink/5 text-ink/60',
} as const;

function estadoLinea(c: Comanda, linea: LineaComanda): keyof typeof ETIQUETA_LINEA {
  if (c.entregadaTs) return 'Servido';
  const items = c.items.filter((it) => it.lineaId === linea.id);
  if (items.every((it) => it.estado === 'Listo')) return 'Listo';
  if (items.some((it) => it.estado !== 'Pendiente')) return 'En preparación';
  return 'En cola';
}

const MOTIVOS = [
  'El cliente cambió de opinión',
  'Error al tomar el pedido',
  'Demora en cocina',
  'Producto con problema de calidad',
];

function Enviado({ comandas }: { comandas: Comanda[] }) {
  const { dispatch } = useTienda();
  const [anular, setAnular] = useState<{ comanda: Comanda; linea: LineaComanda } | null>(null);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);

  if (comandas.length === 0) {
    return <EstadoVacio>Todavía no se ha enviado nada a cocina para esta mesa.</EstadoVacio>;
  }

  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="border-b border-line px-4 py-3">
        <h2 className="font-display text-[15px] font-semibold text-ink">Enviado a cocina</h2>
      </header>
      <div className="divide-y divide-line">
        {[...comandas].reverse().map((c) => {
          const estadoC = estadoComanda(c);
          return (
            <div key={c.id} className="px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                <span>
                  Ronda {c.ronda} · {c.id}
                  {c.captura === 'Papel' && ' · papel'}
                </span>
                <span>{new Date(c.creadaTs).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <ul className="space-y-1">
                {c.lineas.map((l) => {
                  const e = estadoLinea(c, l);
                  return (
                    <li key={l.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={[
                          'min-w-0 flex-1 truncate',
                          l.anulada ? 'text-muted line-through' : 'text-ink',
                        ].join(' ')}
                      >
                        {l.cantidad} × {l.nombre}
                        {l.nota && <span className="text-xs text-[#8a5d0c]"> · {l.nota}</span>}
                      </span>
                      {l.anulada ? (
                        <span className="rounded bg-ember/10 px-1.5 py-0.5 text-[10px] font-medium text-ember">
                          Anulado
                        </span>
                      ) : (
                        <>
                          <span className={['rounded px-1.5 py-0.5 text-[10px] font-medium', ETIQUETA_LINEA[e]].join(' ')}>
                            {e}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAnular({ comanda: c, linea: l })}
                            className="text-muted hover:text-ember"
                            aria-label={`Anular ${l.nombre}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              {estadoC === 'Lista' && (
                <Boton
                  type="button"
                  variante="secundario"
                  onClick={() => dispatch({ tipo: 'ENTREGAR_COMANDA', comandaId: c.id })}
                  className="mt-2 w-full !border-balance/40 !text-balance"
                >
                  <Sparkles className="h-4 w-4" />
                  Recoger en el pase y servir
                </Boton>
              )}
            </div>
          );
        })}
      </div>

      {anular && (
        <Modal
          titulo="Anular producto"
          descripcion={`${anular.linea.cantidad} × ${anular.linea.nombre} · ronda ${anular.comanda.ronda}`}
          onCerrar={() => setAnular(null)}
          ancho="max-w-sm"
        >
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Sale de la cuenta y la cocina lo ve tachado en rojo. El motivo queda registrado para
              el control de anulaciones.
            </p>
            <Campo etiqueta="Motivo">
              <Selector value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Selector>
            </Campo>
            <Boton
              type="button"
              variante="peligro"
              className="w-full"
              onClick={() => {
                dispatch({
                  tipo: 'ANULAR_LINEA',
                  comandaId: anular.comanda.id,
                  lineaId: anular.linea.id,
                  motivo,
                });
                setAnular(null);
              }}
            >
              <Ban className="h-4 w-4" />
              Anular
            </Boton>
          </div>
        </Modal>
      )}
    </section>
  );
}

/** Precuenta para llevar a la mesa: no es documento fiscal, solo el detalle a pagar. */
function Precuenta({ vista }: { vista: MesaVista }) {
  const [abierta, setAbierta] = useState(false);
  const { estado } = useTienda();
  const sesion = vista.sesion!;
  const propina = Math.round(sesion.base * PROPINA_SUGERIDA);
  const vivos = estado.comandas
    .filter((c) => c.referencia === sesion.id)
    .reduce((s, c) => s + itemsVivos(c).length, 0);

  return (
    <>
      <Boton
        type="button"
        variante="secundario"
        onClick={() => setAbierta(true)}
        disabled={sesion.consumo.length === 0 || vivos === 0}
      >
        <Printer className="h-4 w-4" />
        Precuenta
      </Boton>
      {abierta && (
        <Modal titulo="Precuenta" descripcion={vista.mesa.nombre} onCerrar={() => setAbierta(false)} ancho="max-w-sm">
          <div className="space-y-3">
            <div className="imprimible mx-auto max-w-[300px] space-y-2 bg-white p-4 font-mono text-[12px] text-ink ring-1 ring-line">
              <p className="text-center font-display text-sm font-bold">{EMISOR.razonSocial}</p>
              <p className="text-center text-[11px]">
                PRECUENTA · {vista.mesa.nombre} · {sesion.mesero}
              </p>
              <div className="border-y border-dashed border-ink/30 py-1.5">
                {sesion.consumo.map((l) => (
                  <div key={l.productoId} className="flex justify-between gap-2">
                    <span className="truncate">
                      {l.cantidad} {l.nombre}
                    </span>
                    <span className="tabular">{formatoMoneda(l.precioUnit * l.cantidad)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular">{formatoMoneda(sesion.base)}</span>
              </div>
              <div className="flex justify-between">
                <span>INC {IMPUESTO_CONSUMO * 100}%</span>
                <span className="tabular">{formatoMoneda(sesion.impuesto)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="tabular">{formatoMoneda(sesion.total)}</span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>Propina sugerida 10%</span>
                <span className="tabular">{formatoMoneda(propina)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total con propina</span>
                <span className="tabular">{formatoMoneda(sesion.total + propina)}</span>
              </div>
              <p className="pt-1 text-center text-[10px] leading-relaxed text-ink/70">
                La propina es voluntaria. Este documento no es una factura: el documento electrónico
                se entrega al pagar.
              </p>
            </div>
            <Boton type="button" onClick={() => window.print()} className="no-imprimir w-full">
              <Printer className="h-4 w-4" />
              Imprimir precuenta
            </Boton>
          </div>
        </Modal>
      )}
    </>
  );
}
