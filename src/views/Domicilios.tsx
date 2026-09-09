import { useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type {
  CanalDomicilio,
  EstadoPedido,
  FormaPago,
  PedidoDomicilio,
  ZonaDomicilio,
} from '../types';
import { useTienda } from '../store/tienda';
import { IMPUESTO_CONSUMO } from '../data/cuentas';
import { ZONAS_DOMICILIO, tarifaZona } from '../data/domicilios';
import {
  calcularIndicadoresDomicilios,
  formatoFecha,
  formatoMoneda,
  pedidosPorZona,
  porCobrarPlataforma,
} from '../lib/contabilidad';
import { Boton, Campo, Entrada, EstadoVacio, Etiqueta, Kpi, Panel, Selector } from '../components/ui';

const COLUMNAS: { estado: EstadoPedido; titulo: string; accion: string }[] = [
  { estado: 'Recibido', titulo: 'Recibidos', accion: 'Pasar a cocina' },
  { estado: 'En preparación', titulo: 'En preparación', accion: 'Despachar' },
  { estado: 'En camino', titulo: 'En camino', accion: 'Marcar entregado' },
];

export function Domicilios() {
  const { estado, dispatch } = useTienda();
  const ind = calcularIndicadoresDomicilios(estado);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        <Kpi etiqueta="Pedidos activos" valor={String(ind.activos)} />
        <Kpi etiqueta="Entregados" valor={String(ind.entregados)} nota={`${ind.cancelados} cancelados`} />
        <Kpi etiqueta="Ingresos por domicilios" valor={formatoMoneda(ind.ingresoDomicilios)} tono="ingreso" />
        <Kpi etiqueta="Ticket promedio" valor={formatoMoneda(ind.ticketPromedio)} />
        <Kpi etiqueta="Por cobrar plataformas" valor={formatoMoneda(ind.porCobrarPlataformas)} />
        <Kpi etiqueta="Comisiones + reparto" valor={formatoMoneda(ind.comisiones + ind.costoReparto)} tono="egreso" />
      </div>

      <FormularioPedido />

      <Tablero
        pedidos={estado.pedidos}
        onAvanzar={(id) => dispatch({ tipo: 'AVANZAR_PEDIDO', pedidoId: id })}
        onCancelar={(id) => {
          if (window.confirm('¿Cancelar este pedido?')) {
            dispatch({ tipo: 'CANCELAR_PEDIDO', pedidoId: id });
          }
        }}
        nombreDomiciliario={(pid) =>
          estado.domiciliarios.find((x) => x.id === pid)?.nombre ?? 'Domiciliario'
        }
        nombrePlataforma={(pid) =>
          estado.plataformas.find((x) => x.id === pid)?.nombre ?? 'Plataforma'
        }
      />

      <Entregados pedidos={estado.pedidos} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Liquidaciones />
        <PorZona />
      </div>

      <Domiciliarios />
    </div>
  );
}

// --- Formulario de nuevo pedido -----------------------------------

function FormularioPedido() {
  const { estado, dispatch } = useTienda();

  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [zona, setZona] = useState<ZonaDomicilio>('Centro');
  const [canal, setCanal] = useState<CanalDomicilio>('Propio');
  const [domiciliarioId, setDomiciliarioId] = useState(estado.domiciliarios[0]?.id ?? '');
  const [plataformaId, setPlataformaId] = useState(estado.plataformas[0]?.id ?? '');
  const [domicilio, setDomicilio] = useState(String(tarifaZona('Centro')));
  const [formaPago, setFormaPago] = useState<FormaPago>('Efectivo');

  const [prodSel, setProdSel] = useState(estado.productos[0]?.id ?? '');
  const [cant, setCant] = useState('1');
  const [lineas, setLineas] = useState<{ productoId: string; cantidad: number }[]>([]);

  const cambiarZona = (z: ZonaDomicilio) => {
    setZona(z);
    setDomicilio(String(tarifaZona(z)));
  };

  const agregarLinea = () => {
    const cantidad = Number(cant);
    if (!prodSel || !Number.isFinite(cantidad) || cantidad <= 0) return;
    setLineas((prev) => {
      const existe = prev.find((l) => l.productoId === prodSel);
      if (existe) {
        return prev.map((l) =>
          l.productoId === prodSel ? { ...l, cantidad: l.cantidad + cantidad } : l,
        );
      }
      return [...prev, { productoId: prodSel, cantidad }];
    });
    setCant('1');
  };

  const detalle = useMemo(() => {
    const items = lineas.map((l) => {
      const p = estado.productos.find((x) => x.id === l.productoId)!;
      return { ...l, nombre: p.nombre, precio: p.precio, subtotal: p.precio * l.cantidad };
    });
    const base = items.reduce((s, i) => s + i.subtotal, 0);
    const impuesto = Math.round(base * IMPUESTO_CONSUMO);
    const valorDomicilio = Number(domicilio) || 0;
    const plataforma = estado.plataformas.find((x) => x.id === plataformaId);
    const comision =
      canal === 'Plataforma' && plataforma ? Math.round(plataforma.comisionPct * base) : 0;
    return { items, base, impuesto, valorDomicilio, comision };
  }, [lineas, estado.productos, estado.plataformas, domicilio, canal, plataformaId]);

  const total =
    detalle.base + detalle.impuesto + (canal === 'Propio' ? detalle.valorDomicilio : 0);

  const crear = () => {
    if (!cliente.trim() || !direccion.trim() || lineas.length === 0) return;
    dispatch({
      tipo: 'NUEVO_PEDIDO',
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      direccion: direccion.trim(),
      zona,
      canal,
      domiciliarioId: canal === 'Propio' ? domiciliarioId : undefined,
      plataformaId: canal === 'Plataforma' ? plataformaId : undefined,
      domicilio: Number(domicilio) || 0,
      formaPago: canal === 'Plataforma' ? 'Plataforma' : formaPago,
      lineas,
    });
    setCliente('');
    setTelefono('');
    setDireccion('');
    setLineas([]);
  };

  return (
    <Panel titulo="Nuevo pedido a domicilio">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Cliente">
              <Entrada value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="María Gómez" />
            </Campo>
            <Campo etiqueta="Teléfono">
              <Entrada value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="311 4567890" />
            </Campo>
          </div>
          <Campo etiqueta="Dirección">
            <Entrada value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle 12 # 5 - 20, apto 302" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Zona">
              <Selector value={zona} onChange={(e) => cambiarZona(e.target.value as ZonaDomicilio)}>
                {ZONAS_DOMICILIO.map((z) => (
                  <option key={z.zona} value={z.zona}>
                    {z.zona}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Valor del domicilio">
              <Entrada
                type="number"
                min={0}
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
              />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Canal">
              <Selector value={canal} onChange={(e) => setCanal(e.target.value as CanalDomicilio)}>
                <option value="Propio">Domiciliario propio</option>
                <option value="Plataforma">Plataforma</option>
              </Selector>
            </Campo>
            {canal === 'Propio' ? (
              <Campo etiqueta="Domiciliario">
                <Selector value={domiciliarioId} onChange={(e) => setDomiciliarioId(e.target.value)}>
                  {estado.domiciliarios.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </Selector>
              </Campo>
            ) : (
              <Campo etiqueta="Plataforma">
                <Selector value={plataformaId} onChange={(e) => setPlataformaId(e.target.value)}>
                  {estado.plataformas.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre} ({Math.round(x.comisionPct * 100)}%)
                    </option>
                  ))}
                </Selector>
              </Campo>
            )}
          </div>
          {canal === 'Propio' && (
            <Campo etiqueta="Forma de pago">
              <Selector value={formaPago} onChange={(e) => setFormaPago(e.target.value as FormaPago)}>
                <option value="Efectivo">Efectivo (contra entrega)</option>
                <option value="Transferencia">Transferencia</option>
              </Selector>
            </Campo>
          )}
        </div>

        <div className="grid content-start gap-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Campo etiqueta="Producto">
                <Selector
                  className="w-full"
                  value={prodSel}
                  onChange={(e) => setProdSel(e.target.value)}
                >
                  {estado.productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {formatoMoneda(p.precio)}
                    </option>
                  ))}
                </Selector>
              </Campo>
            </div>
            <div className="w-16 shrink-0">
              <Campo etiqueta="Cant.">
                <Entrada
                  className="w-full"
                  type="number"
                  min={1}
                  value={cant}
                  onChange={(e) => setCant(e.target.value)}
                />
              </Campo>
            </div>
            <Boton type="button" variante="secundario" onClick={agregarLinea} className="shrink-0">
              Agregar
            </Boton>
          </div>

          <div className="rounded-md border border-line">
            {detalle.items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">Agrega productos al pedido.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {detalle.items.map((i) => (
                  <li key={i.productoId} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 truncate text-ink">
                      {i.cantidad} × {i.nombre}
                    </span>
                    <span className="font-mono tabular text-ink">{formatoMoneda(i.subtotal)}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setLineas((prev) => prev.filter((l) => l.productoId !== i.productoId))
                      }
                      className="text-muted hover:text-ember"
                      aria-label={`Quitar ${i.nombre}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md bg-paper/60 px-3 py-2 text-sm">
            <div className="flex justify-between py-0.5 text-ink/80">
              <span>Productos + impuesto</span>
              <span className="font-mono tabular">
                {formatoMoneda(detalle.base + detalle.impuesto)}
              </span>
            </div>
            <div className="flex justify-between py-0.5 text-ink/80">
              <span>Domicilio {canal === 'Plataforma' ? '(lo cobra la plataforma)' : ''}</span>
              <span className="font-mono tabular">{formatoMoneda(detalle.valorDomicilio)}</span>
            </div>
            {canal === 'Plataforma' && (
              <div className="flex justify-between py-0.5 text-ember">
                <span>Comisión plataforma</span>
                <span className="font-mono tabular">({formatoMoneda(detalle.comision)})</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-ink/20 pt-1 font-semibold text-ink">
              <span>{canal === 'Plataforma' ? 'Nos remiten' : 'Total a cobrar'}</span>
              <span className="font-mono tabular">
                {formatoMoneda(
                  canal === 'Plataforma'
                    ? detalle.base + detalle.impuesto - detalle.comision
                    : total,
                )}
              </span>
            </div>
          </div>

          <Boton type="button" onClick={crear} disabled={lineas.length === 0 || !cliente.trim()}>
            Crear pedido
          </Boton>
        </div>
      </div>
    </Panel>
  );
}

// --- Tablero de pedidos activos ---------------------------------

function Tablero({
  pedidos,
  onAvanzar,
  onCancelar,
  nombreDomiciliario,
  nombrePlataforma,
}: {
  pedidos: PedidoDomicilio[];
  onAvanzar: (id: string) => void;
  onCancelar: (id: string) => void;
  nombreDomiciliario: (id?: string) => string;
  nombrePlataforma: (id?: string) => string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {COLUMNAS.map((col) => {
        const lista = pedidos.filter((p) => p.estado === col.estado);
        return (
          <div key={col.estado} className="rounded-lg border border-line bg-surface">
            <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h3 className="font-display text-sm font-semibold text-ink">{col.titulo}</h3>
              <span className="font-mono text-xs text-muted">{lista.length}</span>
            </header>
            <div className="space-y-2 p-3">
              {lista.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">Sin pedidos</p>
              ) : (
                lista.map((p) => {
                  const totalCobrar =
                    p.canal === 'Propio'
                      ? p.base + p.impuesto + p.domicilio
                      : p.base + p.impuesto - p.comisionPlataforma;
                  return (
                    <div key={p.id} className="rounded-md border border-line p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-ink">{p.cliente}</span>
                        <span className="font-mono text-xs text-muted">{p.id}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {p.zona} · {p.lineas.reduce((s, l) => s + l.cantidad, 0)} ítems
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Etiqueta tono={p.canal === 'Propio' ? 'info' : 'egreso'}>
                          {p.canal === 'Propio'
                            ? nombreDomiciliario(p.domiciliarioId)
                            : nombrePlataforma(p.plataformaId)}
                        </Etiqueta>
                        <span className="font-mono text-xs text-ink">
                          {formatoMoneda(totalCobrar)}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Boton
                          type="button"
                          onClick={() => onAvanzar(p.id)}
                          className="flex-1 !px-2 !py-1.5 text-xs"
                        >
                          {col.accion}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Boton>
                        <button
                          type="button"
                          onClick={() => onCancelar(p.id)}
                          className="rounded-md border border-line px-2 text-xs text-muted hover:border-ember hover:text-ember"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Entregados recientes --------------------------------------

function Entregados({ pedidos }: { pedidos: PedidoDomicilio[] }) {
  const entregados = pedidos
    .filter((p) => p.estado === 'Entregado')
    .slice()
    .reverse()
    .slice(0, 8);

  return (
    <Panel titulo="Entregados recientes" sinPadding>
      {entregados.length === 0 ? (
        <div className="p-4">
          <EstadoVacio>Todavía no hay pedidos entregados.</EstadoVacio>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pl-4 pr-2 font-medium">Pedido</th>
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Cliente</th>
                <th className="px-2 py-2 font-medium">Canal</th>
                <th className="px-2 py-2 text-right font-medium">Productos</th>
                <th className="px-2 py-2 text-right font-medium">Domicilio</th>
                <th className="py-2 pl-2 pr-4 text-right font-medium">Asiento</th>
              </tr>
            </thead>
            <tbody>
              {entregados.map((p) => (
                <tr key={p.id} className="border-b border-line/70">
                  <td className="py-2.5 pl-4 pr-2 font-mono text-xs text-muted">{p.id}</td>
                  <td className="px-2 py-2.5 text-ink/80">{formatoFecha(p.fecha)}</td>
                  <td className="px-2 py-2.5 text-ink/80">{p.cliente}</td>
                  <td className="px-2 py-2.5">
                    <Etiqueta tono={p.canal === 'Propio' ? 'info' : 'egreso'}>{p.canal}</Etiqueta>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular text-ink">
                    {formatoMoneda(p.base + p.impuesto)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                    {p.canal === 'Propio' ? formatoMoneda(p.domicilio) : '—'}
                  </td>
                  <td className="py-2.5 pl-2 pr-4 text-right font-mono text-xs text-muted">
                    {p.asientoId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// --- Liquidación de plataformas -------------------------------

function Liquidaciones() {
  const { estado, dispatch } = useTienda();
  return (
    <Panel
      titulo="Liquidación de plataformas"
      descripcion="Cobro de los pedidos entregados que la plataforma aún no ha pagado."
    >
      <ul className="divide-y divide-line">
        {estado.plataformas.map((plat) => {
          const monto = porCobrarPlataforma(estado, plat.id);
          const pendientes = estado.pedidos.filter(
            (p) => p.plataformaId === plat.id && p.estado === 'Entregado' && !p.liquidado,
          ).length;
          return (
            <li key={plat.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="flex-1">
                <p className="font-medium text-ink">{plat.nombre}</p>
                <p className="text-xs text-muted">
                  Comisión {Math.round(plat.comisionPct * 100)}% · {pendientes} pedidos por cobrar
                </p>
              </div>
              <span className="font-mono tabular text-ink">{formatoMoneda(monto)}</span>
              <Boton
                type="button"
                variante="secundario"
                disabled={monto <= 0}
                onClick={() => dispatch({ tipo: 'LIQUIDAR_PLATAFORMA', plataformaId: plat.id })}
                className="!px-2.5 !py-1.5 text-xs"
              >
                Liquidar
              </Boton>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// --- Pedidos por zona ----------------------------------------

function PorZona() {
  const { estado } = useTienda();
  const filas = pedidosPorZona(estado);
  const max = Math.max(1, ...filas.map((f) => f.ingreso));

  return (
    <Panel titulo="Entregas por zona" descripcion="Pedidos entregados e ingreso de productos.">
      {filas.length === 0 ? (
        <EstadoVacio>Sin entregas registradas.</EstadoVacio>
      ) : (
        <ul className="space-y-2.5">
          {filas.map((f) => (
            <li key={f.zona} className="text-sm">
              <div className="mb-1 flex justify-between">
                <span className="text-ink">
                  {f.zona} <span className="text-muted">· {f.pedidos}</span>
                </span>
                <span className="font-mono tabular text-ink">{formatoMoneda(f.ingreso)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full rounded-full bg-balance"
                  style={{ width: `${(f.ingreso / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// --- Domiciliarios -----------------------------------------

function Domiciliarios() {
  const { estado, dispatch } = useTienda();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tarifa, setTarifa] = useState('3500');

  const agregar = () => {
    const tarifaEntrega = Number(tarifa);
    if (!nombre.trim() || !Number.isFinite(tarifaEntrega) || tarifaEntrega <= 0) return;
    dispatch({
      tipo: 'NUEVO_DOMICILIARIO',
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      tarifaEntrega,
    });
    setNombre('');
    setTelefono('');
    setTarifa('3500');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel titulo="Domiciliarios" sinPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pl-4 pr-2 font-medium">Nombre</th>
                <th className="px-2 py-2 font-medium">Teléfono</th>
                <th className="px-2 py-2 text-right font-medium">Tarifa</th>
                <th className="py-2 pl-2 pr-4 text-right font-medium">Entregas</th>
              </tr>
            </thead>
            <tbody>
              {estado.domiciliarios.map((x) => {
                const entregas = estado.pedidos.filter(
                  (p) => p.domiciliarioId === x.id && p.estado === 'Entregado',
                ).length;
                return (
                  <tr key={x.id} className="border-b border-line/70">
                    <td className="py-2.5 pl-4 pr-2 text-ink">{x.nombre}</td>
                    <td className="px-2 py-2.5 text-ink/70">{x.telefono}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-ink">
                      {formatoMoneda(x.tarifaEntrega)}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right font-mono tabular text-ink/70">
                      {entregas}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel titulo="Agregar domiciliario">
        <div className="grid gap-3">
          <Campo etiqueta="Nombre">
            <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Camilo Vega" />
          </Campo>
          <Campo etiqueta="Teléfono">
            <Entrada value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="312 3456789" />
          </Campo>
          <Campo etiqueta="Tarifa por entrega">
            <Entrada type="number" min={0} value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
          </Campo>
          <Boton type="button" onClick={agregar} className="mt-1 w-full">
            Agregar
          </Boton>
        </div>
      </Panel>
    </div>
  );
}
