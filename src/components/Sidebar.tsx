import type { LucideIcon } from 'lucide-react';
import { Flame } from 'lucide-react';

export interface ItemNav {
  id: string;
  label: string;
  icon: LucideIcon;
}

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
    <aside className="flex shrink-0 flex-col border-b border-line bg-surface md:h-full md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-paper">
          <Flame className="h-4 w-4" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold tracking-tight text-ink">Brasa &amp; Papas</p>
          <p className="text-[11px] text-muted">Gestión y contabilidad</p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-4 md:pt-2">
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
                'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors md:shrink',
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
    </aside>
  );
}
