import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Diálogo centrado (hoja inferior en móvil). Escape o clic afuera lo cierran.
 * Se monta en `<body>` con un portal: si se renderizara dentro de un panel
 * `sticky`, quedaría atrapado en su contexto de apilamiento y otros elementos
 * (como la mesa seleccionada del plano) se le sobrepondrían.
 */
export function Modal({
  titulo,
  descripcion,
  onCerrar,
  children,
  ancho = 'max-w-lg',
}: {
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener('keydown', onKey);
    };
  }, [onCerrar]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="no-imprimir absolute inset-0 bg-ink/45" onClick={onCerrar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={[
          'relative flex max-h-[92vh] w-full flex-col rounded-t-xl bg-surface shadow-xl sm:rounded-xl',
          ancho,
        ].join(' ')}
      >
        <header className="no-imprimir flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-ink">{titulo}</h2>
            {descripcion && <p className="mt-0.5 text-xs text-muted">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-1 rounded-md p-1 text-muted hover:bg-paper hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
