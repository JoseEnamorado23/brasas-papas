import { useMemo, useState } from 'react';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import type { CategoriaProducto, FormaPago } from '../types';
import { useTienda } from '../store/tienda';
import { IMPUESTO_CONSUMO } from '../data/cuentas';
import { CATEGORIAS_PRODUCTO, detalleCombo } from '../data/menu';
import { formatoMoneda } from '../lib/contabilidad';
import { AsientoBloque } from '../components/AsientoBloque';
import { Boton, EstadoVacio, Panel } from '../components/ui';

type Carrito = Record<string, number>;
type FiltroCategoria = 'Todos' | CategoriaProducto;

const RANGO_DIACRITICOS = /[̀-ͯ]/g;

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(RANGO_DIACRITICOS, '').toLowerCase();

export function PuntoDeVenta() {
  const { estado, dispatch } = useTienda();
  const [carrito, setCarrito] = useState<Carrito>({});
  const [formaPago, setFormaPago] = useState<FormaPago>('Efectivo');
  const [ultimaVentaId, setUltimaVentaId] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<FiltroCategoria>('Todos');
  const [busqueda, setBusqueda] = useState('');

  const cambiar = (id: string, delta: number) =>
    setCarrito((prev) => {
      const cantidad = (prev[id] ?? 0) + delta;
      const copia = { ...prev };
      if (cantidad <= 0) delete copia[id];
      else copia[id] = cantidad;
      return copia;
    });

  const quitar = (id: string) =>
    setCarrito((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });

  const ordenCategoria = (c: CategoriaProducto) => CATEGORIAS_PRODUCTO.indexOf(c);

  const productosFiltrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return estado.productos
      .filter((p) => {
        // La búsqueda es global: cuando hay texto, ignora el filtro de categoría.
        if (q !== '') return normalizar(p.nombre).includes(q);
        return categoria === 'Todos' || p.categoria === categoria;
      })
      .sort((a, b) => ordenCategoria(a.categoria) - ordenCategoria(b.categoria));
  }, [estado.productos, categoria, busqueda]);

  const lineas = useMemo(
    () =>
      Object.entries(carrito).map(([productoId, cantidad]) => {
        const producto = estado.productos.find((p) => p.id === productoId)!;
        return { producto, cantidad, subtotal: producto.precio * cantidad };
      }),
    [carrito, estado.productos],
  );

  const base = lineas.reduce((s, l) => s + l.subtotal, 0);
  const impuesto = Math.round(base * IMPUESTO_CONSUMO);
  const total = base + impuesto;

  const registrar = () => {
    if (lineas.length === 0) return;
    dispatch({
      tipo: 'VENTA',
      formaPago,
      lineas: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
    });
    setUltimaVentaId(`V-${String(estado.ventas.length + 1).padStart(4, '0')}`);
    setCarrito({});
  };

  const asientoUltimaVenta =
    ultimaVentaId != null
      ? estado.asientos.find((a) => a.referencia === ultimaVentaId)
      : undefined;

  const chips: FiltroCategoria[] = ['Todos', ...CATEGORIAS_PRODUCTO];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={[
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  categoria === c
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line text-ink/70 hover:border-ink',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto"
              className="w-full rounded-md border border-line bg-surface py-1.5 pl-8 pr-3 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
        </div>

        {productosFiltrados.length === 0 ? (
          <EstadoVacio>Ningún producto coincide con la búsqueda.</EstadoVacio>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {productosFiltrados.map((producto) => {
              const enCarrito = carrito[producto.id] ?? 0;
              const combo = detalleCombo(producto);
              return (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => cambiar(producto.id, 1)}
                  className={[
                    'flex flex-col rounded-lg border bg-surface p-3 text-left transition-colors',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                    enCarrito > 0 ? 'border-ink' : 'border-line hover:border-ink/50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-paper text-2xl"
                      aria-hidden
                    >
                      {producto.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-ink">{producto.nombre}</p>
                      <p className="mt-0.5 font-mono text-sm font-semibold tabular text-ink">
                        {formatoMoneda(producto.precio)}
                      </p>
                    </div>
                    {enCarrito > 0 && (
                      <span className="rounded bg-ink px-1.5 text-xs font-semibold text-paper">
                        {enCarrito}
                      </span>
                    )}
                  </div>

                  {combo && (
                    <div className="mt-2 border-t border-dashed border-line pt-2">
                      <p className="text-[11px] leading-relaxed text-muted">{combo.incluye}</p>
                      {combo.ahorro > 0 && (
                        <p className="mt-0.5 text-[11px] font-medium text-balance">
                          Ahorra {formatoMoneda(combo.ahorro)}
                          <span className="ml-1.5 font-mono text-muted line-through">
                            {formatoMoneda(combo.precioSuelto)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Panel titulo="Cuenta actual" sinPadding>
          <div className="max-h-[40vh] overflow-y-auto px-4 py-3">
            {lineas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Toca un producto o un combo para agregarlo a la cuenta.
              </p>
            ) : (
              <ul className="space-y-2">
                {lineas.map(({ producto, cantidad, subtotal }) => (
                  <li key={producto.id} className="flex items-center gap-2 text-sm">
                    <span className="text-base" aria-hidden>
                      {producto.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ink">{producto.nombre}</p>
                      <p className="font-mono text-xs text-muted">
                        {formatoMoneda(producto.precio)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => cambiar(producto.id, -1)}
                        className="grid h-6 w-6 place-items-center rounded border border-line text-ink hover:border-ink"
                        aria-label={`Quitar una unidad de ${producto.nombre}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-mono tabular text-ink">{cantidad}</span>
                      <button
                        type="button"
                        onClick={() => cambiar(producto.id, 1)}
                        className="grid h-6 w-6 place-items-center rounded border border-line text-ink hover:border-ink"
                        aria-label={`Agregar una unidad de ${producto.nombre}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="w-20 text-right font-mono tabular text-ink">
                      {formatoMoneda(subtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitar(producto.id)}
                      className="text-muted hover:text-ember"
                      aria-label={`Eliminar ${producto.nombre} de la cuenta`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line px-4 py-3 text-sm">
            <div className="flex justify-between py-1 text-ink/80">
              <span>Base gravable</span>
              <span className="font-mono tabular">{formatoMoneda(base)}</span>
            </div>
            <div className="flex justify-between py-1 text-ink/80">
              <span>Impuesto al consumo (8%)</span>
              <span className="font-mono tabular">{formatoMoneda(impuesto)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-ink/25 py-1.5 font-semibold text-ink">
              <span>Total a cobrar</span>
              <span className="font-mono tabular">{formatoMoneda(total)}</span>
            </div>

            <div className="mt-3 flex gap-2">
              {(['Efectivo', 'Transferencia'] as FormaPago[]).map((forma) => (
                <button
                  key={forma}
                  type="button"
                  onClick={() => setFormaPago(forma)}
                  className={[
                    'flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    formaPago === forma
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line text-ink/70 hover:border-ink',
                  ].join(' ')}
                >
                  {forma}
                </button>
              ))}
            </div>

            <Boton
              type="button"
              onClick={registrar}
              disabled={lineas.length === 0}
              className="mt-3 w-full"
            >
              Registrar venta
            </Boton>
          </div>
        </Panel>

        {asientoUltimaVenta && (
          <div className="space-y-2">
            <p className="text-xs text-muted">Asiento generado por la última venta</p>
            <AsientoBloque asiento={asientoUltimaVenta} cuentas={estado.cuentas} destacado />
          </div>
        )}

        <Panel titulo="Últimas ventas">
          {estado.ventas.length === 0 ? (
            <EstadoVacio>Sin ventas registradas todavía.</EstadoVacio>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {estado.ventas
                .slice(-4)
                .reverse()
                .map((venta) => (
                  <li key={venta.id} className="flex items-center justify-between py-2">
                    <span className="font-mono text-xs text-muted">{venta.id}</span>
                    <span className="text-ink/70">
                      {venta.lineas.reduce((s, l) => s + l.cantidad, 0)} und · {venta.formaPago}
                    </span>
                    <span className="font-mono tabular text-ink">{formatoMoneda(venta.total)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
