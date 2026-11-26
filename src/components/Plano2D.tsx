import { CheckCircle2 } from 'lucide-react';
import type { MesaVista } from '../lib/salon';
import { minutosTranscurridos } from '../lib/salon';
import { COLOR_ESTADO_MESA, LOCAL } from '../data/salon';
import { formatoMoneda } from '../lib/formato';

/** Las mesas se dibujan algo más grandes que su tamaño real para que se puedan tocar. */
const ESCALA_MESA = 1.5;

/**
 * Plano del salón visto desde arriba. Usa las mismas coordenadas (en metros)
 * que el modelo 3D: el origen está al centro del local y la fachada abajo.
 */
export function Plano2D({
  mesas,
  seleccionada,
  onSelect,
  listasPorSesion,
}: {
  mesas: MesaVista[];
  seleccionada: string | null;
  onSelect: (mesaId: string) => void;
  /** Comandas listas en el pase por sesión: marcan la mesa con "Listo". */
  listasPorSesion: Map<string, number>;
}) {
  const pctX = (x: number) => ((x + LOCAL.ancho / 2) / LOCAL.ancho) * 100;
  const pctZ = (z: number) => ((z + LOCAL.fondo / 2) / LOCAL.fondo) * 100;

  return (
    <div className="p-3 sm:p-4">
      <div
        className="relative w-full overflow-hidden rounded-md border-2 border-ink/70 bg-[#F3EFE8]"
        style={{ aspectRatio: `${LOCAL.ancho} / ${LOCAL.fondo}` }}
      >
        {/* Terraza: franja contra la fachada */}
        <div
          className="absolute inset-x-0 bottom-0 border-t border-dashed border-ink/25 bg-[#E3EDE3]"
          style={{ top: `${pctZ(2.9)}%` }}
        />
        <span className="absolute bottom-1.5 left-2 text-[10px] font-medium uppercase tracking-wide text-ink/40">
          Fachada · Terraza
        </span>
        <span className="absolute left-2 top-1.5 text-[10px] font-medium uppercase tracking-wide text-ink/40">
          Barra
        </span>
        <span className="absolute right-2 top-1.5 text-[10px] font-medium uppercase tracking-wide text-ink/40">
          Privado
        </span>

        {mesas.map(({ mesa, estado, sesion, reserva }) => {
          const ancho = (mesa.ancho * ESCALA_MESA) / LOCAL.ancho;
          const fondo = (mesa.fondo * ESCALA_MESA) / LOCAL.fondo;
          const listas = sesion ? listasPorSesion.get(sesion.id) ?? 0 : 0;
          const activa = seleccionada === mesa.id;
          return (
            <button
              key={mesa.id}
              type="button"
              onClick={() => onSelect(mesa.id)}
              aria-pressed={activa}
              aria-label={`${mesa.nombre}, ${estado}`}
              className={[
                'absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center overflow-visible px-0.5 text-center text-white shadow-sm transition-transform hover:scale-105',
                mesa.forma === 'redonda' ? 'rounded-full' : 'rounded-md',
                activa ? 'z-10 ring-4 ring-ink ring-offset-2 ring-offset-[#F3EFE8]' : '',
              ].join(' ')}
              style={{
                left: `${pctX(mesa.x)}%`,
                top: `${pctZ(mesa.z)}%`,
                width: `${ancho * 100}%`,
                height: `${fondo * 100}%`,
                backgroundColor: COLOR_ESTADO_MESA[estado],
              }}
            >
              <span className="whitespace-nowrap text-[10px] font-semibold leading-tight sm:text-xs">{mesa.nombre}</span>
              <span className="hidden text-[9px] leading-tight opacity-90 sm:block">
                {sesion
                  ? `${minutosTranscurridos(sesion.aperturaTs)}′ · ${formatoMoneda(sesion.total)}`
                  : reserva
                    ? reserva.hora
                    : `${mesa.capacidad} p`}
              </span>
              {listas > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-balance shadow">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
