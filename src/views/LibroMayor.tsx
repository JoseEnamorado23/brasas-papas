import { Fragment, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useTienda } from '../store/tienda';
import {
  construirBalanceComprobacion,
  formatoFecha,
  formatoMoneda,
} from '../lib/contabilidad';
import { filtrarPorSede } from '../lib/sedes';
import { Panel } from '../components/ui';

const guion = (valor: number) => (valor > 0.5 ? formatoMoneda(valor) : '—');

export function LibroMayor() {
  const { estado, sedeActual } = useTienda();
  const vista = useMemo(() => filtrarPorSede(estado, sedeActual), [estado, sedeActual]);
  const balance = construirBalanceComprobacion(vista);
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div
        className={[
          'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-5 py-3.5 text-sm',
          balance.cuadraMovimientos && balance.cuadraSaldos
            ? 'border-balance/30 bg-balance/5 text-balance'
            : 'border-ember/40 bg-ember/5 text-ember',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {balance.cuadraMovimientos && balance.cuadraSaldos
            ? 'Balance de comprobación cuadrado: débitos = créditos y saldos deudores = acreedores.'
            : 'El balance de comprobación no cuadra.'}
        </span>
        <span className="font-mono tabular">
          {formatoMoneda(balance.totalDebitos)} / {formatoMoneda(balance.totalCreditos)}
        </span>
      </div>

      <Panel
        titulo="Balance de comprobación (sumas y saldos)"
        descripcion="Toca una cuenta para ver el detalle de sus movimientos en el libro mayor."
        sinPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pl-4 pr-2 font-medium">Cuenta</th>
                <th className="px-2 py-2 text-right font-medium">Débitos</th>
                <th className="px-2 py-2 text-right font-medium">Créditos</th>
                <th className="px-2 py-2 text-right font-medium">Saldo deudor</th>
                <th className="py-2 pl-2 pr-4 text-right font-medium">Saldo acreedor</th>
              </tr>
            </thead>
            <tbody>
              {balance.filas.map((fila) => {
                const abierto = abierta === fila.cuenta.id;
                return (
                  <Fragment key={fila.cuenta.id}>
                    <tr
                      onClick={() => setAbierta(abierto ? null : fila.cuenta.id)}
                      className="cursor-pointer border-b border-line/70 hover:bg-paper"
                    >
                      <td className="py-2.5 pl-4 pr-2">
                        <span className="flex items-center gap-1.5">
                          {abierto ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted" />
                          )}
                          <span className="font-mono text-xs text-muted">{fila.cuenta.id}</span>
                          <span className="text-ink">{fila.cuenta.nombre}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono tabular text-ink/80">
                        {guion(fila.debitos)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono tabular text-ink/80">
                        {guion(fila.creditos)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono tabular text-ink">
                        {guion(fila.saldoDeudor)}
                      </td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-mono tabular text-ink">
                        {guion(fila.saldoAcreedor)}
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="border-b border-line bg-paper/60">
                        <td colSpan={5} className="px-4 py-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted">
                                <th className="py-1 pr-2 font-medium">Asiento</th>
                                <th className="px-2 py-1 font-medium">Fecha</th>
                                <th className="px-2 py-1 font-medium">Descripción</th>
                                <th className="px-2 py-1 text-right font-medium">Débito</th>
                                <th className="px-2 py-1 text-right font-medium">Crédito</th>
                                <th className="py-1 pl-2 text-right font-medium">Saldo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fila.movimientos.map((mov, i) => (
                                <tr key={`${mov.asientoId}-${i}`} className="border-t border-line/60">
                                  <td className="py-1 pr-2 font-mono text-muted">{mov.asientoId}</td>
                                  <td className="px-2 py-1 text-ink/70">{formatoFecha(mov.fecha)}</td>
                                  <td className="px-2 py-1 text-ink/70">{mov.descripcion}</td>
                                  <td className="px-2 py-1 text-right font-mono tabular text-ink/80">
                                    {guion(mov.debito)}
                                  </td>
                                  <td className="px-2 py-1 text-right font-mono tabular text-ink/80">
                                    {guion(mov.credito)}
                                  </td>
                                  <td className="py-1 pl-2 text-right font-mono tabular text-ink">
                                    {formatoMoneda(mov.saldoParcial)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink/25 font-semibold text-ink">
                <td className="py-2.5 pl-4 pr-2">Totales</td>
                <td className="px-2 py-2.5 text-right font-mono tabular">
                  {formatoMoneda(balance.totalDebitos)}
                </td>
                <td className="px-2 py-2.5 text-right font-mono tabular">
                  {formatoMoneda(balance.totalCreditos)}
                </td>
                <td className="px-2 py-2.5 text-right font-mono tabular">
                  {formatoMoneda(balance.totalSaldoDeudor)}
                </td>
                <td className="py-2.5 pl-2 pr-4 text-right font-mono tabular">
                  {formatoMoneda(balance.totalSaldoAcreedor)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}
