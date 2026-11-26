import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTienda } from '../store/tienda';
import { formatoFecha, formatoMoneda } from '../lib/contabilidad';
import { AsientoBloque } from '../components/AsientoBloque';
import { EstadoVacio, Etiqueta, Kpi, Paginacion, Panel, usePaginacion } from '../components/ui';

const POR_PAGINA = 8;

export function Ventas() {
  const { estado } = useTienda();
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const alternar = (id: string) =>
    setAbiertos((prev) => {
      const copia = new Set(prev);
      copia.has(id) ? copia.delete(id) : copia.add(id);
      return copia;
    });

  const ventas = [...estado.ventas].reverse();
  const pag = usePaginacion(ventas, POR_PAGINA);
  const totalBase = estado.ventas.reduce((s, v) => s + v.base, 0);
  const totalImpuesto = estado.ventas.reduce((s, v) => s + v.impuesto, 0);
  const unidades = estado.ventas.reduce(
    (s, v) => s + v.lineas.reduce((u, l) => u + l.cantidad, 0),
    0,
  );
  const ticket = estado.ventas.length ? totalBase / estado.ventas.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        <Kpi etiqueta="Ventas (base)" valor={formatoMoneda(totalBase)} />
        <Kpi etiqueta="Impuesto al consumo" valor={formatoMoneda(totalImpuesto)} />
        <Kpi etiqueta="Ticket promedio" valor={formatoMoneda(ticket)} />
        <Kpi etiqueta="Unidades vendidas" valor={String(unidades)} nota={`${estado.ventas.length} tickets`} />
      </div>

      <Panel titulo="Historial de ventas" sinPadding>
        {ventas.length === 0 ? (
          <div className="p-4">
            <EstadoVacio>Todavía no hay ventas. Registra la primera desde el punto de venta.</EstadoVacio>
          </div>
        ) : (
          <div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pl-4 pr-2 font-medium">Folio</th>
                  <th className="px-2 py-2 font-medium">Fecha</th>
                  <th className="px-2 py-2 font-medium">Canal</th>
                  <th className="px-2 py-2 font-medium">Ítems</th>
                  <th className="px-2 py-2 font-medium">Pago</th>
                  <th className="px-2 py-2 text-right font-medium">Base</th>
                  <th className="px-2 py-2 text-right font-medium">Impuesto</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                  <th className="py-2 pl-2 pr-4 text-right font-medium">Asiento</th>
                </tr>
              </thead>
              <tbody>
                {pag.visibles.map((venta) => {
                  const abierto = abiertos.has(venta.id);
                  const asiento = estado.asientos.find((a) => a.id === venta.asientoId);
                  return (
                    <Fragment key={venta.id}>
                      <tr
                        onClick={() => alternar(venta.id)}
                        className="cursor-pointer border-b border-line/70 hover:bg-paper"
                      >
                        <td className="py-2.5 pl-4 pr-2">
                          <span className="flex items-center gap-1 font-mono text-xs text-muted">
                            {abierto ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {venta.id}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-ink/80">{formatoFecha(venta.fecha)}</td>
                        <td className="px-2 py-2.5">
                          <Etiqueta tono={venta.canal === 'Domicilio' ? 'egreso' : 'neutro'}>
                            {venta.canal}
                          </Etiqueta>
                        </td>
                        <td className="px-2 py-2.5 text-ink/80">
                          {venta.lineas.reduce((s, l) => s + l.cantidad, 0)}
                        </td>
                        <td className="px-2 py-2.5">
                          <Etiqueta tono={venta.formaPago === 'Efectivo' ? 'neutro' : 'info'}>
                            {venta.formaPago}
                          </Etiqueta>
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono tabular text-ink">
                          {formatoMoneda(venta.base)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                          {formatoMoneda(venta.impuesto)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono tabular font-semibold text-ink">
                          {formatoMoneda(venta.total)}
                        </td>
                        <td className="py-2.5 pl-2 pr-4 text-right font-mono text-xs text-muted">
                          {venta.asientoId}
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="border-b border-line bg-paper/60">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div>
                                <p className="mb-1.5 text-xs font-medium text-muted">Detalle del pedido</p>
                                <ul className="space-y-1 text-sm">
                                  {venta.lineas.map((l) => (
                                    <li key={l.productoId} className="flex justify-between gap-4">
                                      <span className="text-ink/80">
                                        {l.cantidad} × {l.nombre}
                                      </span>
                                      <span className="font-mono tabular text-ink">
                                        {formatoMoneda(l.cantidad * l.precioUnit)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {asiento && (
                                <AsientoBloque asiento={asiento} cuentas={estado.cuentas} />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line">
            <Paginacion
              pagina={pag.pagina}
              totalPaginas={pag.totalPaginas}
              totalItems={pag.totalItems}
              onCambio={pag.irA}
              etiqueta="ventas"
            />
          </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
