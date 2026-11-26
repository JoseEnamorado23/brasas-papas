import { useEffect, useMemo, useState } from 'react';
import { Armchair, ChefHat, ClipboardList, MousePointerClick } from 'lucide-react';
import { useTienda } from '../store/tienda';
import { useNavegacion } from '../store/navegacion';
import { ZONAS_SALON, CLASE_ESTADO_MESA, COLOR_ESTADO_MESA } from '../data/salon';
import { esMesero } from '../data/personal';
import { formatoMoneda, hoyISO } from '../lib/contabilidad';
import { indicadoresSalon, minutosTranscurridos, vistaSalon, type MesaVista } from '../lib/salon';
import { estadoComanda } from '../lib/comandas';
import { CobrarMesa } from '../components/CobrarMesa';
import type { EstadoMesa } from '../types';
import { Salon3D } from '../components/Salon3D';
import { Plano2D } from '../components/Plano2D';
import { Boton, Campo, EstadoVacio, Kpi, Panel, Selector } from '../components/ui';

const ESTADOS: EstadoMesa[] = ['Libre', 'Ocupada', 'Reservada', 'Por limpiar'];

export function Mesas() {
  const { estado: vista } = useTienda();
  const [sel, setSel] = useState<string | null>(null);

  // Refresca los "minutos en mesa" aunque no haya despachos.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const hoy = hoyISO();
  const vistas = useMemo(() => vistaSalon(vista, hoy), [vista, hoy]);
  const ind = useMemo(() => indicadoresSalon(vista, hoy), [vista, hoy]);
  const seleccionada = sel ? vistas.find((v) => v.mesa.id === sel) ?? null : null;
  const [modo, setModo] = useState<'2D' | '3D'>('2D');

  const listasPorSesion = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of vista.comandas) {
      if (c.origen === 'Mesa' && estadoComanda(c) === 'Lista') {
        m.set(c.referencia, (m.get(c.referencia) ?? 0) + 1);
      }
    }
    return m;
  }, [vista.comandas]);

  const cerradasHoy = useMemo(
    () =>
      vista.sesiones
        .filter((s) => s.estado === 'Cerrada' && s.fecha === hoy)
        .slice()
        .reverse(),
    [vista.sesiones, hoy],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4 lg:grid-cols-8">
        <Kpi etiqueta="Libres" valor={String(ind.libres)} tono="ingreso" />
        <Kpi etiqueta="Ocupadas" valor={String(ind.ocupadas)} tono="egreso" />
        <Kpi etiqueta="Reservadas" valor={String(ind.reservadas)} />
        <Kpi etiqueta="Por limpiar" valor={String(ind.porLimpiar)} />
        <Kpi
          etiqueta="Ocupación"
          valor={`${Math.round(ind.ocupacionPct * 100)}%`}
          nota={`${ind.comensalesSentados} comensales`}
        />
        <Kpi etiqueta="Cuenta abierta" valor={formatoMoneda(ind.cuentaAbiertaTotal)} />
        <Kpi
          etiqueta="Ticket promedio"
          valor={formatoMoneda(ind.ticketPromedio)}
          nota={`${ind.sesionesCerradasHoy} cerradas hoy`}
        />
        <Kpi
          etiqueta="Permanencia media"
          valor={`${ind.permanenciaMedia} min`}
          nota={`rotación ${ind.rotacion.toFixed(1)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Panel
          titulo="Plano del salón"
          descripcion={
            modo === '2D'
              ? 'Vista desde arriba. Toca una mesa para gestionarla.'
              : 'Orbita con el mouse. Toca una mesa para gestionarla.'
          }
          sinPadding
          sufijo={
            <div className="flex rounded-md border border-line p-0.5 text-xs font-medium">
              {(['2D', '3D'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  aria-pressed={modo === m}
                  className={[
                    'rounded px-2.5 py-1 transition-colors',
                    modo === m ? 'bg-ink text-paper' : 'text-ink/70 hover:text-ink',
                  ].join(' ')}
                >
                  {m === '2D' ? 'Plano 2D' : 'Vista 3D'}
                </button>
              ))}
            </div>
          }
        >
          {modo === '2D' ? (
            <Plano2D
              mesas={vistas}
              seleccionada={sel}
              onSelect={setSel}
              listasPorSesion={listasPorSesion}
            />
          ) : (
            <div className="h-[360px] sm:h-[440px] lg:h-[520px]">
              <Salon3D mesas={vistas} seleccionada={sel} onSelect={setSel} />
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-4 py-2.5 text-xs text-muted">
            {ESTADOS.map((e) => (
              <span key={e} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: COLOR_ESTADO_MESA[e] }}
                />
                {e}
              </span>
            ))}
          </div>
        </Panel>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {seleccionada ? (
            <PanelMesa vista={seleccionada} />
          ) : (
            <Panel titulo="Mesa">
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted">
                <MousePointerClick className="h-6 w-6" />
                Toca una mesa en el plano para ver su estado y gestionarla.
              </div>
            </Panel>
          )}
        </div>
      </div>

      <Panel titulo="Ocupación por zona" sinPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pl-4 pr-2 font-medium">Zona</th>
                <th className="px-2 py-2 text-right font-medium">Mesas</th>
                <th className="px-2 py-2 text-right font-medium">Libres</th>
                <th className="px-2 py-2 text-right font-medium">Ocupadas</th>
                <th className="px-2 py-2 text-right font-medium">Reservadas</th>
                <th className="py-2 pl-2 pr-4 text-right font-medium">Por limpiar</th>
              </tr>
            </thead>
            <tbody>
              {ZONAS_SALON.map((z) => {
                const enZona = vistas.filter((v) => v.mesa.zona === z);
                const c = (e: EstadoMesa) => enZona.filter((v) => v.estado === e).length;
                return (
                  <tr key={z} className="border-b border-line/70">
                    <td className="py-2.5 pl-4 pr-2 text-ink">{z}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                      {enZona.length}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-balance">
                      {c('Libre')}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-ember">
                      {c('Ocupada')}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                      {c('Reservada')}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right font-mono tabular text-ink/70">
                      {c('Por limpiar')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel titulo="Sesiones cerradas hoy" sinPadding>
        {cerradasHoy.length === 0 ? (
          <div className="p-4">
            <EstadoVacio>Todavía no se ha cerrado ninguna cuenta hoy.</EstadoVacio>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pl-4 pr-2 font-medium">Sesión</th>
                  <th className="px-2 py-2 font-medium">Mesa</th>
                  <th className="px-2 py-2 font-medium">Mesero</th>
                  <th className="px-2 py-2 text-right font-medium">Comensales</th>
                  <th className="px-2 py-2 text-right font-medium">Duración</th>
                  <th className="px-2 py-2 font-medium">Documento</th>
                  <th className="py-2 pl-2 pr-4 text-right font-medium">Consumo</th>
                </tr>
              </thead>
              <tbody>
                {cerradasHoy.map((s) => {
                  const mesa = vista.mesas.find((m) => m.id === s.mesaId);
                  return (
                    <tr key={s.id} className="border-b border-line/70">
                      <td className="py-2.5 pl-4 pr-2 font-mono text-xs text-muted">{s.id}</td>
                      <td className="px-2 py-2.5 text-ink/80">{mesa?.nombre ?? s.mesaId}</td>
                      <td className="px-2 py-2.5 text-ink/80">{s.mesero}</td>
                      <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                        {s.comensales}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                        {minutosTranscurridos(s.aperturaTs, s.cierreTs ?? s.aperturaTs)} min
                      </td>
                      <td className="px-2 py-2.5 font-mono text-xs text-ink/70">
                        {vista.ventas.find((v) => v.id === s.ventaId)?.facturaId ?? '—'}
                      </td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-mono tabular text-ink">
                        {formatoMoneda(s.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// --- Panel de la mesa seleccionada -----------------------------

function PanelMesa({ vista }: { vista: MesaVista }) {
  const { mesa, estado: estadoMesa } = vista;

  return (
    <Panel
      titulo={mesa.nombre}
      descripcion={`${mesa.zona} · ${mesa.capacidad} puestos`}
      sufijo={
        <span
          className={[
            'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium',
            CLASE_ESTADO_MESA[estadoMesa],
          ].join(' ')}
        >
          {estadoMesa}
        </span>
      }
    >
      {estadoMesa === 'Ocupada' && vista.sesion && <SesionAbierta vista={vista} />}
      {estadoMesa === 'Reservada' && vista.reserva && <MesaReservada vista={vista} />}
      {estadoMesa === 'Libre' && <MesaLibre mesaId={mesa.id} />}
      {estadoMesa === 'Por limpiar' && <MesaPorLimpiar mesaId={mesa.id} />}
    </Panel>
  );
}

function SelectorMesero({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { estado } = useTienda();
  const meseros = estado.empleados.filter(esMesero);
  return (
    <Selector value={value} onChange={(e) => onChange(e.target.value)}>
      {meseros.map((e) => (
        <option key={e.id} value={e.nombre}>
          {e.nombre}
        </option>
      ))}
    </Selector>
  );
}

function MesaLibre({ mesaId }: { mesaId: string }) {
  const { estado, dispatch } = useTienda();
  const mesa = estado.mesas.find((m) => m.id === mesaId)!;
  const meseros = estado.empleados.filter(esMesero);
  const [comensales, setComensales] = useState(String(Math.min(2, mesa.capacidad)));
  const [mesero, setMesero] = useState(meseros[0]?.nombre ?? '');

  const abrir = () => {
    const n = Number(comensales);
    if (!mesero || !Number.isFinite(n) || n <= 0) return;
    dispatch({ tipo: 'ABRIR_MESA', mesaId, comensales: n, mesero });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Mesa disponible. Ábrela para un walk-in.</p>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Comensales">
          <input
            type="number"
            min={1}
            max={mesa.capacidad}
            value={comensales}
            onChange={(e) => setComensales(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </Campo>
        <Campo etiqueta="Mesero">
          <SelectorMesero value={mesero} onChange={setMesero} />
        </Campo>
      </div>
      <Boton type="button" onClick={abrir} className="w-full">
        <Armchair className="h-4 w-4" />
        Abrir mesa
      </Boton>
    </div>
  );
}

function MesaReservada({ vista }: { vista: MesaVista }) {
  const { estado, dispatch } = useTienda();
  const reserva = vista.reserva!;
  const meseros = estado.empleados.filter(esMesero);
  const [comensales, setComensales] = useState(String(reserva.personas));
  const [mesero, setMesero] = useState(meseros[0]?.nombre ?? '');

  const sentar = () => {
    const n = Number(comensales);
    if (!mesero || !Number.isFinite(n) || n <= 0) return;
    dispatch({
      tipo: 'SENTAR_RESERVA',
      reservaId: reserva.id,
      mesaId: vista.mesa.id,
      comensales: n,
      mesero,
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-line bg-paper/50 p-3 text-sm">
        <p className="font-medium text-ink">{reserva.cliente}</p>
        <p className="mt-0.5 text-xs text-muted">
          {reserva.id} · {reserva.hora} · {reserva.personas} personas · {reserva.estado}
        </p>
        {reserva.telefono && <p className="mt-0.5 text-xs text-muted">Tel. {reserva.telefono}</p>}
        {reserva.notas && <p className="mt-1 text-xs text-muted">Nota: {reserva.notas}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Comensales">
          <input
            type="number"
            min={1}
            value={comensales}
            onChange={(e) => setComensales(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </Campo>
        <Campo etiqueta="Mesero">
          <SelectorMesero value={mesero} onChange={setMesero} />
        </Campo>
      </div>
      <Boton type="button" onClick={sentar} className="w-full">
        Sentar reserva
      </Boton>
    </div>
  );
}

function MesaPorLimpiar({ mesaId }: { mesaId: string }) {
  const { dispatch } = useTienda();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        La cuenta se cerró y la mesa está por acondicionar. Márcala como limpia para volver a
        sentar comensales.
      </p>
      <Boton
        type="button"
        variante="secundario"
        onClick={() => dispatch({ tipo: 'LIMPIAR_MESA', mesaId })}
        className="w-full"
      >
        Marcar como limpia
      </Boton>
    </div>
  );
}

function SesionAbierta({ vista }: { vista: MesaVista }) {
  const { estado } = useTienda();
  const nav = useNavegacion();
  const sesion = vista.sesion!;
  const minutos = minutosTranscurridos(sesion.aperturaTs);
  const comandas = estado.comandas.filter((c) => c.referencia === sesion.id);
  const enCocina = comandas.filter((c) => estadoComanda(c) === 'En cocina').length;
  const listas = comandas.filter((c) => estadoComanda(c) === 'Lista').length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md border border-line py-1.5">
          <p className="text-muted">Comensales</p>
          <p className="font-mono text-sm font-semibold text-ink">{sesion.comensales}</p>
        </div>
        <div className="rounded-md border border-line py-1.5">
          <p className="text-muted">En mesa</p>
          <p className="font-mono text-sm font-semibold text-ink">{minutos} min</p>
        </div>
        <div className="rounded-md border border-line py-1.5">
          <p className="text-muted">Mesero</p>
          <p className="truncate px-1 text-sm font-medium text-ink">{sesion.mesero}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-paper/70 px-3 py-2 text-xs text-ink/80">
        <ChefHat className="h-4 w-4 shrink-0 text-muted" />
        {comandas.length === 0
          ? 'Sin pedidos enviados a cocina.'
          : `${comandas.length} ${comandas.length === 1 ? 'ronda' : 'rondas'} · ${enCocina} en preparación · ${listas} en el pase`}
      </div>

      <div className="rounded-md border border-line">
        {sesion.consumo.length === 0 ? (
          <p className="px-3 py-5 text-center text-sm text-muted">Sin consumo registrado.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {sesion.consumo.map((l) => (
              <li key={l.productoId} className="flex items-center gap-2 px-3 py-2">
                <span className="w-6 font-mono tabular text-muted">{l.cantidad}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{l.nombre}</span>
                <span className="font-mono tabular text-ink">
                  {formatoMoneda(l.precioUnit * l.cantidad)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md bg-paper/60 px-3 py-2 text-sm">
        <div className="flex justify-between py-0.5 text-ink/80">
          <span>Base</span>
          <span className="font-mono tabular">{formatoMoneda(sesion.base)}</span>
        </div>
        <div className="flex justify-between py-0.5 text-ink/80">
          <span>Impuesto al consumo (8%)</span>
          <span className="font-mono tabular">{formatoMoneda(sesion.impuesto)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-ink/20 pt-1 font-semibold text-ink">
          <span>Total cuenta</span>
          <span className="font-mono tabular">{formatoMoneda(sesion.total)}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Boton
          type="button"
          variante="secundario"
          onClick={() => nav.ir('pedidos', { mesaId: vista.mesa.id })}
        >
          <ClipboardList className="h-4 w-4" />
          Tomar pedido
        </Boton>
        <CobrarMesa sesion={sesion} nombreMesa={vista.mesa.nombre} />
      </div>
    </div>
  );
}
