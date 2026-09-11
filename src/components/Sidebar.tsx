import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, Flame, X } from 'lucide-react';
import type { Sede } from '../types';
import { TODAS_SEDES } from '../data/sedes';

export interface ItemNav {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** Selector de sede: cambia el alcance de todas las vistas del sistema. */
export function SelectorSede({
  sedes,
  sedeActual,
  onCambiar,
}: {
  sedes: Sede[];
  sedeActual: string;
  onCambiar: (sedeId: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-line bg-paper/60 px-2.5 py-2 text-xs">
      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
      <select
        value={sedeActual}
        onChange={(e) => onCambiar(e.target.value)}
        className="w-full min-w-0 flex-1 truncate bg-transparent text-xs font-medium text-ink outline-none"
        aria-label="Sede"
      >
        <option value={TODAS_SEDES}>Todas las sedes</option>
        {sedes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-paper">
        <Flame className="h-4 w-4" aria-hidden />
      </span>
      <div className="leading-tight">
        <p className="font-display text-sm font-bold tracking-tight text-ink">Brasa &amp; Papas</p>
        <p className="text-[11px] text-muted">Gestión y contabilidad</p>
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
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
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
              seleccionado ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper hover:text-ink',
            ].join(' ')}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Barra lateral fija a partir de pantallas medianas. */
export function Sidebar({
  items,
  activo,
  onSelect,
  sedes,
  sedeActual,
  onCambiarSede,
}: {
  items: ItemNav[];
  activo: string;
  onSelect: (id: string) => void;
  sedes: Sede[];
  sedeActual: string;
  onCambiarSede: (sedeId: string) => void;
}) {
  return (
    <aside className="hidden shrink-0 flex-col border-r border-line bg-surface md:flex md:h-full md:w-60">
      <div className="px-5 py-4">
        <Marca />
      </div>
      <div className="px-3 pb-3">
        <SelectorSede sedes={sedes} sedeActual={sedeActual} onCambiar={onCambiarSede} />
      </div>
      <div className="px-3 pb-4 pt-1">
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
  sedes,
  sedeActual,
  onCambiarSede,
}: {
  items: ItemNav[];
  activo: string;
  onSelect: (id: string) => void;
  abierto: boolean;
  onCerrar: () => void;
  pie?: ReactNode;
  sedes: Sede[];
  sedeActual: string;
  onCambiarSede: (sedeId: string) => void;
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
        <div className="px-3 pt-3">
          <SelectorSede sedes={sedes} sedeActual={sedeActual} onCambiar={onCambiarSede} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <ListaNav items={items} activo={activo} onSelect={onSelect} />
        </div>
        {pie && <div className="border-t border-line px-3 py-3">{pie}</div>}
      </div>
    </div>
  );
}
