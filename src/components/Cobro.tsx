import { useEffect, useState, type ReactNode } from 'react';
import { Plus, Receipt, ScrollText, Trash2 } from 'lucide-react';
import type { MedioPago, TipoDocumento, TipoIdentificacion } from '../types';
import { IMPUESTO_CONSUMO, PROPINA_SUGERIDA } from '../data/cuentas';
import { MEDIOS_PAGO, RESOLUCIONES } from '../data/facturacion';
import type { DatosCobro } from '../lib/facturacion';
import { formatoMoneda } from '../lib/formato';
import { Modal } from './Modal';
import { Boton, Campo, Entrada, Selector } from './ui';

interface FilaPago {
  medio: MedioPago;
  monto: string;
}

const ETIQUETA_MEDIO: Record<MedioPago, string> = {
  Efectivo: 'Efectivo',
  Nequi: 'Nequi',
  Daviplata: 'Daviplata',
  'Bre-B': 'Bre-B (llave)',
  Tarjeta: 'Tarjeta (datáfono)',
};

/**
 * Cobro en caja: elige el documento electrónico (tiquete POS o factura
 * electrónica), aplica la propina voluntaria y reparte el pago entre uno o
 * varios medios. Solo deja confirmar cuando los pagos cuadran con el total.
 */
export function Cobro({
  titulo,
  descripcion,
  base,
  propinaSugerida,
  onConfirmar,
  onCerrar,
}: {
  titulo: string;
  descripcion?: string;
  base: number;
  /** En mesa se sugiere propina; en mostrador y para llevar, no. */
  propinaSugerida: boolean;
  onConfirmar: (datos: DatosCobro) => void;
  onCerrar: () => void;
}) {
  const impuesto = Math.round(base * IMPUESTO_CONSUMO);
  const total = base + impuesto;
  const sugerida = Math.round(base * PROPINA_SUGERIDA);

  const [conPropina, setConPropina] = useState(propinaSugerida);
  const [propinaTexto, setPropinaTexto] = useState(String(sugerida));
  const propina = conPropina ? Math.max(0, Math.round(Number(propinaTexto) || 0)) : 0;
  const aPagar = total + propina;

  const [documento, setDocumento] = useState<TipoDocumento>('POS');
  const [tipoId, setTipoId] = useState<TipoIdentificacion>('NIT');
  const [numeroId, setNumeroId] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');

  const [pagos, setPagos] = useState<FilaPago[]>([{ medio: 'Efectivo', monto: String(aPagar) }]);
  const [recibido, setRecibido] = useState('');

  // Con un solo medio, el monto sigue al total (cuando cambia la propina).
  useEffect(() => {
    setPagos((prev) => (prev.length === 1 ? [{ ...prev[0], monto: String(aPagar) }] : prev));
  }, [aPagar]);

  const suma = pagos.reduce((s, p) => s + (Math.round(Number(p.monto)) || 0), 0);
  const diferencia = aPagar - suma;
  const efectivo = pagos
    .filter((p) => p.medio === 'Efectivo')
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const cambio = recibido ? Math.max(0, Number(recibido) - efectivo) : 0;

  const datosFe = numeroId.trim() !== '' && nombre.trim() !== '' && correo.includes('@');
  const puedeCobrar = diferencia === 0 && (documento === 'POS' || datosFe);

  const actualizar = (i: number, cambioFila: Partial<FilaPago>) =>
    setPagos((prev) => prev.map((p, k) => (k === i ? { ...p, ...cambioFila } : p)));

  const agregarMedio = () =>
    setPagos((prev) => [
      ...prev,
      { medio: prev.some((p) => p.medio === 'Nequi') ? 'Tarjeta' : 'Nequi', monto: String(Math.max(0, diferencia)) },
    ]);

  const confirmar = () => {
    if (!puedeCobrar) return;
    onConfirmar({
      documento,
      cliente:
        documento === 'FE'
          ? { tipoId, numero: numeroId.trim(), nombre: nombre.trim(), correo: correo.trim() }
          : undefined,
      propina,
      pagos: pagos.map((p) => ({ medio: p.medio, monto: Math.round(Number(p.monto)) || 0 })),
    });
  };

  const res = RESOLUCIONES[documento];

  return (
    <Modal titulo={titulo} descripcion={descripcion} onCerrar={onCerrar} ancho="max-w-xl">
      <div className="space-y-5">
        {/* Totales y propina */}
        <section className="rounded-lg bg-paper/70 px-4 py-3 text-sm">
          <Fila concepto="Base gravable" valor={base} />
          <Fila concepto="Impuesto al consumo (8%)" valor={impuesto} />
          <Fila concepto="Total consumo" valor={total} fuerte />
          {propinaSugerida && (
            <div className="mt-2 border-t border-line pt-2">
              <label className="flex items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  checked={conPropina}
                  onChange={(e) => setConPropina(e.target.checked)}
                  className="h-4 w-4 accent-[#1C1A17]"
                />
                <span className="flex-1">Propina voluntaria (sugerida 10%)</span>
                <input
                  type="number"
                  min={0}
                  value={conPropina ? propinaTexto : '0'}
                  disabled={!conPropina}
                  onChange={(e) => setPropinaTexto(e.target.value)}
                  className="w-28 rounded-md border border-line bg-surface px-2 py-1 text-right font-mono text-sm tabular outline-none focus:border-ink disabled:opacity-50"
                  aria-label="Valor de la propina"
                />
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Se le pregunta al cliente: puede aceptarla, cambiar el valor o no darla. No es ingreso
                del restaurante; queda como cuenta por pagar a los empleados.
              </p>
            </div>
          )}
          <div className="mt-2 flex items-baseline justify-between border-t border-ink/25 pt-2 font-semibold text-ink">
            <span>Total a pagar</span>
            <span className="font-mono text-lg tabular">{formatoMoneda(aPagar)}</span>
          </div>
        </section>

        {/* Documento */}
        <section className="space-y-2">
          <p className="text-xs font-medium text-muted">Documento electrónico</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <OpcionDocumento
              activo={documento === 'POS'}
              onClick={() => setDocumento('POS')}
              icono={<Receipt className="h-4 w-4" />}
              titulo="Tiquete POS electrónico"
              detalle="Consumidor final. Es lo que se entrega en la mayoría de ventas."
            />
            <OpcionDocumento
              activo={documento === 'FE'}
              onClick={() => setDocumento('FE')}
              icono={<ScrollText className="h-4 w-4" />}
              titulo="Factura electrónica"
              detalle="Cuando el cliente la pide con NIT o cédula, para su contabilidad."
            />
          </div>
          {documento === 'FE' && (
            <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[7rem_1fr]">
              <Campo etiqueta="Tipo">
                <Selector value={tipoId} onChange={(e) => setTipoId(e.target.value as TipoIdentificacion)}>
                  <option value="NIT">NIT</option>
                  <option value="CC">Cédula</option>
                  <option value="CE">Cédula ext.</option>
                </Selector>
              </Campo>
              <Campo etiqueta="Número">
                <Entrada value={numeroId} onChange={(e) => setNumeroId(e.target.value)} placeholder="900.123.456-7" />
              </Campo>
              <div className="sm:col-span-2">
                <Campo etiqueta="Nombre o razón social">
                  <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Empresa S.A.S." />
                </Campo>
              </div>
              <div className="sm:col-span-2">
                <Campo etiqueta="Correo para recibir la factura">
                  <Entrada type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="contabilidad@empresa.co" />
                </Campo>
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted">
            Numeración {res.prefijo}-{res.desde} a {res.prefijo}-{res.hasta} · Resolución DIAN{' '}
            {res.resolucion} (simulada)
          </p>
        </section>

        {/* Pagos */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Forma de pago</p>
            <button
              type="button"
              onClick={agregarMedio}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink/70 hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" />
              Pago mixto
            </button>
          </div>
          {pagos.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Selector
                value={p.medio}
                onChange={(e) => actualizar(i, { medio: e.target.value as MedioPago })}
                className="flex-1"
              >
                {MEDIOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {ETIQUETA_MEDIO[m]}
                  </option>
                ))}
              </Selector>
              <input
                type="number"
                min={0}
                value={p.monto}
                onChange={(e) => actualizar(i, { monto: e.target.value })}
                className="w-32 rounded-md border border-line bg-surface px-3 py-2 text-right font-mono text-sm tabular text-ink outline-none focus:border-ink"
                aria-label={`Monto en ${p.medio}`}
              />
              {pagos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPagos((prev) => prev.filter((_, k) => k !== i))}
                  className="text-muted hover:text-ember"
                  aria-label="Quitar medio de pago"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {efectivo > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-muted">Recibido en efectivo</span>
              <input
                type="number"
                min={0}
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
                placeholder={String(efectivo)}
                className="w-32 rounded-md border border-line bg-surface px-3 py-1.5 text-right font-mono text-sm tabular outline-none focus:border-ink"
              />
              <span className="w-28 text-right font-mono tabular text-ink">
                Cambio {formatoMoneda(cambio)}
              </span>
            </div>
          )}
          {diferencia !== 0 && (
            <p className="text-xs font-medium text-ember">
              {diferencia > 0
                ? `Faltan ${formatoMoneda(diferencia)} por asignar`
                : `Los pagos superan el total en ${formatoMoneda(-diferencia)}`}
            </p>
          )}
        </section>

        <Boton type="button" onClick={confirmar} disabled={!puedeCobrar} className="w-full !py-2.5">
          Cobrar {formatoMoneda(aPagar)} y emitir {documento === 'POS' ? 'tiquete POS' : 'factura'}
        </Boton>
        {documento === 'FE' && !datosFe && (
          <p className="-mt-3 text-center text-[11px] text-muted">
            Completa identificación, nombre y correo del cliente.
          </p>
        )}
      </div>
    </Modal>
  );
}

function Fila({ concepto, valor, fuerte = false }: { concepto: string; valor: number; fuerte?: boolean }) {
  return (
    <div className={['flex justify-between py-0.5', fuerte ? 'font-medium text-ink' : 'text-ink/75'].join(' ')}>
      <span>{concepto}</span>
      <span className="font-mono tabular">{formatoMoneda(valor)}</span>
    </div>
  );
}

function OpcionDocumento({
  activo,
  onClick,
  icono,
  titulo,
  detalle,
}: {
  activo: boolean;
  onClick: () => void;
  icono: ReactNode;
  titulo: string;
  detalle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={[
        'rounded-lg border p-3 text-left transition-colors',
        activo ? 'border-ink bg-ink/[0.03] ring-1 ring-ink' : 'border-line hover:border-ink/50',
      ].join(' ')}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-ink">
        {icono}
        {titulo}
      </span>
      <span className="mt-1 block text-[11px] leading-relaxed text-muted">{detalle}</span>
    </button>
  );
}
