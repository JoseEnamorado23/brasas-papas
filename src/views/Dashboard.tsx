import { useEffect, useState } from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { useTienda } from '../store/tienda';
import {
  calcularBalanceGeneral,
  calcularEstadoResultados,
  calcularIndicadores,
  formatoMoneda,
  gastosPorCategoria,
  serieIngresosGastos,
  serieVentasPorDia,
  topProductos,
} from '../lib/contabilidad';
import {
  GraficaGastosCategoria,
  GraficaIngresosGastos,
  GraficaTopProductos,
  GraficaVentasDia,
} from '../components/Graficas';
import { FilaEstado, Kpi, Panel, Regla } from '../components/ui';

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function Dashboard() {
  const { estado } = useTienda();
  const ind = calcularIndicadores(estado);
  const er = calcularEstadoResultados(estado);
  const bg = calcularBalanceGeneral(estado);

  const utilidadPositiva = er.utilidadNeta >= 0;

  // Recharts ResponsiveContainer mide mal el ancho si se monta mientras el
  // layout aún se asienta; montamos las gráficas un frame después.
  const [graficasListas, setGraficasListas] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGraficasListas(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="space-y-4">
      {/* Hero + tira de indicadores */}
      <div className="grid gap-4 lg:grid-cols-[1.05fr_2fr]">
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            Utilidad neta del periodo
          </p>
          <p
            className={[
              'mt-2 break-words font-mono text-3xl font-semibold leading-none tabular sm:text-[2.4rem]',
              utilidadPositiva ? 'text-ink' : 'text-ember',
            ].join(' ')}
          >
            {formatoMoneda(er.utilidadNeta)}
          </p>
          <p className="mt-3 text-xs text-muted">
            Margen bruto {pct(er.margenBruto)} · margen neto {pct(er.margenNeto)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          <Kpi etiqueta="Ventas del periodo" valor={formatoMoneda(ind.ventasBase)} nota={`${ind.numVentas} tickets`} tono="ingreso" />
          <Kpi etiqueta="Ticket promedio" valor={formatoMoneda(ind.ticketPromedio)} />
          <Kpi etiqueta="Costo de ventas" valor={formatoMoneda(er.costoVentas)} tono="egreso" />
          <Kpi etiqueta="Nómina del periodo" valor={formatoMoneda(ind.nominaPeriodo)} tono="egreso" />
          <Kpi etiqueta="Impuestos por pagar" valor={formatoMoneda(ind.impuestosPorPagar)} />
          <Kpi etiqueta="Efectivo disponible" valor={formatoMoneda(ind.efectivoDisponible)} />
        </div>
      </div>

      {/* Gráficas */}
      <Panel titulo="Ventas por día" descripcion="Base gravable diaria de las últimas dos semanas.">
        <div style={{ minHeight: 240 }}>
          {graficasListas && <GraficaVentasDia datos={serieVentasPorDia(estado, 14)} />}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Ingresos vs. gastos" descripcion="Comparación diaria de ingresos y gastos causados.">
          <div style={{ minHeight: 240 }}>
            {graficasListas && <GraficaIngresosGastos datos={serieIngresosGastos(estado, 14)} />}
          </div>
        </Panel>
        <Panel titulo="Gastos por categoría" descripcion="Saldo acumulado de cada cuenta de gasto.">
          <div style={{ minHeight: 240 }}>
            {graficasListas && <GraficaGastosCategoria datos={gastosPorCategoria(estado)} />}
          </div>
        </Panel>
      </div>

      <Panel titulo="Productos más vendidos" descripcion="Ingreso base acumulado por producto.">
        <div style={{ minHeight: 260 }}>
          {graficasListas && <GraficaTopProductos datos={topProductos(estado, 6)} />}
        </div>
      </Panel>

      {/* Estados financieros */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Estado de resultados">
          {er.desgloseIngresos.length > 1 ? (
            <>
              {er.desgloseIngresos.map((r) => (
                <FilaEstado key={r.nombre} concepto={r.nombre} valor={formatoMoneda(r.valor)} sangria />
              ))}
              <FilaEstado concepto="Total ingresos" valor={formatoMoneda(er.ingresos)} fuerte />
            </>
          ) : (
            <FilaEstado concepto="Ingresos por ventas" valor={formatoMoneda(er.ingresos)} />
          )}
          <FilaEstado concepto="Costo de ventas" valor={formatoMoneda(er.costoVentas)} negativo />
          <Regla />
          <FilaEstado concepto="Utilidad bruta" valor={formatoMoneda(er.utilidadBruta)} fuerte />
          {er.desgloseGastos.map((g) => (
            <FilaEstado key={g.nombre} concepto={g.nombre} valor={formatoMoneda(g.valor)} negativo sangria />
          ))}
          <Regla fuerte />
          <FilaEstado
            concepto="Utilidad neta"
            valor={formatoMoneda(Math.abs(er.utilidadNeta))}
            negativo={er.utilidadNeta < 0}
            fuerte
          />
        </Panel>

        <Panel titulo="Balance general">
          {bg.activosDetalle.map((a) => (
            <FilaEstado key={a.nombre} concepto={a.nombre} valor={formatoMoneda(a.valor)} sangria />
          ))}
          <Regla />
          <FilaEstado concepto="Total activos" valor={formatoMoneda(bg.activos)} fuerte />
          <div className="h-2" />
          {bg.pasivosDetalle.map((p) => (
            <FilaEstado key={p.nombre} concepto={p.nombre} valor={formatoMoneda(p.valor)} sangria />
          ))}
          <FilaEstado concepto="Capital social" valor={formatoMoneda(bg.capital)} sangria />
          <FilaEstado
            concepto="Utilidad del ejercicio"
            valor={formatoMoneda(Math.abs(bg.utilidad))}
            negativo={bg.utilidad < 0}
            sangria
          />
          <Regla />
          <FilaEstado
            concepto="Total pasivo + patrimonio"
            valor={formatoMoneda(bg.pasivoMasPatrimonio)}
            fuerte
          />
        </Panel>
      </div>

      <div
        className={[
          'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-5 py-3.5 text-sm',
          bg.cuadra
            ? 'border-balance/30 bg-balance/5 text-balance'
            : 'border-ember/40 bg-ember/5 text-ember',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 font-medium">
          {bg.cuadra ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : (
            <TriangleAlert className="h-4 w-4" aria-hidden />
          )}
          {bg.cuadra
            ? 'La ecuación contable se mantiene: Activos = Pasivos + Patrimonio.'
            : `Descuadre de ${formatoMoneda(Math.abs(bg.descuadre))} en la ecuación contable.`}
        </span>
        <span className="font-mono tabular">
          {formatoMoneda(bg.activos)} = {formatoMoneda(bg.pasivoMasPatrimonio)}
        </span>
      </div>
    </div>
  );
}
