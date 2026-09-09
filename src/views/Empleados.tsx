import { useMemo, useState } from 'react';
import { useTienda } from '../store/tienda';
import { calcularLineaNomina } from '../lib/operaciones';
import { formatoFecha, formatoMoneda } from '../lib/contabilidad';
import { Boton, Campo, Entrada, EstadoVacio, Panel } from '../components/ui';

export function Empleados() {
  const { estado, dispatch } = useTienda();

  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [salario, setSalario] = useState('');

  const agregar = () => {
    const monto = Number(salario);
    if (!nombre.trim() || !cargo.trim() || !Number.isFinite(monto) || monto <= 0) return;
    dispatch({ tipo: 'NUEVO_EMPLEADO', nombre: nombre.trim(), cargo: cargo.trim(), salarioMensual: monto });
    setNombre('');
    setCargo('');
    setSalario('');
  };

  const activos = estado.empleados.filter((e) => e.activo);
  const [periodo, setPeriodo] = useState('1–15 de septiembre de 2026');
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(activos.map((e) => e.id)));

  const alternar = (id: string) =>
    setSeleccion((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });

  const previa = useMemo(() => {
    const lineas = estado.empleados
      .filter((e) => seleccion.has(e.id))
      .map((e) => ({ empleado: e, ...calcularLineaNomina(e.salarioMensual) }));
    return {
      lineas,
      devengado: lineas.reduce((s, l) => s + l.devengado, 0),
      deducciones: lineas.reduce((s, l) => s + l.deducciones, 0),
      neto: lineas.reduce((s, l) => s + l.neto, 0),
    };
  }, [estado.empleados, seleccion]);

  const pagarNomina = () => {
    if (previa.lineas.length === 0 || !periodo.trim()) return;
    dispatch({ tipo: 'NOMINA', periodo: periodo.trim(), empleadoIds: [...seleccion] });
  };

  const nominas = [...estado.nominas].reverse();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel titulo="Plantilla" sinPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pl-4 pr-2 font-medium">Empleado</th>
                  <th className="px-2 py-2 font-medium">Cargo</th>
                  <th className="px-2 py-2 text-right font-medium">Salario mensual</th>
                  <th className="py-2 pl-2 pr-4 text-right font-medium">Quincena</th>
                </tr>
              </thead>
              <tbody>
                {estado.empleados.map((e) => (
                  <tr key={e.id} className="border-b border-line/70">
                    <td className="py-2.5 pl-4 pr-2 text-ink">{e.nombre}</td>
                    <td className="px-2 py-2.5 text-ink/70">{e.cargo}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-ink">
                      {formatoMoneda(e.salarioMensual)}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right font-mono tabular text-ink/70">
                      {formatoMoneda(calcularLineaNomina(e.salarioMensual).devengado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel titulo="Agregar empleado">
          <div className="grid gap-3">
            <Campo etiqueta="Nombre">
              <Entrada value={nombre} onChange={(ev) => setNombre(ev.target.value)} placeholder="Camila Nieto" />
            </Campo>
            <Campo etiqueta="Cargo">
              <Entrada value={cargo} onChange={(ev) => setCargo(ev.target.value)} placeholder="Auxiliar de cocina" />
            </Campo>
            <Campo etiqueta="Salario mensual">
              <Entrada
                type="number"
                min={0}
                value={salario}
                onChange={(ev) => setSalario(ev.target.value)}
                placeholder="1450000"
              />
            </Campo>
            <Boton type="button" onClick={agregar} className="mt-1 w-full">
              Agregar a la plantilla
            </Boton>
          </div>
        </Panel>
      </div>

      <Panel
        titulo="Correr nómina quincenal"
        descripcion="Devengado = medio salario mensual. Deducciones de salud y pensión: 8%."
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <Campo etiqueta="Periodo">
              <Entrada value={periodo} onChange={(ev) => setPeriodo(ev.target.value)} />
            </Campo>
            <ul className="mt-1 divide-y divide-line rounded-md border border-line">
              {estado.empleados.map((e) => {
                const linea = calcularLineaNomina(e.salarioMensual);
                return (
                  <li key={e.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={seleccion.has(e.id)}
                        onChange={() => alternar(e.id)}
                        className="h-4 w-4 accent-ink"
                      />
                      <span className="min-w-0 flex-1 truncate text-ink">{e.nombre}</span>
                      <span className="font-mono tabular text-ink/70">
                        {formatoMoneda(linea.neto)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-md border border-line bg-paper/50 p-4">
            <p className="text-xs text-muted">Resumen del pago</p>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/80">Empleados</span>
                <span className="font-mono tabular text-ink">{previa.lineas.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/80">Total devengado</span>
                <span className="font-mono tabular text-ink">{formatoMoneda(previa.devengado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/80">Deducciones (8%)</span>
                <span className="font-mono tabular text-ember">
                  ({formatoMoneda(previa.deducciones)})
                </span>
              </div>
              <div className="flex justify-between border-t border-ink/25 pt-1.5 font-semibold text-ink">
                <span>Neto a pagar</span>
                <span className="font-mono tabular">{formatoMoneda(previa.neto)}</span>
              </div>
            </div>
            <Boton
              type="button"
              onClick={pagarNomina}
              disabled={previa.lineas.length === 0}
              className="mt-3 w-full"
            >
              Pagar nómina
            </Boton>
            <p className="mt-2 text-[11px] text-muted">
              Débito Gastos de personal · Crédito Deducciones por pagar y Bancos.
            </p>
          </div>
        </div>
      </Panel>

      <Panel titulo="Nóminas pagadas" sinPadding>
        {nominas.length === 0 ? (
          <div className="p-4">
            <EstadoVacio>Todavía no se ha corrido ninguna nómina.</EstadoVacio>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pl-4 pr-2 font-medium">Folio</th>
                  <th className="px-2 py-2 font-medium">Fecha</th>
                  <th className="px-2 py-2 font-medium">Periodo</th>
                  <th className="px-2 py-2 text-right font-medium">Devengado</th>
                  <th className="px-2 py-2 text-right font-medium">Deducciones</th>
                  <th className="px-2 py-2 text-right font-medium">Neto</th>
                  <th className="py-2 pl-2 pr-4 text-right font-medium">Asiento</th>
                </tr>
              </thead>
              <tbody>
                {nominas.map((n) => (
                  <tr key={n.id} className="border-b border-line/70">
                    <td className="py-2.5 pl-4 pr-2 font-mono text-xs text-muted">{n.id}</td>
                    <td className="px-2 py-2.5 text-ink/80">{formatoFecha(n.fecha)}</td>
                    <td className="px-2 py-2.5 text-ink/80">{n.periodo}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-ink">
                      {formatoMoneda(n.totalDevengado)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-ink/70">
                      {formatoMoneda(n.totalDeducciones)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular font-semibold text-ink">
                      {formatoMoneda(n.totalNeto)}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right font-mono text-xs text-muted">
                      {n.asientoId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
