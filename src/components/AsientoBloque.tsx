import { Check, TriangleAlert } from 'lucide-react';
import type { Asiento, Cuenta } from '../types';
import {
  asientoCuadra,
  formatoFecha,
  formatoMoneda,
  totalCreditos,
  totalDebitos,
} from '../lib/contabilidad';
import { Etiqueta } from './ui';

const ETIQUETA_ORIGEN: Record<Asiento['origen'], string> = {
  apertura: 'Apertura',
  venta: 'Venta',
  compra: 'Compra',
  gasto: 'Gasto',
  nomina: 'Nómina',
  domicilio: 'Domicilio',
  liquidacion: 'Liquidación',
};

export function AsientoBloque({
  asiento,
  cuentas,
  destacado = false,
}: {
  asiento: Asiento;
  cuentas: Cuenta[];
  destacado?: boolean;
}) {
  const nombreCuenta = (id: number) =>
    cuentas.find((cuenta) => cuenta.id === id)?.nombre ?? `Cuenta ${id}`;

  const debitos = totalDebitos(asiento);
  const creditos = totalCreditos(asiento);
  const cuadra = asientoCuadra(asiento);

  return (
    <article
      className={[
        'rounded-lg border bg-surface',
        destacado ? 'border-ember aparecer' : 'border-line',
      ].join(' ')}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted">{asiento.id}</span>
          <span className="text-sm font-medium text-ink">{asiento.descripcion}</span>
          <Etiqueta tono="info">{ETIQUETA_ORIGEN[asiento.origen]}</Etiqueta>
        </div>
        <span className="font-mono text-xs text-muted">{formatoFecha(asiento.fecha)}</span>
      </header>

      <div className="overflow-x-auto px-4 py-1">
        <div className="min-w-[24rem]">
          <div className="grid grid-cols-[1fr_7.5rem_7.5rem] gap-x-4 border-b border-line py-1.5 text-[11px] font-medium text-muted">
            <span>Cuenta</span>
            <span className="text-right">Débito</span>
            <span className="text-right">Crédito</span>
          </div>

          {asiento.detalles.map((detalle, indice) => (
            <div
              key={`${detalle.cuenta_id}-${indice}`}
              className="grid grid-cols-[1fr_7.5rem_7.5rem] gap-x-4 py-1.5 text-sm"
            >
              <span className={detalle.credito > 0 ? 'pl-5 text-ink/80' : 'text-ink'}>
                <span className="mr-2 font-mono text-xs text-muted">{detalle.cuenta_id}</span>
                {nombreCuenta(detalle.cuenta_id)}
              </span>
              <span className="text-right font-mono tabular text-ink">
                {detalle.debito > 0 ? formatoMoneda(detalle.debito) : '—'}
              </span>
              <span className="text-right font-mono tabular text-ink">
                {detalle.credito > 0 ? formatoMoneda(detalle.credito) : '—'}
              </span>
            </div>
          ))}

          <div className="grid grid-cols-[1fr_7.5rem_7.5rem] gap-x-4 border-t border-ink/25 py-1.5 text-sm font-semibold">
            <span className="flex items-center gap-1.5">
              Sumas iguales
              {cuadra ? (
                <Check className="h-3.5 w-3.5 text-balance" aria-label="El asiento cuadra" />
              ) : (
                <TriangleAlert className="h-3.5 w-3.5 text-ember" aria-label="El asiento no cuadra" />
              )}
            </span>
            <span className="text-right font-mono tabular text-ink">{formatoMoneda(debitos)}</span>
            <span className="text-right font-mono tabular text-ink">{formatoMoneda(creditos)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
