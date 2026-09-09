import { useState } from 'react';
import {
  Bike,
  BookOpenText,
  LayoutDashboard,
  Library,
  RotateCcw,
  ShoppingBag,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import { Sidebar, type ItemNav } from './components/Sidebar';
import { TiendaProvider, useTienda } from './store/tienda';
import { calcularIndicadores, formatoMoneda } from './lib/contabilidad';
import { PuntoDeVenta } from './views/PuntoDeVenta';
import { Ventas } from './views/Ventas';
import { Domicilios } from './views/Domicilios';
import { ComprasGastos } from './views/ComprasGastos';
import { Empleados } from './views/Empleados';
import { LibroDiario } from './views/LibroDiario';
import { LibroMayor } from './views/LibroMayor';
import { Dashboard } from './views/Dashboard';

type Vista =
  | 'venta'
  | 'ventas'
  | 'domicilios'
  | 'compras'
  | 'empleados'
  | 'diario'
  | 'mayor'
  | 'dashboard';

const NAV: Array<ItemNav & { id: Vista; titulo: string }> = [
  { id: 'venta', label: 'Punto de venta', titulo: 'Punto de venta', icon: Store },
  { id: 'ventas', label: 'Ventas', titulo: 'Historial de ventas', icon: ShoppingBag },
  { id: 'domicilios', label: 'Domicilios', titulo: 'Domicilios', icon: Bike },
  { id: 'compras', label: 'Compras y gastos', titulo: 'Compras y gastos', icon: Truck },
  { id: 'empleados', label: 'Empleados', titulo: 'Empleados y nómina', icon: Users },
  { id: 'diario', label: 'Libro diario', titulo: 'Libro diario', icon: BookOpenText },
  { id: 'mayor', label: 'Libro mayor', titulo: 'Libro mayor y balance de comprobación', icon: Library },
  { id: 'dashboard', label: 'Dashboard', titulo: 'Dashboard financiero', icon: LayoutDashboard },
];

const fechaLarga = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });

function Aplicacion() {
  const { estado, dispatch } = useTienda();
  const [vista, setVista] = useState<Vista>('venta');

  const vistaActiva = NAV.find((item) => item.id === vista)!;
  const { efectivoDisponible } = calcularIndicadores(estado);

  const reiniciar = () => {
    if (window.confirm('¿Restablecer la demostración a los datos iniciales?')) {
      dispatch({ tipo: 'REINICIAR' });
      setVista('venta');
    }
  };

  return (
    <div className="mx-auto flex min-h-full max-w-[1240px] flex-col md:h-screen md:flex-row">
      <Sidebar items={NAV} activo={vista} onSelect={(id) => setVista(id as Vista)} />

      <main className="flex min-w-0 flex-1 flex-col md:overflow-y-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-8">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">
            {vistaActiva.titulo}
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{fechaLarga.format(new Date())}</span>
            <span className="flex items-center gap-2 rounded-md border border-line px-3 py-1.5">
              <span className="text-muted">Efectivo</span>
              <span className="font-mono font-semibold tabular text-ink">
                {formatoMoneda(efectivoDisponible)}
              </span>
            </span>
            <button
              type="button"
              onClick={reiniciar}
              className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-ink hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reiniciar demo
            </button>
          </div>
        </header>

        <div className="flex-1 px-5 py-6 md:px-8">
          {vista === 'venta' && <PuntoDeVenta />}
          {vista === 'ventas' && <Ventas />}
          {vista === 'domicilios' && <Domicilios />}
          {vista === 'compras' && <ComprasGastos />}
          {vista === 'empleados' && <Empleados />}
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
