import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Flame, X } from 'lucide-react';

export interface ItemNav {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Grupo del menú: Operación, Caja, Administración, Contabilidad. */
  seccion: string;
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-paper">
        <Flame className="h-4 w-4" aria-hidden />
      </span>
      <div className="leading-tight">
        <p className="font-display text-sm font-bold tracking-tight text-ink">Don Chorizo</p>
        <p className="text-[11px] text-muted">Montería · Gestión del restaurante</p>
      </div>
    </div>
  );
}

function ListaNav({
  items,
  activo,
  onSelect,
}: {
  items: ItemNav[];
  activo: string;
  onSelect: (id: string) => void;
}) {
  const secciones = [...new Set(items.map((i) => i.seccion))];
  return (
    <nav className="flex flex-col gap-4">
      {secciones.map((seccion) => (
        <div key={seccion} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/80">
            {seccion}
          </p>
          {items
            .filter((i) => i.seccion === seccion)
            .map((item) => {
              const Icon = item.icon;
              const seleccionado = item.id === activo;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={seleccionado ? 'page' : undefined}
                  className={[
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                    seleccionado
                      ? 'bg-ink text-paper'
                      : 'text-ink/70 hover:bg-paper hover:text-ink',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </div>
      ))}
    </nav>
  );
}

/** Barra lateral fija a partir de pantallas medianas. */
export function Sidebar({
  items,
  activo,
  onSelect,
}: {
  items: ItemNav[];
  activo: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="hidden shrink-0 flex-col border-r border-line bg-surface md:flex md:h-full md:w-60">
      <div className="px-5 py-4">
        <Marca />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-1">
        <ListaNav items={items} activo={activo} onSelect={onSelect} />
      </div>
    </aside>
  );
}

/** Menú lateral desplegable para móvil (se abre desde la barra superior). */
export function MenuMovil({
  items,
  activo,
  onSelect,
  abierto,
  onCerrar,
  pie,
}: {
  items: ItemNav[];
  activo: string;
  onSelect: (id: string) => void;
  abierto: boolean;
  onCerrar: () => void;
  pie?: ReactNode;
}) {
  return (
    <div
      className={['fixed inset-0 z-50 md:hidden', abierto ? '' : 'pointer-events-none'].join(' ')}
      aria-hidden={!abierto}
    >
      <div
        onClick={onCerrar}
        className={[
          'absolute inset-0 bg-ink/40 transition-opacity duration-200',
          abierto ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={[
          'absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-surface shadow-xl transition-transform duration-200',
          abierto ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Marca />
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="rounded-md p-1 text-muted hover:bg-paper hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <ListaNav items={items} activo={activo} onSelect={onSelect} />
        </div>
        {pie && <div className="border-t border-line px-3 py-3">{pie}</div>}
      </div>
    </div>
  );
}
