import { useEffect, useRef, useState } from 'react';
import { Mail, Printer } from 'lucide-react';
import type { Factura } from '../types';
import { useTienda } from '../store/tienda';
import { DocumentoFactura } from './DocumentoFactura';
import { Modal } from './Modal';
import { Boton } from './ui';

export function VisorFactura({ factura, onCerrar }: { factura: Factura; onCerrar: () => void }) {
  const destino =
    factura.tipo === 'FE'
      ? `Se enviaría al correo ${factura.cliente.correo ?? 'del cliente'} con el XML y el PDF.`
      : 'El tiquete se imprime o se envía por WhatsApp al cliente que lo pida.';
  return (
    <Modal
      titulo={factura.tipo === 'POS' ? 'Tiquete POS electrónico' : 'Factura electrónica'}
      descripcion={`${factura.id} · venta ${factura.ventaId}`}
      onCerrar={onCerrar}
      ancho={factura.tipo === 'POS' ? 'max-w-md' : 'max-w-3xl'}
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-paper p-3 sm:p-5">
          <DocumentoFactura factura={factura} />
        </div>
        <div className="no-imprimir flex flex-col gap-2 sm:flex-row">
          <Boton type="button" onClick={() => window.print()} className="flex-1">
            <Printer className="h-4 w-4" />
            Imprimir
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar} className="flex-1">
            Listo
          </Boton>
        </div>
        <p className="no-imprimir flex items-start gap-2 text-xs text-muted">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {destino}
        </p>
      </div>
    </Modal>
  );
}

/**
 * Muestra cada documento que se emite mientras se usa la demo (cobro de mesa,
 * venta de mostrador o domicilio entregado). Vive en la raíz de la app porque
 * la pantalla que cobró puede desmontarse (la mesa pasa a "por limpiar").
 */
export function AvisoFacturaNueva() {
  const { estado } = useTienda();
  const vistas = useRef(estado.facturas.length);
  const [factura, setFactura] = useState<Factura | null>(null);

  useEffect(() => {
    if (estado.facturas.length > vistas.current) {
      setFactura(estado.facturas[estado.facturas.length - 1]);
    }
    vistas.current = estado.facturas.length;
  }, [estado.facturas]);

  return factura ? <VisorFactura factura={factura} onCerrar={() => setFactura(null)} /> : null;
}
