import { useMemo, useState } from 'react';
import type { OrigenAsiento } from '../types';
import { useTienda } from '../store/tienda';
import { formatoMoneda, totalDebitos } from '../lib/contabilidad';
import { filtrarPorSede } from '../lib/sedes';
import { AsientoBloque } from '../components/AsientoBloque';
import { EstadoVacio, Paginacion, usePaginacion } from '../components/ui';

type Filtro = 'todos' | OrigenAsiento;

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'venta', label: 'Ventas' },
  { id: 'domicilio', label: 'Domicilios' },
  { id: 'compra', label: 'Compras' },
  { id: 'gasto', label: 'Gastos' },
  { id: 'nomina', label: 'Nómina' },
  { id: 'liquidacion', label: 'Liquidaciones' },
  { id: 'apertura', label: 'Apertura' },
];

const POR_PAGINA = 12;

export function LibroDiario() {
  const { estado, sedeActual } = useTienda();
  const vista = useMemo(() => filtrarPorSede(estado, sedeActual), [estado, sedeActual]);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const asientos = vista.asientos
    .filter((a) => filtro === 'todos' || a.origen === filtro)
    .slice()
    .reverse();

  const pag = usePaginacion(asientos, POR_PAGINA);
  const movimientoAcumulado = asientos.reduce((s, a) => s + totalDebitos(a), 0);

  const cambiarFiltro = (f: Filtro) => {
    setFiltro(f);
    pag.reiniciar();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => cambiarFiltro(f.id)}
            className={[
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              filtro === f.id
                ? 'border-ink bg-ink text-paper'
                : 'border-line text-ink/70 hover:border-ink',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-sm text-muted">
          {asientos.length} asientos. Partida doble verificada en cada uno.
        </p>
        <p className="text-sm text-muted">
          Movimiento{' '}
          <span className="font-mono tabular text-ink">{formatoMoneda(movimientoAcumulado)}</span>
        </p>
      </div>

      {asientos.length === 0 ? (
        <EstadoVacio>No hay asientos para este filtro.</EstadoVacio>
      ) : (
        <>
          <div className="space-y-3">
            {pag.visibles.map((asiento) => (
              <AsientoBloque key={asiento.id} asiento={asiento} cuentas={estado.cuentas} />
            ))}
          </div>
          <div className="rounded-lg border border-line bg-surface">
            <Paginacion
              pagina={pag.pagina}
              totalPaginas={pag.totalPaginas}
              totalItems={pag.totalItems}
              onCambio={pag.irA}
              etiqueta="asientos"
            />
          </div>
        </>
      )}
    </div>
  );
}
