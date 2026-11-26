import { useState } from 'react';
import type {
  CategoriaGasto,
  DestinoCompra,
  FormaPago,
  FormaPagoCompra,
} from '../types';
import { useTienda } from '../store/tienda';
import { CATEGORIAS_GASTO } from '../data/cuentas';
import { formatoFecha, formatoMoneda } from '../lib/contabilidad';
import { Boton, Campo, Entrada, EstadoVacio, Etiqueta, Panel, Selector } from '../components/ui';

type MovimientoUnificado = {
  id: string;
  fecha: string;
  tipo: 'Compra' | 'Gasto';
  detalle: string;
  monto: number;
  formaPago: string;
  asientoId: string;
};

export function ComprasGastos() {
  const { estado, dispatch, sede: sedeForm } = useTienda();

  // --- Formulario de compra ---
  const [proveedor, setProveedor] = useState('');
  const [conceptoCompra, setConceptoCompra] = useState('');
  const [montoCompra, setMontoCompra] = useState('');
  const [destino, setDestino] = useState<DestinoCompra>('Inventario');
  const [categoriaCompra, setCategoriaCompra] = useState<CategoriaGasto>('Mantenimiento');
  const [pagoCompra, setPagoCompra] = useState<FormaPagoCompra>('Crédito');

  const registrarCompra = () => {
    const monto = Number(montoCompra);
    if (
      !proveedor.trim() ||
      !conceptoCompra.trim() ||
      !Number.isFinite(monto) ||
      monto <= 0 ||
      !sedeForm
    )
      return;
    dispatch({
      tipo: 'COMPRA',
      proveedor: proveedor.trim(),
      concepto: conceptoCompra.trim(),
      monto,
      destino,
      categoriaGasto: destino === 'Gasto' ? categoriaCompra : undefined,
      formaPago: pagoCompra,
      sedeId: sedeForm,
    });
    setProveedor('');
    setConceptoCompra('');
    setMontoCompra('');
  };

  // --- Formulario de gasto ---
  const [categoriaGasto, setCategoriaGasto] = useState<CategoriaGasto>('Servicios públicos');
  const [conceptoGasto, setConceptoGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');
  const [pagoGasto, setPagoGasto] = useState<FormaPago>('Transferencia');

  const registrarGasto = () => {
    const monto = Number(montoGasto);
    if (!conceptoGasto.trim() || !Number.isFinite(monto) || monto <= 0 || !sedeForm) return;
    dispatch({
      tipo: 'GASTO',
      categoria: categoriaGasto,
      concepto: conceptoGasto.trim(),
      monto,
      formaPago: pagoGasto,
      sedeId: sedeForm,
    });
    setConceptoGasto('');
    setMontoGasto('');
  };

  const movimientos: MovimientoUnificado[] = [
    ...estado.compras.map((c) => ({
      id: c.id,
      fecha: c.fecha,
      tipo: 'Compra' as const,
      detalle: `${c.proveedor} · ${c.concepto}`,
      monto: c.monto,
      formaPago: c.formaPago,
      asientoId: c.asientoId,
    })),
    ...estado.gastos.map((g) => ({
      id: g.id,
      fecha: g.fecha,
      tipo: 'Gasto' as const,
      detalle: `${g.categoria} · ${g.concepto}`,
      monto: g.monto,
      formaPago: g.formaPago,
      asientoId: g.asientoId,
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id.localeCompare(a.id)));

  return (
    <div className="space-y-4">

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Registrar compra a proveedor">
          <div className="grid gap-3">
            <Campo etiqueta="Proveedor">
              <Entrada
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Distribuidora La Sabana"
              />
            </Campo>
            <Campo etiqueta="Concepto">
              <Entrada
                value={conceptoCompra}
                onChange={(e) => setConceptoCompra(e.target.value)}
                placeholder="Carne, pan y vegetales"
              />
            </Campo>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo etiqueta="Monto">
                <Entrada
                  type="number"
                  min={0}
                  value={montoCompra}
                  onChange={(e) => setMontoCompra(e.target.value)}
                  placeholder="1800000"
                />
              </Campo>
              <Campo etiqueta="Destino">
                <Selector
                  value={destino}
                  onChange={(e) => setDestino(e.target.value as DestinoCompra)}
                >
                  <option value="Inventario">Inventario</option>
                  <option value="Gasto">Gasto</option>
                </Selector>
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {destino === 'Gasto' && (
                <Campo etiqueta="Categoría de gasto">
                  <Selector
                    value={categoriaCompra}
                    onChange={(e) => setCategoriaCompra(e.target.value as CategoriaGasto)}
                  >
                    {CATEGORIAS_GASTO.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Selector>
                </Campo>
              )}
              <Campo etiqueta="Forma de pago">
                <Selector
                  value={pagoCompra}
                  onChange={(e) => setPagoCompra(e.target.value as FormaPagoCompra)}
                >
                  <option value="Crédito">Crédito (proveedores)</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </Selector>
              </Campo>
            </div>
            <Boton
              type="button"
              onClick={registrarCompra}
              disabled={!sedeForm}
              className="mt-1 w-full"
            >
              Registrar compra
            </Boton>
            <p className="text-xs text-muted">
              Genera: débito a {destino === 'Inventario' ? 'Inventario' : 'la cuenta de gasto'} y
              crédito a {pagoCompra === 'Crédito' ? 'Proveedores' : pagoCompra}.
            </p>
          </div>
        </Panel>

        <Panel titulo="Registrar gasto operativo">
          <div className="grid gap-3">
            <Campo etiqueta="Categoría">
              <Selector
                value={categoriaGasto}
                onChange={(e) => setCategoriaGasto(e.target.value as CategoriaGasto)}
              >
                {CATEGORIAS_GASTO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Concepto">
              <Entrada
                value={conceptoGasto}
                onChange={(e) => setConceptoGasto(e.target.value)}
                placeholder="Energía, agua e internet"
              />
            </Campo>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo etiqueta="Monto">
                <Entrada
                  type="number"
                  min={0}
                  value={montoGasto}
                  onChange={(e) => setMontoGasto(e.target.value)}
                  placeholder="920000"
                />
              </Campo>
              <Campo etiqueta="Forma de pago">
                <Selector
                  value={pagoGasto}
                  onChange={(e) => setPagoGasto(e.target.value as FormaPago)}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </Selector>
              </Campo>
            </div>
            <Boton
              type="button"
              onClick={registrarGasto}
              disabled={!sedeForm}
              className="mt-1 w-full"
            >
              Registrar gasto
            </Boton>
            <p className="text-xs text-muted">
              Genera: débito a la cuenta de gasto de la categoría y crédito a {pagoGasto}.
            </p>
          </div>
        </Panel>
      </div>

      <Panel titulo="Compras y gastos registrados" sinPadding>
        {movimientos.length === 0 ? (
          <div className="p-4">
            <EstadoVacio>Aún no hay compras ni gastos registrados.</EstadoVacio>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pl-4 pr-2 font-medium">Folio</th>
                  <th className="px-2 py-2 font-medium">Fecha</th>
                  <th className="px-2 py-2 font-medium">Tipo</th>
                  <th className="px-2 py-2 font-medium">Detalle</th>
                  <th className="px-2 py-2 font-medium">Pago</th>
                  <th className="px-2 py-2 text-right font-medium">Monto</th>
                  <th className="py-2 pl-2 pr-4 text-right font-medium">Asiento</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id} className="border-b border-line/70">
                    <td className="py-2.5 pl-4 pr-2 font-mono text-xs text-muted">{m.id}</td>
                    <td className="px-2 py-2.5 text-ink/80">{formatoFecha(m.fecha)}</td>
                    <td className="px-2 py-2.5">
                      <Etiqueta tono={m.tipo === 'Compra' ? 'info' : 'egreso'}>{m.tipo}</Etiqueta>
                    </td>
                    <td className="px-2 py-2.5 text-ink/80">{m.detalle}</td>
                    <td className="px-2 py-2.5 text-ink/70">{m.formaPago}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular text-ink">
                      {formatoMoneda(m.monto)}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right font-mono text-xs text-muted">
                      {m.asientoId}
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
