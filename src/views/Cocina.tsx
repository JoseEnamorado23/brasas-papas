import { useEffect, useState } from 'react';
import {
  Bike,
  CheckCheck,
  Clock,
  Expand,
  Hourglass,
  NotebookPen,
  Printer,
  ShoppingBag,
  Smartphone,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import type { Comanda, EstacionCocina, ItemComanda } from '../types';
import { useTienda } from '../store/tienda';
import { ESTACIONES } from '../data/menu';
import {
  estadoComanda,
  formatoCronometro,
  itemsVivos,
  minutosParaIniciar,
  minutosPreparacion,
  semaforo,
  type Semaforo,
} from '../lib/comandas';
import { Modal } from '../components/Modal';
import { Boton } from '../components/ui';

type FiltroEstacion = 'Todas' | EstacionCocina;

const COLOR_SEMAFORO: Record<Semaforo, { barra: string; texto: string; borde: string }> = {
  verde: { barra: 'bg-[#2E8B57]', texto: 'text-[#7EE2A8]', borde: 'border-[#2E8B57]/60' },
  amarillo: { barra: 'bg-[#D99A1E]', texto: 'text-[#F5C96B]', borde: 'border-[#D99A1E]/70' },
  rojo: { barra: 'bg-ember', texto: 'text-[#FF9D80]', borde: 'border-ember' },
};

const ICONO_ORIGEN = { Mesa: UtensilsCrossed, Mostrador: ShoppingBag, Domicilio: Bike } as const;
const ICONO_CAPTURA = { Celular: Smartphone, Papel: NotebookPen, Caja: Store } as const;

const esDeHoy = (c: Comanda) => new Date(c.creadaTs).toDateString() === new Date().toDateString();

/**
 * Pantalla de cocina (KDS). Las comandas de mesas, mostrador y domicilios
 * entran en una sola fila, ordenadas por llegada, con semáforo por tiempo.
 * Cada estación ve solo sus platos; al terminar los marcan listos y la
 * comanda pasa al pase, donde se imprime el tiquete de despacho.
 */
export function Cocina() {
  const { estado, dispatch } = useTienda();
  const [estacion, setEstacion] = useState<FiltroEstacion>('Todas');
  const [ahora, setAhora] = useState(Date.now());
  const [tiquete, setTiquete] = useState<Comanda | null>(null);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const filtroEst = estacion === 'Todas' ? undefined : estacion;

  // Con una estación elegida, solo entran las comandas que le dejan trabajo pendiente.
  const enCola = estado.comandas
    .filter((c) => estadoComanda(c) === 'En cocina')
    .filter((c) =>
      itemsVivos(c).some(
        (it) => it.estado !== 'Listo' && (!filtroEst || it.estacion === filtroEst),
      ),
    )
    .sort((a, b) => a.creadaTs - b.creadaTs);
  const enPase = estado.comandas
    .filter((c) => estadoComanda(c) === 'Lista')
    .sort((a, b) => a.creadaTs - b.creadaTs);

  const pendientesPor = (e: EstacionCocina) =>
    estado.comandas
      .filter((c) => estadoComanda(c) === 'En cocina')
      .filter((c) => itemsVivos(c).some((it) => it.estacion === e && it.estado !== 'Listo')).length;

  // Métricas del día: tiempo real de preparación por estación.
  const metricas = ESTACIONES.map((e) => {
    const tiempos = estado.comandas
      .filter(esDeHoy)
      .map((c) => minutosPreparacion(c, e))
      .filter((m): m is number => m != null);
    return {
      estacion: e,
      promedio: tiempos.length ? tiempos.reduce((s, x) => s + x, 0) / tiempos.length : null,
      n: tiempos.length,
    };
  });
  const atrasadas = enCola.filter((c) => semaforo(c, ahora, filtroEst) === 'rojo').length;

  const pantallaCompleta = () => {
    const el = document.getElementById('kds');
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  return (
    <div id="kds" className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] bg-[#141311] px-4 py-5 text-[#EDE9E3] md:-mx-8 md:-my-6 md:px-6 [&:fullscreen]:overflow-y-auto">
      {/* Barra de estaciones */}
      <div className="flex flex-wrap items-center gap-2">
        {(['Todas', ...ESTACIONES] as FiltroEstacion[]).map((e) => {
          const activo = estacion === e;
          const n = e === 'Todas' ? null : pendientesPor(e);
          return (
            <button
              key={e}
              type="button"
              onClick={() => setEstacion(e)}
              className={[
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                activo ? 'bg-[#EDE9E3] text-[#141311]' : 'bg-white/5 text-[#EDE9E3]/80 hover:bg-white/10',
              ].join(' ')}
            >
              {e === 'Todas' ? 'Todas las estaciones' : e}
              {n != null && n > 0 && (
                <span className={['rounded px-1.5 text-xs', activo ? 'bg-[#141311] text-[#EDE9E3]' : 'bg-white/15'].join(' ')}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 font-mono tabular text-[#EDE9E3]/70">
            <Clock className="h-4 w-4" />
            {new Date(ahora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            type="button"
            onClick={pantallaCompleta}
            className="hidden items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-2 text-xs text-[#EDE9E3]/80 hover:bg-white/10 sm:flex"
          >
            <Expand className="h-3.5 w-3.5" />
            Pantalla completa
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/10 sm:grid-cols-3 lg:grid-cols-6">
        <Indicador etiqueta="En preparación" valor={String(enCola.length)} />
        <Indicador etiqueta="Atrasadas" valor={String(atrasadas)} alerta={atrasadas > 0} />
        <Indicador etiqueta="En el pase" valor={String(enPase.length)} />
        {metricas.map((m) => (
          <Indicador
            key={m.estacion}
            etiqueta={`Prom. ${m.estacion.toLowerCase()} hoy`}
            valor={m.promedio == null ? '—' : `${m.promedio.toFixed(1)} min`}
            nota={`${m.n} comandas`}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#EDE9E3]/55">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2E8B57]" /> A tiempo</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#D99A1E]" /> Pasó el tiempo estándar</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ember" /> Atrasada (+50%)</span>
        <span>Toca un plato: pendiente → preparando → listo.</span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        {/* Fila de comandas */}
        <div>
          {enCola.length === 0 ? (
            <div className="grid place-items-center rounded-lg border border-dashed border-white/15 py-16 text-sm text-[#EDE9E3]/50">
              Sin comandas pendientes{filtroEst ? ` en ${filtroEst.toLowerCase()}` : ''}.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {enCola.map((c) => (
                <TarjetaComanda
                  key={c.id}
                  comanda={c}
                  ahora={ahora}
                  estacion={filtroEst}
                  onItem={(it) => dispatch({ tipo: 'AVANZAR_ITEM', comandaId: c.id, itemId: it.id })}
                  onListo={() => dispatch({ tipo: 'LISTO_ESTACION', comandaId: c.id, estacion: filtroEst })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pase: listo para despachar */}
        <aside className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#EDE9E3]/60">
            Pase · listo para despachar
          </p>
          {enPase.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center text-xs text-[#EDE9E3]/45">
              Nada esperando en el pase.
            </p>
          ) : (
            enPase.map((c) => {
              const Icono = ICONO_ORIGEN[c.origen];
              const listoTs = Math.max(...itemsVivos(c).map((it) => it.listoTs ?? c.creadaTs));
              return (
                <div key={c.id} className="rounded-lg border border-[#2E8B57]/50 bg-[#2E8B57]/10 p-3">
                  <div className="flex items-center gap-2">
                    <Icono className="h-4 w-4 text-[#7EE2A8]" />
                    <span className="flex-1 truncate font-semibold">{c.etiqueta}</span>
                    <span className="font-mono text-xs tabular text-[#7EE2A8]">
                      {formatoCronometro(ahora - listoTs)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#EDE9E3]/60">
                    {itemsVivos(c).reduce((s, it) => s + it.cantidad, 0)} platos
                    {c.mesero ? ` · ${c.mesero}` : ''}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTiquete(c)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/10 py-1.5 text-xs hover:bg-white/15"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Tiquete
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ tipo: 'ENTREGAR_COMANDA', comandaId: c.id })}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#2E8B57] py-1.5 text-xs font-semibold text-white hover:bg-[#2E8B57]/85"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Despachado
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <p className="pt-2 text-[11px] leading-relaxed text-[#EDE9E3]/45">
            Modelo híbrido: la cocina trabaja en pantalla y en el pase una impresora pequeña saca el
            tiquete que acompaña el plato, para que el mesero o el domiciliario no confundan la mesa.
          </p>
        </aside>
      </div>

      {tiquete && <TiqueteDespacho comanda={tiquete} onCerrar={() => setTiquete(null)} />}
    </div>
  );
}

function Indicador({
  etiqueta,
  valor,
  nota,
  alerta = false,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  alerta?: boolean;
}) {
  return (
    <div className="bg-[#1D1B18] px-3 py-2.5">
      <p className="text-[11px] text-[#EDE9E3]/55">{etiqueta}</p>
      <p className={['mt-0.5 font-mono text-lg font-semibold tabular', alerta ? 'text-[#FF9D80]' : ''].join(' ')}>
        {valor}
      </p>
      {nota && <p className="text-[10px] text-[#EDE9E3]/40">{nota}</p>}
    </div>
  );
}

const CLASE_ITEM: Record<ItemComanda['estado'], string> = {
  Pendiente: 'bg-white/[0.04] hover:bg-white/[0.08]',
  Preparando: 'bg-[#D99A1E]/15 ring-1 ring-[#D99A1E]/50',
  Listo: 'bg-[#2E8B57]/15 opacity-60',
};

function TarjetaComanda({
  comanda,
  ahora,
  estacion,
  onItem,
  onListo,
}: {
  comanda: Comanda;
  ahora: number;
  estacion?: EstacionCocina;
  onItem: (it: ItemComanda) => void;
  onListo: () => void;
}) {
  const color = COLOR_SEMAFORO[semaforo(comanda, ahora, estacion)];
  const IconoOrigen = ICONO_ORIGEN[comanda.origen];
  const IconoCaptura = ICONO_CAPTURA[comanda.captura];
  const items = comanda.items.filter((it) => !estacion || it.estacion === estacion);
  const anulados = items.filter((it) => it.anulado);
  const vivos = items.filter((it) => !it.anulado);

  return (
    <article className={['flex flex-col overflow-hidden rounded-lg border-2 bg-[#1D1B18]', color.borde].join(' ')}>
      <header className={['flex items-center gap-2 px-3 py-2 text-white', color.barra].join(' ')}>
        <IconoOrigen className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-display text-base font-bold">{comanda.etiqueta}</span>
        <span className="font-mono text-lg font-bold tabular">{formatoCronometro(ahora - comanda.creadaTs)}</span>
      </header>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-[11px] text-[#EDE9E3]/60">
        <span>{comanda.id}</span>
        {comanda.ronda > 1 && <span>· Ronda {comanda.ronda}</span>}
        {comanda.mesero && <span className="truncate">· {comanda.mesero}</span>}
        <span className="ml-auto flex items-center gap-1" title={`Tomada por ${comanda.captura.toLowerCase()}`}>
          <IconoCaptura className="h-3 w-3" />
          {comanda.captura}
        </span>
      </div>

      <ul className="flex-1 space-y-1 p-2">
        {vivos.map((it) => {
          const espera = minutosParaIniciar(comanda, it, ahora);
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onItem(it)}
                className={['w-full rounded-md px-2.5 py-2 text-left transition-colors', CLASE_ITEM[it.estado]].join(' ')}
              >
                <div className="flex items-start gap-2">
                  <span className="font-mono text-lg font-bold leading-none tabular">{it.cantidad}</span>
                  <div className="min-w-0 flex-1">
                    <p className={['text-[15px] font-semibold leading-tight', it.estado === 'Listo' ? 'line-through' : ''].join(' ')}>
                      {it.nombre}
                    </p>
                    {it.combo && <p className="text-[11px] text-[#EDE9E3]/50">de {it.combo}</p>}
                    {it.nota && (
                      <p className="mt-0.5 text-[13px] font-semibold text-[#F5C96B]">⚠ {it.nota}</p>
                    )}
                  </div>
                  <div className="text-right text-[10px] uppercase tracking-wide">
                    {!estacion && <p className="text-[#EDE9E3]/45">{it.estacion}</p>}
                    <p className={it.estado === 'Preparando' ? 'font-bold text-[#F5C96B]' : it.estado === 'Listo' ? 'text-[#7EE2A8]' : 'text-[#EDE9E3]/50'}>
                      {it.estado}
                    </p>
                  </div>
                </div>
                {espera > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-[#9EC5FF]">
                    <Hourglass className="h-3 w-3" />
                    Iniciar en {espera} min para que salga con lo demás
                  </p>
                )}
              </button>
            </li>
          );
        })}
        {anulados.map((it) => (
          <li key={it.id} className="rounded-md border border-ember/60 bg-ember/15 px-2.5 py-1.5">
            <p className="text-sm font-semibold text-[#FF9D80] line-through">
              {it.cantidad} {it.nombre}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF9D80]">
              Anulado · {it.anulado!.motivo}
            </p>
          </li>
        ))}
      </ul>

      <div className="border-t border-white/10 p-2">
        <Boton
          type="button"
          onClick={onListo}
          className="w-full !bg-[#EDE9E3] !py-2.5 !text-[#141311] hover:!bg-white"
        >
          <CheckCheck className="h-4 w-4" />
          {estacion ? `Listo ${estacion.toLowerCase()}` : 'Todo listo'}
        </Boton>
      </div>
    </article>
  );
}

function TiqueteDespacho({ comanda, onCerrar }: { comanda: Comanda; onCerrar: () => void }) {
  const items = itemsVivos(comanda);
  return (
    <Modal titulo="Tiquete de despacho" descripcion="Se imprime en el pase y va con el plato" onCerrar={onCerrar} ancho="max-w-sm">
      <div className="space-y-3">
        <div className="imprimible mx-auto max-w-[280px] space-y-2 bg-white p-4 font-mono text-[13px] text-ink ring-1 ring-line">
          <p className="text-center text-xl font-bold">{comanda.etiqueta}</p>
          <p className="text-center text-[11px]">
            {comanda.id} · ronda {comanda.ronda}
            {comanda.mesero ? ` · ${comanda.mesero}` : ''}
          </p>
          <div className="border-y border-dashed border-ink/40 py-2">
            {items.map((it) => (
              <div key={it.id}>
                <p>
                  {it.cantidad} × {it.nombre}
                </p>
                {it.nota && <p className="pl-4 text-[11px]">» {it.nota}</p>}
              </div>
            ))}
          </div>
          <p className="text-center text-[11px]">
            Pedido {new Date(comanda.creadaTs).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })} · Listo{' '}
            {new Date().toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <Boton type="button" onClick={() => window.print()} className="no-imprimir w-full">
          <Printer className="h-4 w-4" />
          Imprimir
        </Boton>
      </div>
    </Modal>
  );
}
