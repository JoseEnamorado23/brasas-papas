import { useState } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Panel({
  titulo,
  descripcion,
  sufijo,
  children,
  sinPadding = false,
}: {
  titulo?: string;
  descripcion?: string;
  sufijo?: ReactNode;
  children: ReactNode;
  sinPadding?: boolean;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      {(titulo || sufijo) && (
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
              {titulo}
            </h2>
            {descripcion && <p className="mt-0.5 text-xs text-muted">{descripcion}</p>}
          </div>
          {sufijo}
        </header>
      )}
      <div className={sinPadding ? '' : 'px-5 py-3'}>{children}</div>
    </section>
  );
}

export function FilaEstado({
  concepto,
  valor,
  negativo = false,
  fuerte = false,
  sangria = false,
}: {
  concepto: string;
  valor: string;
  negativo?: boolean;
  fuerte?: boolean;
  sangria?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center justify-between gap-4 py-1.5 text-sm',
        sangria ? 'pl-4' : '',
        fuerte ? 'font-semibold text-ink' : 'text-ink/80',
      ].join(' ')}
    >
      <span>{concepto}</span>
      <span className={['font-mono tabular', negativo ? 'text-ember' : 'text-ink'].join(' ')}>
        {negativo ? `(${valor})` : valor}
      </span>
    </div>
  );
}

export function Regla({ fuerte = false }: { fuerte?: boolean }) {
  return <div className={['my-1 border-t', fuerte ? 'border-ink/25' : 'border-line'].join(' ')} />;
}

export function Kpi({
  etiqueta,
  valor,
  nota,
  tono = 'neutro',
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  tono?: 'neutro' | 'ingreso' | 'egreso';
}) {
  const color =
    tono === 'ingreso' ? 'text-balance' : tono === 'egreso' ? 'text-ember' : 'text-ink';
  return (
    <div className="bg-surface p-4">
      <p className="text-xs text-muted">{etiqueta}</p>
      <p className={['mt-1.5 font-mono text-lg font-semibold tabular', color].join(' ')}>{valor}</p>
      {nota && <p className="mt-1 text-[11px] text-muted">{nota}</p>}
    </div>
  );
}

const estilosBoton = {
  primario: 'bg-ink text-paper hover:bg-ink/90 disabled:bg-ink/40',
  secundario: 'border border-line bg-surface text-ink hover:border-ink disabled:opacity-50',
  peligro: 'border border-ember/40 bg-surface text-ember hover:bg-ember/5 disabled:opacity-50',
} as const;

export function Boton({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: keyof typeof estilosBoton }) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        'disabled:cursor-not-allowed',
        estilosBoton[variante],
        className,
      ].join(' ')}
    />
  );
}

export function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-muted">{etiqueta}</span>
      {children}
    </label>
  );
}

const claseControl =
  'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink';

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={[claseControl, props.className ?? ''].join(' ')} />;
}

export function Selector({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={[claseControl, props.className ?? ''].join(' ')}>
      {children}
    </select>
  );
}

export function Etiqueta({
  children,
  tono = 'neutro',
}: {
  children: ReactNode;
  tono?: 'neutro' | 'ingreso' | 'egreso' | 'info';
}) {
  const estilos = {
    neutro: 'bg-paper text-muted',
    ingreso: 'bg-balance/10 text-balance',
    egreso: 'bg-ember/10 text-ember',
    info: 'bg-ink/5 text-ink/70',
  } as const;
  return (
    <span
      className={[
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium',
        estilos[tono],
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export function EstadoVacio({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function TituloSeccion({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-sm font-medium text-ink">{children}</p>;
}

/**
 * Paginación en cliente para listas largas. Recorta `items` a la página actual y
 * se auto-ajusta si la lista se acorta (p. ej. al cambiar de filtro).
 */
export function usePaginacion<T>(items: T[], porPagina: number) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = items.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
  return {
    visibles,
    pagina: paginaActual,
    totalPaginas,
    totalItems: items.length,
    irA: (p: number) => setPagina(Math.min(Math.max(1, p), totalPaginas)),
    reiniciar: () => setPagina(1),
  };
}

export function Paginacion({
  pagina,
  totalPaginas,
  totalItems,
  onCambio,
  etiqueta = 'registros',
}: {
  pagina: number;
  totalPaginas: number;
  totalItems: number;
  onCambio: (pagina: number) => void;
  etiqueta?: string;
}) {
  if (totalPaginas <= 1) {
    return (
      <div className="px-4 py-2.5 text-xs text-muted">
        {totalItems} {etiqueta}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs text-muted">
      <span>
        {totalItems} {etiqueta} · página {pagina} de {totalPaginas}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onCambio(pagina - 1)}
          disabled={pagina <= 1}
          className="grid h-7 w-7 place-items-center rounded border border-line text-ink transition-colors hover:border-ink disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onCambio(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="grid h-7 w-7 place-items-center rounded border border-line text-ink transition-colors hover:border-ink disabled:opacity-40"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
