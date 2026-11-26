import { useTienda } from '../store/tienda';
import { CATEGORIAS_PRODUCTO } from '../data/menu';
import { formatoMoneda } from '../lib/formato';
import { Panel } from '../components/ui';

/**
 * Carta con disponibilidad. Cuando la cocina se queda sin un insumo, aquí se
 * marca el producto como agotado y deja de poderse vender en caja, en el
 * celular del mesero y, más adelante, en el agente de WhatsApp.
 */
export function CartaAgotados() {
  const { estado, dispatch } = useTienda();
  const agotados = estado.productos.filter((p) => p.agotado).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {agotados === 0
          ? 'Todo disponible.'
          : `${agotados} ${agotados === 1 ? 'producto agotado' : 'productos agotados'}: no aparecen como vendibles en caja ni en el celular del mesero.`}
      </p>
      {CATEGORIAS_PRODUCTO.map((cat) => {
        const productos = estado.productos.filter((p) => p.categoria === cat);
        if (productos.length === 0) return null;
        return (
          <Panel key={cat} titulo={cat} sinPadding>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pl-4 pr-2 font-medium">Producto</th>
                    <th className="px-2 py-2 font-medium">Estación</th>
                    <th className="px-2 py-2 text-right font-medium">Tiempo est.</th>
                    <th className="px-2 py-2 text-right font-medium">Precio</th>
                    <th className="px-2 py-2 text-right font-medium">Margen</th>
                    <th className="py-2 pl-2 pr-4 text-right font-medium">Disponibilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => {
                    const margen = p.precio > 0 ? 1 - p.costo / p.precio : 0;
                    return (
                      <tr key={p.id} className={['border-b border-line/70', p.agotado ? 'bg-ember/[0.03]' : ''].join(' ')}>
                        <td className="py-2.5 pl-4 pr-2">
                          <span className="mr-2" aria-hidden>
                            {p.emoji}
                          </span>
                          <span className={p.agotado ? 'text-muted line-through' : 'text-ink'}>{p.nombre}</span>
                        </td>
                        <td className="px-2 py-2.5 text-ink/70">
                          {p.componentes ? 'Según componentes' : p.estacion}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                          {p.componentes ? '—' : `${p.tiempoPrep} min`}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono tabular text-ink">
                          {formatoMoneda(p.precio)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                          {(margen * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 pl-2 pr-4 text-right">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!p.agotado}
                            onClick={() => dispatch({ tipo: 'AGOTADO', productoId: p.id, agotado: !p.agotado })}
                            className={[
                              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                              p.agotado
                                ? 'border-ember/40 bg-ember/10 text-ember'
                                : 'border-balance/30 bg-balance/10 text-balance',
                            ].join(' ')}
                          >
                            {p.agotado ? 'Agotado' : 'Disponible'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
