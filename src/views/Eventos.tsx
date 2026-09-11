import { useEffect, useMemo, useState } from 'react';
import { CalendarHeart, CheckCircle2, X } from 'lucide-react';
import type { EstadoEvento, SolicitudEvento, TipoEvento } from '../types';
import { useTienda } from '../store/tienda';
import { formatoFecha, formatoMoneda, hoyISO } from '../lib/contabilidad';
import { eventosOrdenados, indicadoresEventos } from '../lib/eventos';
import { filtrarPorSede, sedeParaOperar } from '../lib/sedes';
import {
  Boton,
  Campo,
  Entrada,
  EstadoVacio,
  Etiqueta,
  Kpi,
  Panel,
  Selector,
} from '../components/ui';

const TIPOS_EVENTO: TipoEvento[] = [
  'Cumpleaños',
  'Primera comunión',
  'Matrimonio',
  'Grado',
  'Empresarial',
  'Otro',
];

const TONO_ESTADO: Record<EstadoEvento, 'neutro' | 'ingreso' | 'egreso' | 'info'> = {
  'Pendiente por cotizar': 'info',
  Cotizado: 'neutro',
  Confirmado: 'ingreso',
  Realizado: 'ingreso',
  Cancelado: 'egreso',
};

export function Eventos() {
  const { estado, sedeActual } = useTienda();
  const vista = useMemo(() => filtrarPorSede(estado, sedeActual), [estado, sedeActual]);
  const hoy = hoyISO();
  const ind = useMemo(() => indicadoresEventos(vista, hoy), [vista, hoy]);
  const agenda = useMemo(() => eventosOrdenados(vista), [vista]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        <Kpi etiqueta="Solicitudes totales" valor={String(ind.total)} />
        <Kpi etiqueta="Por cotizar" valor={String(ind.pendientesPorCotizar)} />
        <Kpi etiqueta="Cotizados" valor={String(ind.cotizados)} />
        <Kpi etiqueta="Confirmados" valor={String(ind.confirmados)} tono="ingreso" />
        <Kpi etiqueta="Próximos 30 días" valor={String(ind.proximos30Dias)} />
        <Kpi
          etiqueta="Cotizado pendiente de anticipo"
          valor={formatoMoneda(ind.valorCotizadoPendiente)}
          tono="egreso"
        />
      </div>

      <FormularioEvento />

      <Panel
        titulo="Solicitudes de eventos"
        descripcion="Ordenadas por fecha del evento. Cotiza, confirma y registra el anticipo desde cada tarjeta."
        sinPadding
      >
        {agenda.length === 0 ? (
          <div className="p-4">
            <EstadoVacio>Todavía no hay solicitudes de eventos registradas.</EstadoVacio>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {agenda.map((ev) => (
              <TarjetaEvento key={ev.id} evento={ev} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// --- Formulario de nueva solicitud --------------------------------

function FormularioEvento() {
  const { estado, dispatch, sedeActual } = useTienda();
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState('13:00');
  const [lugar, setLugar] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('Cumpleaños');
  const [numeroPersonas, setNumeroPersonas] = useState('30');
  const [descripcion, setDescripcion] = useState('');
  const [sedeEvento, setSedeEvento] = useState(sedeParaOperar(sedeActual, estado.sedes));

  useEffect(() => {
    setSedeEvento(sedeParaOperar(sedeActual, estado.sedes));
  }, [sedeActual, estado.sedes]);

  const crear = () => {
    const n = Number(numeroPersonas);
    if (!cliente.trim() || !lugar.trim() || !Number.isFinite(n) || n <= 0 || !sedeEvento) return;
    dispatch({
      tipo: 'NUEVA_SOLICITUD_EVENTO',
      sedeId: sedeEvento,
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      fecha,
      hora,
      lugar: lugar.trim(),
      tipo_evento: tipo,
      numeroPersonas: n,
      descripcion: descripcion.trim(),
    });
    setCliente('');
    setTelefono('');
    setLugar('');
    setNumeroPersonas('30');
    setDescripcion('');
  };

  return (
    <Panel titulo="Nueva solicitud de evento">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Cliente">
            <Entrada value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Familia Ochoa" />
          </Campo>
          <Campo etiqueta="Teléfono">
            <Entrada value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="311 9988776" />
          </Campo>
          <Campo etiqueta="Fecha del evento">
            <Entrada type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Campo>
          <Campo etiqueta="Hora">
            <Entrada type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Campo>
          <Campo etiqueta="Lugar / dirección">
            <Entrada
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Salón comunal, Cra 8 # 45-12"
            />
          </Campo>
          <Campo etiqueta="Tipo de evento">
            <Selector value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)}>
              {TIPOS_EVENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Selector>
          </Campo>
        </div>

        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Número de personas">
              <Entrada
                type="number"
                min={1}
                value={numeroPersonas}
                onChange={(e) => setNumeroPersonas(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Sede que atiende">
              <Selector value={sedeEvento} onChange={(e) => setSedeEvento(e.target.value)}>
                {estado.sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Selector>
            </Campo>
          </div>
          <Campo etiqueta="Descripción (productos, decoración, etc.)">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Combos de hamburguesas para 30 personas, decoración temática, torta aparte."
              rows={4}
              className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            />
          </Campo>
          <Boton
            type="button"
            onClick={crear}
            disabled={!cliente.trim() || !lugar.trim() || !sedeEvento}
          >
            Registrar solicitud
          </Boton>
        </div>
      </div>
    </Panel>
  );
}

// --- Tarjeta de una solicitud, con sus acciones -------------------

function TarjetaEvento({ evento }: { evento: SolicitudEvento }) {
  const { estado, dispatch } = useTienda();
  const [cotizando, setCotizando] = useState(false);
  const [valorCotizado, setValorCotizado] = useState(String(evento.valorCotizado ?? ''));
  const [valorAnticipo, setValorAnticipo] = useState(String(evento.valorAnticipo ?? ''));

  const sede = estado.sedes.find((s) => s.id === evento.sedeId);
  const activa = evento.estado !== 'Realizado' && evento.estado !== 'Cancelado';

  const cotizar = () => {
    const valor = Number(valorCotizado);
    if (!Number.isFinite(valor) || valor <= 0) return;
    dispatch({ tipo: 'COTIZAR_EVENTO', eventoId: evento.id, valorCotizado: valor });
    const anticipo = Number(valorAnticipo);
    if (Number.isFinite(anticipo) && anticipo > 0) {
      dispatch({
        tipo: 'ANTICIPO_EVENTO',
        eventoId: evento.id,
        pagado: true,
        valorAnticipo: anticipo,
      });
    }
    setCotizando(false);
  };

  const cambiarEstado = (nuevo: EstadoEvento) =>
    dispatch({ tipo: 'ESTADO_EVENTO', eventoId: evento.id, estado: nuevo });

  const marcarAnticipo = () => {
    const valor = Number(valorAnticipo);
    dispatch({
      tipo: 'ANTICIPO_EVENTO',
      eventoId: evento.id,
      pagado: true,
      valorAnticipo: Number.isFinite(valor) && valor > 0 ? valor : evento.valorCotizado,
    });
  };

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">{evento.id}</span>
            <span className="text-sm font-medium text-ink">{evento.cliente}</span>
            <Etiqueta tono="info">{evento.tipo}</Etiqueta>
            <Etiqueta tono={TONO_ESTADO[evento.estado]}>{evento.estado}</Etiqueta>
            {evento.anticipoPagado && <Etiqueta tono="ingreso">Anticipo pagado</Etiqueta>}
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatoFecha(evento.fecha)} · {evento.hora} · {evento.numeroPersonas} personas ·{' '}
            {sede?.nombre ?? evento.sedeId}
          </p>
          <p className="mt-0.5 text-xs text-muted">{evento.lugar}</p>
          {evento.telefono && <p className="mt-0.5 text-xs text-muted">Tel. {evento.telefono}</p>}
          {evento.descripcion && (
            <p className="mt-1.5 max-w-2xl text-sm text-ink/80">{evento.descripcion}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          {evento.valorCotizado != null && (
            <p className="font-mono text-sm font-semibold tabular text-ink">
              {formatoMoneda(evento.valorCotizado)}
            </p>
          )}
          {evento.anticipoPagado && evento.valorAnticipo != null && (
            <p className="text-xs text-muted">Anticipo {formatoMoneda(evento.valorAnticipo)}</p>
          )}
        </div>
      </div>

      {activa && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Boton
            type="button"
            variante="secundario"
            onClick={() => setCotizando((v) => !v)}
            className="!px-2.5 !py-1.5 text-xs"
          >
            {evento.valorCotizado != null ? 'Actualizar cotización' : 'Cotizar'}
          </Boton>
          {evento.estado === 'Cotizado' && (
            <Boton
              type="button"
              onClick={() => cambiarEstado('Confirmado')}
              className="!px-2.5 !py-1.5 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmar
            </Boton>
          )}
          {evento.estado === 'Confirmado' && (
            <Boton
              type="button"
              onClick={() => cambiarEstado('Realizado')}
              className="!px-2.5 !py-1.5 text-xs"
            >
              <CalendarHeart className="h-3.5 w-3.5" />
              Marcar realizado
            </Boton>
          )}
          {evento.estado === 'Confirmado' && !evento.anticipoPagado && (
            <Boton
              type="button"
              variante="secundario"
              onClick={marcarAnticipo}
              className="!px-2.5 !py-1.5 text-xs"
            >
              Registrar anticipo
            </Boton>
          )}
          <button
            type="button"
            onClick={() => cambiarEstado('Cancelado')}
            className="rounded-md border border-line px-2.5 py-1.5 text-xs text-muted hover:border-ember hover:text-ember"
          >
            <X className="mr-1 inline h-3 w-3" />
            Cancelar
          </button>
        </div>
      )}

      {cotizando && activa && (
        <div className="mt-2 grid gap-3 rounded-md border border-line bg-paper/50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Campo etiqueta="Valor cotizado">
            <Entrada
              type="number"
              min={0}
              value={valorCotizado}
              onChange={(e) => setValorCotizado(e.target.value)}
              placeholder="2800000"
            />
          </Campo>
          <Campo etiqueta="Anticipo (opcional)">
            <Entrada
              type="number"
              min={0}
              value={valorAnticipo}
              onChange={(e) => setValorAnticipo(e.target.value)}
              placeholder="1000000"
            />
          </Campo>
          <Boton type="button" onClick={cotizar} className="!py-2">
            Guardar cotización
          </Boton>
        </div>
      )}
    </li>
  );
}
