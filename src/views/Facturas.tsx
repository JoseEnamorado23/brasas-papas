import { useMemo, useState } from 'react';
import { FileCheck2, Receipt, ScrollText } from 'lucide-react';
import type { Factura, TipoDocumento } from '../types';
import { useTienda } from '../store/tienda';
import { RESOLUCIONES } from '../data/facturacion';
import { formatoMoneda, hoyISO } from '../lib/formato';
import { VisorFactura } from '../components/VisorFactura';
import { Etiqueta, Kpi, Paginacion, Panel, usePaginacion } from '../components/ui';

type Filtro = 'Todos' | TipoDocumento;

const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Documentos electrónicos emitidos. El sistema soporta los dos que pide la DIAN
 * a un restaurante: el tiquete POS electrónico (consumidor final) y la factura
 * electrónica de venta (cuando el cliente la pide con sus datos).
 */
export function Facturas() {
  const { estado } = useTienda();
  const [filtro, setFiltro] = useState<Filtro>('Todos');
  const [abierta, setAbierta] = useState<Factura | null>(null);
  const hoy = hoyISO();

  const lista = useMemo(
    () =>
      estado.facturas
        .filter((f) => filtro === 'Todos' || f.tipo === filtro)
        .slice()
        .sort((a, b) => b.emitidaTs - a.emitidaTs),
    [estado.facturas, filtro],
  );
  const pag = usePaginacion(lista, 15);

  const deHoy = estado.facturas.filter((f) => f.fecha === hoy);
  const totalHoy = deHoy.reduce((s, f) => s + f.total, 0);
  const propinasHoy = deHoy.reduce((s, f) => s + f.propina, 0);
  const fe = estado.facturas.filter((f) => f.tipo === 'FE').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        <Kpi etiqueta="Documentos hoy" valor={String(deHoy.length)} nota={`${estado.facturas.length} en total`} />
        <Kpi etiqueta="Facturado hoy" valor={formatoMoneda(totalHoy)} tono="ingreso" />
        <Kpi etiqueta="Propinas hoy" valor={formatoMoneda(propinasHoy)} nota="Se deben a los empleados" />
        <Kpi
          etiqueta="Facturas electrónicas"
          valor={String(fe)}
          nota={`${((fe / Math.max(1, estado.facturas.length)) * 100).toFixed(0)}% de los documentos`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(['POS', 'FE'] as TipoDocumento[]).map((t) => {
          const r = RESOLUCIONES[t];
          const usados = estado.facturas.filter((f) => f.tipo === t).length;
          const Icono = t === 'POS' ? Receipt : ScrollText;
          return (
            <Panel key={t} titulo={r.nombre} sufijo={<Etiqueta tono="ingreso">Habilitada (demo)</Etiqueta>}>
              <div className="flex gap-3">
                <Icono className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
                <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted">Prefijo</span>
                  <span className="font-mono text-ink">{r.prefijo}</span>
                  <span className="text-muted">Resolución</span>
                  <span className="font-mono text-ink">{r.resolucion}</span>
                  <span className="text-muted">Rango</span>
                  <span className="font-mono text-ink">
                    {r.desde} – {r.hasta}
                  </span>
                  <span className="text-muted">Consecutivo actual</span>
                  <span className="font-mono text-ink">{r.desde + usados - 1}</span>
                  <span className="text-muted">Código único</span>
                  <span className="text-ink">{r.codigo}</span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                {t === 'POS'
                  ? 'Se emite por defecto en cada venta. Reemplaza el tiquete de máquina registradora: la DIAN exige que sea electrónico.'
                  : 'Se emite cuando el cliente la pide con NIT o cédula y correo. Le llega el XML y el PDF para su contabilidad.'}
              </p>
            </Panel>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" />
        <p>
          En producción, cada documento se firma y se envía a la DIAN a través de un proveedor
          tecnológico autorizado, que devuelve el CUDE/CUFE y la validación. En esta demostración la
          numeración, el código y el QR se generan localmente y nada se transmite.
        </p>
      </div>

      <Panel
        titulo="Documentos emitidos"
        sinPadding
        sufijo={
          <div className="flex gap-1">
            {(['Todos', 'POS', 'FE'] as Filtro[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFiltro(f);
                  pag.reiniciar();
                }}
                className={[
                  'rounded-md border px-2.5 py-1 text-xs font-medium',
                  filtro === f ? 'border-ink bg-ink text-paper' : 'border-line text-ink/70 hover:border-ink',
                ].join(' ')}
              >
                {f === 'Todos' ? 'Todos' : f === 'POS' ? 'Tiquetes POS' : 'Facturas'}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pl-4 pr-2 font-medium">Documento</th>
                <th className="px-2 py-2 font-medium">Emitido</th>
                <th className="px-2 py-2 font-medium">Cliente</th>
                <th className="px-2 py-2 font-medium">Canal</th>
                <th className="px-2 py-2 font-medium">Pago</th>
                <th className="py-2 pl-2 pr-4 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {pag.visibles.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setAbierta(f)}
                  className="cursor-pointer border-b border-line/70 hover:bg-paper/60"
                >
                  <td className="py-2.5 pl-4 pr-2">
                    <span className="font-mono text-xs text-ink">{f.id}</span>{' '}
                    <Etiqueta tono={f.tipo === 'FE' ? 'info' : 'neutro'}>{f.tipo}</Etiqueta>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted">{fechaHora.format(new Date(f.emitidaTs))}</td>
                  <td className="max-w-[14rem] truncate px-2 py-2.5 text-ink/85">{f.cliente.nombre}</td>
                  <td className="px-2 py-2.5 text-xs text-ink/70">{f.referencia ?? f.canal}</td>
                  <td className="px-2 py-2.5 text-xs text-ink/70">{f.formaPago}</td>
                  <td className="py-2.5 pl-2 pr-4 text-right font-mono tabular text-ink">
                    {formatoMoneda(f.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginacion
          pagina={pag.pagina}
          totalPaginas={pag.totalPaginas}
          totalItems={pag.totalItems}
          onCambio={pag.irA}
          etiqueta="documentos"
        />
      </Panel>

      {abierta && <VisorFactura factura={abierta} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}
