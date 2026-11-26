import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Factura } from '../types';
import { EMISOR, RESOLUCIONES } from '../data/facturacion';
import { urlConsultaDian } from '../lib/facturacion';
import { formatoMoneda } from '../lib/formato';

const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function useQr(texto: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    QRCode.toDataURL(texto, { margin: 0, width: 220, errorCorrectionLevel: 'M' })
      .then((url) => vigente && setSrc(url))
      .catch(() => vigente && setSrc(null));
    return () => {
      vigente = false;
    };
  }, [texto]);
  return src;
}

/**
 * Representación gráfica del documento electrónico. El tiquete POS sale en
 * formato de tirilla (80 mm); la factura electrónica en formato carta. Ambos
 * llevan el código único y el QR de consulta que exige la DIAN.
 */
export function DocumentoFactura({ factura }: { factura: Factura }) {
  const res = RESOLUCIONES[factura.tipo];
  const qr = useQr(urlConsultaDian(factura.codigoUnico));
  const esPos = factura.tipo === 'POS';

  const encabezado = (
    <div className={esPos ? 'text-center' : ''}>
      <p className="font-display text-base font-bold tracking-tight text-ink">{EMISOR.razonSocial}</p>
      <p className="text-[11px] text-ink/75">NIT {EMISOR.nit}</p>
      <p className="text-[11px] text-ink/75">{EMISOR.regimen}</p>
      <p className="text-[11px] text-ink/75">{EMISOR.direccion}</p>
      <p className="text-[11px] text-ink/75">Tel. {EMISOR.telefono}</p>
    </div>
  );

  const titulo = (
    <div className={['border-y border-dashed border-ink/30 py-2', esPos ? 'text-center' : ''].join(' ')}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink">{res.nombre}</p>
      <p className="font-mono text-base font-bold text-ink">{factura.id}</p>
      <p className="text-[11px] text-ink/70">{fechaHora.format(new Date(factura.emitidaTs))}</p>
    </div>
  );

  const adquiriente = (
    <div className="text-[12px] leading-relaxed text-ink/85">
      <p>
        <span className="text-ink/60">Cliente: </span>
        {factura.cliente.nombre}
      </p>
      <p>
        <span className="text-ink/60">{factura.cliente.tipoId}: </span>
        {factura.cliente.numero}
      </p>
      {factura.cliente.correo && (
        <p>
          <span className="text-ink/60">Correo: </span>
          {factura.cliente.correo}
        </p>
      )}
      {factura.referencia && (
        <p>
          <span className="text-ink/60">Servicio: </span>
          {factura.referencia}
          {factura.atendio ? ` · Atendió ${factura.atendio}` : ''}
        </p>
      )}
    </div>
  );

  const detalle = (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="border-b border-ink/20 text-left text-[11px] text-ink/60">
          <th className="py-1 font-medium">Cant.</th>
          <th className="py-1 font-medium">Descripción</th>
          {!esPos && <th className="py-1 text-right font-medium">V. unitario</th>}
          <th className="py-1 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {factura.lineas.map((l, i) => (
          <tr key={i} className="align-top">
            <td className="py-0.5 pr-2 font-mono tabular">{l.cantidad}</td>
            <td className="py-0.5 pr-2 text-ink">{l.nombre}</td>
            {!esPos && (
              <td className="py-0.5 text-right font-mono tabular">{formatoMoneda(l.precioUnit)}</td>
            )}
            <td className="py-0.5 text-right font-mono tabular">
              {formatoMoneda(l.precioUnit * l.cantidad)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const totales = (
    <div className="space-y-0.5 border-t border-dashed border-ink/30 pt-2 text-[12px]">
      <FilaTotal concepto="Subtotal (base gravable)" valor={factura.base} />
      <FilaTotal concepto="Impuesto nacional al consumo 8%" valor={factura.impuesto} />
      {factura.domicilio > 0 && <FilaTotal concepto="Domicilio" valor={factura.domicilio} />}
      {factura.propina > 0 && <FilaTotal concepto="Propina voluntaria" valor={factura.propina} />}
      <div className="flex justify-between border-t border-ink/30 pt-1 text-[13px] font-bold text-ink">
        <span>Total pagado</span>
        <span className="font-mono tabular">{formatoMoneda(factura.total)}</span>
      </div>
      <div className="pt-1 text-ink/75">
        {factura.pagos.length === 0 ? (
          <p>Pagado a través de la plataforma de domicilios</p>
        ) : (
          factura.pagos.map((p, i) => (
            <div key={i} className="flex justify-between">
              <span>{p.medio}</span>
              <span className="font-mono tabular">{formatoMoneda(p.monto)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const pie = (
    <div className={['space-y-2 border-t border-dashed border-ink/30 pt-3', esPos ? 'text-center' : ''].join(' ')}>
      <div className={['flex gap-3', esPos ? 'flex-col items-center' : 'items-start'].join(' ')}>
        <div className="grid h-[110px] w-[110px] shrink-0 place-items-center bg-white">
          {qr ? (
            <img src={qr} alt="Código QR de consulta en la DIAN" className="h-full w-full" />
          ) : (
            <span className="text-[10px] text-muted">QR</span>
          )}
        </div>
        <div className="min-w-0 text-[10px] leading-relaxed text-ink/70">
          <p className="font-semibold text-ink/85">{res.codigo}</p>
          <p className="break-all font-mono">{factura.codigoUnico}</p>
        </div>
      </div>
      <p className="text-[10px] leading-relaxed text-ink/70">
        Autorización de numeración DIAN No. {res.resolucion} del {res.fecha}, prefijo {res.prefijo}, del{' '}
        {res.desde} al {res.hasta}. Vigencia {res.vigencia}.
      </p>
      <p className="rounded bg-ember/10 px-2 py-1 text-[10px] font-medium text-ember">
        Documento de demostración: no fue transmitido a la DIAN.
      </p>
    </div>
  );

  return (
    <article
      className={[
        'imprimible mx-auto space-y-3 bg-white p-5 text-ink shadow-sm ring-1 ring-line',
        esPos ? 'max-w-[320px] font-mono' : 'max-w-[640px]',
      ].join(' ')}
    >
      {esPos ? (
        <>
          {encabezado}
          {titulo}
          {adquiriente}
          {detalle}
          {totales}
          {pie}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            {encabezado}
            <div className="text-right">{titulo}</div>
          </div>
          <div className="rounded-md border border-line p-3">{adquiriente}</div>
          {detalle}
          {totales}
          {pie}
        </>
      )}
    </article>
  );
}

function FilaTotal({ concepto, valor }: { concepto: string; valor: number }) {
  return (
    <div className="flex justify-between text-ink/85">
      <span>{concepto}</span>
      <span className="font-mono tabular">{formatoMoneda(valor)}</span>
    </div>
  );
}
