import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  FilaProducto,
  PuntoIngresoGasto,
  PuntoVentasDia,
  RenglonGasto,
} from '../lib/contabilidad';
import { formatoCompacto, formatoFechaDia, formatoMoneda } from '../lib/contabilidad';

// Paleta de series validada para superficie blanca (CVD ΔE 10.0).
const COLOR_INGRESO = '#0E9E6E';
const COLOR_GASTO = '#E5471B';
const COLOR_NEUTRO = '#3F3A34';
const GRID = '#E4E0D9';
const EJE = '#7A736A';

const ejeX = {
  tick: { fill: EJE, fontSize: 11 },
  axisLine: { stroke: GRID },
  tickLine: false as const,
};
const ejeY = {
  tick: { fill: EJE, fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
  width: 52,
};

function CajaTooltip({ titulo, filas }: { titulo: string; filas: { etiqueta: string; valor: string }[] }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-ink">{titulo}</p>
      {filas.map((f) => (
        <p key={f.etiqueta} className="flex justify-between gap-4 text-muted">
          <span>{f.etiqueta}</span>
          <span className="font-mono tabular text-ink">{f.valor}</span>
        </p>
      ))}
    </div>
  );
}

const recortar = (texto: string, max = 22) =>
  texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;

// --- Ventas por día ------------------------------------------------

export function GraficaVentasDia({ datos }: { datos: PuntoVentasDia[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="relleno-ventas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR_INGRESO} stopOpacity={0.22} />
            <stop offset="100%" stopColor={COLOR_INGRESO} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={formatoFechaDia} {...ejeX} />
        <YAxis tickFormatter={formatoCompacto} {...ejeY} />
        <Tooltip
          cursor={{ stroke: EJE, strokeDasharray: 3 }}
          content={({ active, payload }) =>
            active && payload && payload.length ? (
              <CajaTooltip
                titulo={formatoFechaDia((payload[0].payload as PuntoVentasDia).fecha)}
                filas={[
                  { etiqueta: 'Ventas', valor: formatoMoneda(payload[0].payload.ventas) },
                  { etiqueta: 'Tickets', valor: String(payload[0].payload.tickets) },
                ]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="ventas"
          stroke={COLOR_INGRESO}
          strokeWidth={2}
          fill="url(#relleno-ventas)"
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// --- Ingresos vs gastos por día ---------------------------------

export function GraficaIngresosGastos({ datos }: { datos: PuntoIngresoGasto[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={formatoFechaDia} {...ejeX} />
        <YAxis tickFormatter={formatoCompacto} {...ejeY} />
        <Tooltip
          cursor={{ fill: 'rgba(28,26,23,0.04)' }}
          content={({ active, payload }) =>
            active && payload && payload.length ? (
              <CajaTooltip
                titulo={formatoFechaDia((payload[0].payload as PuntoIngresoGasto).fecha)}
                filas={[
                  { etiqueta: 'Ingresos', valor: formatoMoneda(payload[0].payload.ingresos) },
                  { etiqueta: 'Gastos', valor: formatoMoneda(payload[0].payload.gastos) },
                ]}
              />
            ) : null
          }
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: EJE, paddingTop: 4 }}
        />
        <Bar dataKey="ingresos" name="Ingresos" fill={COLOR_INGRESO} radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} />
        <Bar dataKey="gastos" name="Gastos" fill={COLOR_GASTO} radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- Gastos por categoría (una sola serie, magnitud) -----------

export function GraficaGastosCategoria({ datos }: { datos: RenglonGasto[] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: formatoCompacto(d.valor) }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, filas.length * 40)}>
      <BarChart
        data={filas}
        layout="vertical"
        margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tickFormatter={formatoCompacto} {...ejeX} />
        <YAxis
          type="category"
          dataKey="nombre"
          tickFormatter={(v: string) => recortar(v)}
          {...ejeY}
          width={150}
        />
        <Tooltip
          cursor={{ fill: 'rgba(28,26,23,0.04)' }}
          content={({ active, payload }) =>
            active && payload && payload.length ? (
              <CajaTooltip
                titulo={payload[0].payload.nombre}
                filas={[{ etiqueta: 'Acumulado', valor: formatoMoneda(payload[0].payload.valor) }]}
              />
            ) : null
          }
        />
        <Bar dataKey="valor" fill={COLOR_GASTO} radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false}>
          <LabelList dataKey="etiqueta" position="right" style={{ fill: EJE, fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- Top productos por ingreso --------------------------------

export function GraficaTopProductos({ datos }: { datos: FilaProducto[] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: formatoCompacto(d.ingreso) }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, filas.length * 40)}>
      <BarChart
        data={filas}
        layout="vertical"
        margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tickFormatter={formatoCompacto} {...ejeX} />
        <YAxis
          type="category"
          dataKey="nombre"
          tickFormatter={(v: string) => recortar(v)}
          {...ejeY}
          width={150}
        />
        <Tooltip
          cursor={{ fill: 'rgba(28,26,23,0.04)' }}
          content={({ active, payload }) =>
            active && payload && payload.length ? (
              <CajaTooltip
                titulo={payload[0].payload.nombre}
                filas={[
                  { etiqueta: 'Ingreso', valor: formatoMoneda(payload[0].payload.ingreso) },
                  { etiqueta: 'Unidades', valor: String(payload[0].payload.unidades) },
                ]}
              />
            ) : null
          }
        />
        <Bar dataKey="ingreso" fill={COLOR_INGRESO} radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false}>
          <LabelList dataKey="etiqueta" position="right" style={{ fill: EJE, fontSize: 11 }} />
          {filas.map((entrada) => (
            <Cell key={entrada.nombre} fill={COLOR_INGRESO} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export { COLOR_INGRESO, COLOR_GASTO, COLOR_NEUTRO };
