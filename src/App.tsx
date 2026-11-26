import { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  Bike,
  BookOpenText,
  CalendarClock,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  Library,
  Menu,
  Receipt,
  RotateCcw,
  ShoppingBag,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { MenuMovil, Sidebar, type ItemNav } from './components/Sidebar';
import { AvisoFacturaNueva } from './components/VisorFactura';
import { TiendaProvider, useTienda } from './store/tienda';
import { NavegacionContext, type Navegacion, type Vista } from './store/navegacion';
import { calcularIndicadores, formatoMoneda } from './lib/contabilidad';
import { PuntoDeVenta } from './views/PuntoDeVenta';
import { Ventas } from './views/Ventas';
import { Reservas } from './views/Reservas';
import { Mesas } from './views/Mesas';
import { TomaPedido } from './views/TomaPedido';
import { Cocina } from './views/Cocina';
import { Facturas } from './views/Facturas';
import { CartaAgotados } from './views/CartaAgotados';
import { Domicilios } from './views/Domicilios';
import { ComprasGastos } from './views/ComprasGastos';
import { Empleados } from './views/Empleados';
import { LibroDiario } from './views/LibroDiario';
import { LibroMayor } from './views/LibroMayor';
import { Dashboard } from './views/Dashboard';

const NAV: Array<ItemNav & { id: Vista; titulo: string }> = [
  {
    id: 'mesas',
    label: 'Salón y mesas',
    titulo: 'Salón y mesas',
    icon: Armchair,
    seccion: 'Operación',
  },
  {
    id: 'pedidos',
    label: 'Toma de pedidos',
    titulo: 'Toma de pedidos',
    icon: ClipboardList,
    seccion: 'Operación',
  },
  {
    id: 'cocina',
    label: 'Cocina (KDS)',
    titulo: 'Pantalla de cocina',
    icon: ChefHat,
    seccion: 'Operación',
  },
  {
    id: 'venta',
    label: 'Mostrador',
    titulo: 'Mostrador y para llevar',
    icon: Store,
    seccion: 'Operación',
  },
  { id: 'domicilios', label: 'Domicilios', titulo: 'Domicilios', icon: Bike, seccion: 'Operación' },
  {
    id: 'reservas',
    label: 'Reservas',
    titulo: 'Reservas',
    icon: CalendarClock,
    seccion: 'Operación',
  },
  {
    id: 'facturas',
    label: 'Facturación',
    titulo: 'Facturación electrónica',
    icon: Receipt,
    seccion: 'Caja',
  },
  {
    id: 'ventas',
    label: 'Ventas',
    titulo: 'Historial de ventas',
    icon: ShoppingBag,
    seccion: 'Caja',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    titulo: 'Dashboard financiero',
    icon: LayoutDashboard,
    seccion: 'Administración',
  },
  {
    id: 'carta',
    label: 'Carta y agotados',
    titulo: 'Carta y agotados',
    icon: UtensilsCrossed,
    seccion: 'Administración',
  },
  {
    id: 'compras',
    label: 'Compras y gastos',
    titulo: 'Compras y gastos',
    icon: Truck,
    seccion: 'Administración',
  },
  {
    id: 'empleados',
    label: 'Empleados',
    titulo: 'Empleados y nómina',
    icon: Users,
    seccion: 'Administración',
  },
  {
    id: 'diario',
    label: 'Libro diario',
    titulo: 'Libro diario',
    icon: BookOpenText,
    seccion: 'Contabilidad',
  },
  {
    id: 'mayor',
    label: 'Libro mayor',
    titulo: 'Libro mayor y balance de comprobación',
    icon: Library,
    seccion: 'Contabilidad',
  },
];

const fechaLarga = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });

function Aplicacion() {
  const { estado, dispatch } = useTienda();
  const [vista, setVista] = useState<Vista>('mesas');
  const [mesaId, setMesaId] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const vistaActiva = NAV.find((item) => item.id === vista)!;
  const { efectivoDisponible } = calcularIndicadores(estado);

  const navegacion = useMemo<Navegacion>(
    () => ({
      vista,
      mesaId,
      ir: (destino, opciones) => {
        setMesaId(opciones?.mesaId ?? null);
        setVista(destino);
        setMenuAbierto(false);
      },
    }),
    [vista, mesaId],
  );

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

  const seleccionar = (id: string) => navegacion.ir(id as Vista);

  const reiniciar = () => {
    if (window.confirm('¿Restablecer la demostración a los datos iniciales?')) {
      dispatch({ tipo: 'REINICIAR' });
      navegacion.ir('mesas');
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
    <NavegacionContext.Provider value={navegacion}>
      <div className="mx-auto flex min-h-full max-w-[1400px] flex-col md:h-screen md:flex-row">
        <Sidebar items={NAV} activo={vista} onSelect={seleccionar} />

        <MenuMovil
          items={NAV}
          activo={vista}
          onSelect={seleccionar}
          abierto={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
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
            {vista === 'mesas' && <Mesas />}
            {vista === 'pedidos' && <TomaPedido />}
            {vista === 'cocina' && <Cocina />}
            {vista === 'venta' && <PuntoDeVenta />}
            {vista === 'domicilios' && <Domicilios />}
            {vista === 'reservas' && <Reservas />}
            {vista === 'facturas' && <Facturas />}
            {vista === 'ventas' && <Ventas />}
            {vista === 'dashboard' && <Dashboard />}
            {vista === 'carta' && <CartaAgotados />}
            {vista === 'compras' && <ComprasGastos />}
            {vista === 'empleados' && <Empleados />}
            {vista === 'diario' && <LibroDiario />}
            {vista === 'mayor' && <LibroMayor />}
          </div>
        </main>
        <AvisoFacturaNueva />
      </div>
    </NavegacionContext.Provider>
  );
}

export default function App() {
  return (
    <TiendaProvider>
      <Aplicacion />
    </TiendaProvider>
  );
}
