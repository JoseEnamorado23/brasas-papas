import { createContext, useContext } from 'react';

export type Vista =
  | 'mesas'
  | 'pedidos'
  | 'cocina'
  | 'venta'
  | 'domicilios'
  | 'reservas'
  | 'facturas'
  | 'ventas'
  | 'carta'
  | 'dashboard'
  | 'compras'
  | 'empleados'
  | 'diario'
  | 'mayor';

export interface Navegacion {
  vista: Vista;
  /** Mesa preseleccionada al saltar a la toma de pedidos desde el salón. */
  mesaId: string | null;
  ir: (vista: Vista, opciones?: { mesaId?: string }) => void;
}

export const NavegacionContext = createContext<Navegacion>({
  vista: 'mesas',
  mesaId: null,
  ir: () => {},
});

export const useNavegacion = () => useContext(NavegacionContext);
