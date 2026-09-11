import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, UserCheck, X } from 'lucide-react';
import type { EstadoReserva, Reserva, ZonaSalon } from '../types';
import { useTienda } from '../store/tienda';
import { ZONAS_SALON } from '../data/salon';
import { formatoFecha, hoyISO } from '../lib/contabilidad';
import { reservasDelDia, vistaSalon } from '../lib/salon';
import { filtrarPorSede, sedeParaOperar } from '../lib/sedes';
import { Boton, Campo, Entrada, EstadoVacio, Etiqueta, Kpi, Panel, Selector } from '../components/ui';

const TONO: Record<EstadoReserva, 'neutro' | 'ingreso' | 'egreso' | 'info'> = {
  Pendiente: 'info',
  Confirmada: 'ingreso',
  Sentada: 'neutro',
  Cumplida: 'ingreso',
  'No-show': 'egreso',
  Cancelada: 'egreso',
};

export function Reservas() {
  const { estado, sedeActual } = useTienda();
  const vista = useMemo(() => filtrarPorSede(estado, sedeActual), [estado, sedeActual]);
  const [fecha, setFecha] = useState(hoyISO());

  const agenda = useMemo(() => reservasDelDia(vista, fecha), [vista, fecha]);

  const kpi = useMemo(() => {
    const cuenta = (e: EstadoReserva) => agenda.filter((r) => r.estado === e).length;
    return {
      total: agenda.length,
      personas: agenda
        .filter((r) => r.estado !== 'Cancelada' && r.estado !== 'No-show')
        .reduce((s, r) => s + r.personas, 0),
      confirmadas: cuenta('Confirmada'),
      pendientes: cuenta('Pendiente'),
      enMesa: cuenta('Sentada') + cuenta('Cumplida'),
      caidas: cuenta('No-show') + cuenta('Cancelada'),
    };
  }, [agenda]);

  const proximas = useMemo(
    () =>
      vista.reservas
        .filter((r) => r.fecha > fecha && r.estado !== 'Cancelada')
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
        .slice(0, 6),
    [vista.reservas, fecha],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        <Kpi etiqueta="Reservas del día" valor={String(kpi.total)} />
        <Kpi etiqueta="Comensales esperados" valor={String(kpi.personas)} tono="ingreso" />
        <Kpi etiqueta="Confirmadas" valor={String(kpi.confirmadas)} />
        <Kpi etiqueta="Pendientes" valor={String(kpi.pendientes)} />
        <Kpi etiqueta="Sentadas / cumplidas" valor={String(kpi.enMesa)} />
        <Kpi etiqueta="No-show + canceladas" valor={String(kpi.caidas)} tono="egreso" />
      </div>

      <FormularioReserva />

      <Panel
        titulo="Agenda del día"
        descripcion="Confirma, cancela o sienta cada reserva. Al sentarla se abre la cuenta de la mesa."
        sufijo={
          <label className="flex items-center gap-2 text-xs text-muted">
            <CalendarClock className="h-3.5 w-3.5" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-ink"
            />
          </label>
        }
        sinPadding
      >
        {agenda.length === 0 ? (
          <div className="p-4">
            <EstadoVacio>No hay reservas para {formatoFecha(fecha)}.</EstadoVacio>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {agenda.map((r) => (
              <FilaReserva key={r.id} reserva={r} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel titulo="Próximas reservas" sinPadding>
        {proximas.length === 0 ? (
          <div className="p-4">
            <EstadoVacio>Sin reservas en días posteriores.</EstadoVacio>
          </div>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {proximas.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-28 shrink-0 text-ink/80">{formatoFecha(r.fecha)}</span>
                <span className="w-12 shrink-0 font-mono text-xs text-muted">{r.hora}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.cliente}</span>
                <span className="text-xs text-muted">{r.personas} pers.</span>
                <Etiqueta tono={TONO[r.estado]}>{r.estado}</Etiqueta>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// --- Formulario de nueva reserva --------------------------------

function FormularioReserva() {
  const { estado, dispatch, sedeActual } = useTienda();
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState('20:00');
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [personas, setPersonas] = useState('2');
  const [zona, setZona] = useState<'' | ZonaSalon>('');
  const [mesaId, setMesaId] = useState('');
  const [notas, setNotas] = useState('');
  const [sedeReserva, setSedeReserva] = useState(sedeParaOperar(sedeActual, estado.sedes));

  useEffect(() => {
    setSedeReserva(sedeParaOperar(sedeActual, estado.sedes));
    setMesaId('');
  }, [sedeActual, estado.sedes]);

  const mesasZona = estado.mesas.filter(
    (m) => m.sedeId === sedeReserva && (zona ? m.zona === zona : true),
  );

  const crear = () => {
    const n = Number(personas);
    if (!cliente.trim() || !Number.isFinite(n) || n <= 0 || !sedeReserva) return;
    dispatch({
      tipo: 'NUEVA_RESERVA',
      fecha,
      hora,
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      personas: n,
      zona: zona || undefined,
      mesaId: mesaId || undefined,
      notas: notas.trim() || undefined,
      sedeId: sedeReserva,
    });
    setCliente('');
    setTelefono('');
    setPersonas('2');
    setMesaId('');
    setNotas('');
  };

  return (
    <Panel titulo="Nueva reserva">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Fecha">
            <Entrada type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Campo>
          <Campo etiqueta="Hora">
            <Entrada type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Campo>
          <Campo etiqueta="Cliente">
            <Entrada value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Familia Ochoa" />
          </Campo>
          <Campo etiqueta="Teléfono">
            <Entrada value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="311 9988776" />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Personas">
            <Entrada
              type="number"
              min={1}
              value={personas}
              onChange={(e) => setPersonas(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Zona (opcional)">
            <Selector
              value={zona}
              onChange={(e) => {
                setZona(e.target.value as '' | ZonaSalon);
                setMesaId('');
              }}
            >
              <option value="">Sin preferencia</option>
              {ZONAS_SALON.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Mesa (opcional)">
            <Selector value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
              <option value="">Sin asignar</option>
              {mesasZona.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} · {m.capacidad} p · {m.zona}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Notas (opcional)">
            <Entrada value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Cumpleaños" />
          </Campo>
          <Campo etiqueta="Sede">
            <Selector value={sedeReserva} onChange={(e) => setSedeReserva(e.target.value)}>
              {estado.sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
        </div>
      </div>
      <Boton
        type="button"
        onClick={crear}
        disabled={!cliente.trim() || !sedeReserva}
        className="mt-3"
      >
        Crear reserva
      </Boton>
    </Panel>
  );
}

// --- Fila de la agenda con acciones -----------------------------

function FilaReserva({ reserva }: { reserva: Reserva }) {
  const { estado, dispatch } = useTienda();
  const [sentando, setSentando] = useState(false);

  const mesa = reserva.mesaId ? estado.mesas.find((m) => m.id === reserva.mesaId) : undefined;
  const activa = reserva.estado === 'Pendiente' || reserva.estado === 'Confirmada';

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-mono text-sm font-semibold tabular text-ink">{reserva.hora}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          {reserva.cliente}
          <span className="ml-2 text-xs text-muted">
            {reserva.personas} pers.
            {reserva.zona ? ` · ${reserva.zona}` : ''}
            {mesa ? ` · ${mesa.nombre}` : ''}
          </span>
        </span>
        <span className="font-mono text-xs text-muted">{reserva.id}</span>
        <Etiqueta tono={TONO[reserva.estado]}>{reserva.estado}</Etiqueta>
      </div>

      {reserva.notas && <p className="mt-1 text-xs text-muted">Nota: {reserva.notas}</p>}

      {activa && (
        <div className="mt-2 flex flex-wrap gap-2">
          {reserva.estado === 'Pendiente' && (
            <Boton
              type="button"
              variante="secundario"
              onClick={() =>
                dispatch({ tipo: 'ESTADO_RESERVA', reservaId: reserva.id, estado: 'Confirmada' })
              }
              className="!px-2.5 !py-1.5 text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              Confirmar
            </Boton>
          )}
          <Boton
            type="button"
            onClick={() => setSentando((v) => !v)}
            className="!px-2.5 !py-1.5 text-xs"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Sentar
          </Boton>
          <button
            type="button"
            onClick={() =>
              dispatch({ tipo: 'ESTADO_RESERVA', reservaId: reserva.id, estado: 'No-show' })
            }
            className="rounded-md border border-line px-2.5 py-1.5 text-xs text-muted hover:border-ember hover:text-ember"
          >
            No-show
          </button>
          <button
            type="button"
            onClick={() =>
              dispatch({ tipo: 'ESTADO_RESERVA', reservaId: reserva.id, estado: 'Cancelada' })
            }
            className="rounded-md border border-line px-2.5 py-1.5 text-xs text-muted hover:border-ember hover:text-ember"
          >
            <X className="mr-1 inline h-3 w-3" />
            Cancelar
          </button>
        </div>
      )}

      {sentando && activa && (
        <PanelSentar reserva={reserva} onHecho={() => setSentando(false)} />
      )}
    </li>
  );
}

function PanelSentar({ reserva, onHecho }: { reserva: Reserva; onHecho: () => void }) {
  const { estado, dispatch } = useTienda();
  const meseros = estado.empleados.filter((e) => e.activo && e.sedeId === reserva.sedeId);

  const disponibles = useMemo(() => {
    const vistas = vistaSalon(filtrarPorSede(estado, reserva.sedeId));
    return vistas
      .filter((v) => v.estado === 'Libre' || v.mesa.id === reserva.mesaId)
      .map((v) => v.mesa);
  }, [estado, reserva.mesaId, reserva.sedeId]);

  const [mesaId, setMesaId] = useState(reserva.mesaId ?? disponibles[0]?.id ?? '');
  const [comensales, setComensales] = useState(String(reserva.personas));
  const [mesero, setMesero] = useState(meseros[0]?.nombre ?? '');

  const sentar = () => {
    const n = Number(comensales);
    if (!mesaId || !mesero || !Number.isFinite(n) || n <= 0) return;
    dispatch({
      tipo: 'SENTAR_RESERVA',
      reservaId: reserva.id,
      mesaId,
      comensales: n,
      mesero,
    });
    onHecho();
  };

  return (
    <div className="mt-2 grid gap-3 rounded-md border border-line bg-paper/50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <Campo etiqueta="Mesa">
        <Selector value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
          {disponibles.length === 0 && <option value="">Sin mesas libres</option>}
          {disponibles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre} · {m.capacidad} p · {m.zona}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Comensales">
        <Entrada
          type="number"
          min={1}
          value={comensales}
          onChange={(e) => setComensales(e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Mesero">
        <Selector value={mesero} onChange={(e) => setMesero(e.target.value)}>
          {meseros.map((e) => (
            <option key={e.id} value={e.nombre}>
              {e.nombre}
            </option>
          ))}
        </Selector>
      </Campo>
      <Boton type="button" onClick={sentar} disabled={!mesaId} className="!py-2">
        Abrir mesa
      </Boton>
    </div>
  );
}
