import { useEffect, useState } from 'react';
import {
  Armchair,
  Bike,
  BookOpenText,
  CalendarClock,
  LayoutDashboard,
  Library,
  Menu,
  PartyPopper,
  RotateCcw,
  ShoppingBag,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import { MenuMovil, Sidebar, type ItemNav } from './components/Sidebar';
import { TiendaProvider, useTienda } from './store/tienda';
import { calcularIndicadores, formatoMoneda } from './lib/contabilidad';
import { filtrarPorSede } from './lib/sedes';
import { PuntoDeVenta } from './views/PuntoDeVenta';
import { Ventas } from './views/Ventas';
import { Reservas } from './views/Reservas';
import { Mesas } from './views/Mesas';
import { Domicilios } from './views/Domicilios';
import { ComprasGastos } from './views/ComprasGastos';
import { Empleados } from './views/Empleados';
import { LibroDiario } from './views/LibroDiario';
import { LibroMayor } from './views/LibroMayor';
import { Dashboard } from './views/Dashboard';
import { Eventos } from './views/Eventos';

type Vista =
  | 'venta'
  | 'ventas'
  | 'reservas'
  | 'mesas'
  | 'domicilios'
  | 'compras'
  | 'empleados'
  | 'eventos'
  | 'diario'
  | 'mayor'
  | 'dashboard';

const NAV: Array<ItemNav & { id: Vista; titulo: string }> = [
  { id: 'venta', label: 'Punto de venta', titulo: 'Punto de venta', icon: Store },
  { id: 'ventas', label: 'Ventas', titulo: 'Historial de ventas', icon: ShoppingBag },
  { id: 'reservas', label: 'Reservas', titulo: 'Reservas', icon: CalendarClock },
  { id: 'mesas', label: 'Ocupación de mesas', titulo: 'Ocupación de mesas y salón 3D', icon: Armchair },
  { id: 'domicilios', label: 'Domicilios', titulo: 'Domicilios', icon: Bike },
  { id: 'compras', label: 'Compras y gastos', titulo: 'Compras y gastos', icon: Truck },
  { id: 'empleados', label: 'Empleados', titulo: 'Empleados y nómina', icon: Users },
  { id: 'eventos', label: 'Eventos y catering', titulo: 'Eventos y catering', icon: PartyPopper },
  { id: 'diario', label: 'Libro diario', titulo: 'Libro diario', icon: BookOpenText },
  { id: 'mayor', label: 'Libro mayor', titulo: 'Libro mayor y balance de comprobación', icon: Library },
  { id: 'dashboard', label: 'Dashboard', titulo: 'Dashboard financiero', icon: LayoutDashboard },
];

const fechaLarga = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });

function Aplicacion() {
  const { estado, dispatch, sedeActual, setSedeActual } = useTienda();
  const [vista, setVista] = useState<Vista>('venta');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const vistaActiva = NAV.find((item) => item.id === vista)!;
  const { efectivoDisponible } = calcularIndicadores(filtrarPorSede(estado, sedeActual));

  // Con el menú móvil abierto: bloquea el scroll de fondo, cierra al pasar a
  // escritorio y responde a la tecla Escape.
  useEffect(() => {
    if (!menuAbierto) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const mq = window.matchMedia('(min-width: 768px)');
    const cerrar = () => setMenuAbierto(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    mq.addEventListener('change', cerrar);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflowPrevio;
      mq.removeEventListener('change', cerrar);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuAbierto]);

  const seleccionar = (id: string) => {
    setVista(id as Vista);
    setMenuAbierto(false);
  };

  const reiniciar = () => {
    if (window.confirm('¿Restablecer la demostración a los datos iniciales?')) {
      dispatch({ tipo: 'REINICIAR' });
      setVista('venta');
      setMenuAbierto(false);
    }
  };

  const chipEfectivo = (
    <span className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">
      <span className="text-muted">Efectivo</span>
      <span className="font-mono font-semibold tabular text-ink">
        {formatoMoneda(efectivoDisponible)}
      </span>
    </span>
  );

  const botonReiniciar = (
    <button
      type="button"
      onClick={reiniciar}
      className="flex items-center justify-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-ink hover:text-ink"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Reiniciar demo
    </button>
  );

  return (
    <div className="mx-auto flex min-h-full max-w-[1240px] flex-col md:h-screen md:flex-row">
      <Sidebar
        items={NAV}
        activo={vista}
        onSelect={seleccionar}
        sedes={estado.sedes}
        sedeActual={sedeActual}
        onCambiarSede={setSedeActual}
      />

      <MenuMovil
        items={NAV}
        activo={vista}
        onSelect={seleccionar}
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        sedes={estado.sedes}
        sedeActual={sedeActual}
        onCambiarSede={setSedeActual}
        pie={
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
              <span className="text-muted">Efectivo disponible</span>
              <span className="font-mono font-semibold tabular text-ink">
                {formatoMoneda(efectivoDisponible)}
              </span>
            </div>
            <div className="[&>button]:w-full">{botonReiniciar}</div>
          </div>
        }
      />

      <main className="flex min-w-0 flex-1 flex-col md:overflow-y-auto">
        {/* Barra superior móvil */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="-ml-1 rounded-md p-1 text-ink hover:bg-paper"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="min-w-0 flex-1 truncate font-display text-base font-bold tracking-tight text-ink">
            {vistaActiva.titulo}
          </span>
          {chipEfectivo}
        </div>

        {/* Cabecera de escritorio */}
        <header className="hidden flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:flex md:px-8">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">
            {vistaActiva.titulo}
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted lg:inline">{fechaLarga.format(new Date())}</span>
            {chipEfectivo}
            {botonReiniciar}
          </div>
        </header>

        <div className="flex-1 px-4 py-5 md:px-8 md:py-6">
          {vista === 'venta' && <PuntoDeVenta />}
          {vista === 'ventas' && <Ventas />}
          {vista === 'reservas' && <Reservas />}
          {vista === 'mesas' && <Mesas />}
          {vista === 'domicilios' && <Domicilios />}
          {vista === 'compras' && <ComprasGastos />}
          {vista === 'empleados' && <Empleados />}
          {vista === 'eventos' && <Eventos />}
          {vista === 'diario' && <LibroDiario />}
          {vista === 'mayor' && <LibroMayor />}
          {vista === 'dashboard' && <Dashboard />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <TiendaProvider>
      <Aplicacion />
    </TiendaProvider>
  );
}
