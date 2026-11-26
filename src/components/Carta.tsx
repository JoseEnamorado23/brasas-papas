import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { CategoriaProducto, Producto } from '../types';
import { CATEGORIAS_PRODUCTO, detalleCombo } from '../data/menu';
import { formatoMoneda } from '../lib/formato';
import { EstadoVacio } from './ui';

type Filtro = 'Todos' | CategoriaProducto;

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Carta táctil con filtro por categoría y buscador. Los productos agotados se
 * ven pero no se pueden tocar, así nadie vende lo que la cocina ya no tiene.
 */
export function Carta({
  productos,
  cantidades,
  onAgregar,
  compacta = false,
}: {
  productos: Producto[];
  cantidades: Record<string, number>;
  onAgregar: (producto: Producto) => void;
  compacta?: boolean;
}) {
  const [categoria, setCategoria] = useState<Filtro>('Todos');
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const orden = (c: CategoriaProducto) => CATEGORIAS_PRODUCTO.indexOf(c);
    return productos
      .filter((p) =>
        q !== '' ? normalizar(p.nombre).includes(q) : categoria === 'Todos' || p.categoria === categoria,
      )
      .sort((a, b) => orden(a.categoria) - orden(b.categoria));
  }, [productos, categoria, busqueda]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {(['Todos', ...CATEGORIAS_PRODUCTO] as Filtro[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(c)}
              className={[
                'shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                categoria === c && !busqueda
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
            className="w-full rounded-md border border-line bg-surface py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-ink"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EstadoVacio>Ningún producto coincide con la búsqueda.</EstadoVacio>
      ) : (
        <div
          className={[
            'grid gap-2',
            compacta ? 'grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3',
          ].join(' ')}
        >
          {filtrados.map((producto) => {
            const enCuenta = cantidades[producto.id] ?? 0;
            const combo = detalleCombo(producto);
            const agotado = Boolean(producto.agotado);
            return (
              <button
                key={producto.id}
                type="button"
                disabled={agotado}
                onClick={() => onAgregar(producto)}
                className={[
                  'relative flex flex-col rounded-lg border bg-surface p-3 text-left transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  agotado
                    ? 'cursor-not-allowed border-dashed border-line opacity-55'
                    : enCuenta > 0
                      ? 'border-ink'
                      : 'border-line hover:border-ink/50',
                ].join(' ')}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={[
                      'grid shrink-0 place-items-center rounded-md bg-paper',
                      compacta ? 'h-9 w-9 text-xl' : 'h-11 w-11 text-2xl',
                    ].join(' ')}
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
                  {enCuenta > 0 && (
                    <span className="rounded bg-ink px-1.5 text-xs font-semibold text-paper">
                      {enCuenta}
                    </span>
                  )}
                </div>
                {agotado && (
                  <span className="mt-2 self-start rounded bg-ember/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ember">
                    Agotado
                  </span>
                )}
                {combo && !compacta && !agotado && (
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
  );
}
