import type { CategoriaProducto, Producto } from '../types';

/**
 * Carta del restaurante. `precio` es la base sin impuesto; `costo` alimenta el
 * costo de ventas. Los combos declaran sus `componentes` para mostrar el detalle
 * y el ahorro frente a comprar cada producto por separado.
 */
export const catalogoProductos: Producto[] = [
  // Hamburguesas
  { id: 'ham-clasica', nombre: 'Hamburguesa clásica', categoria: 'Hamburguesas', precio: 16000, costo: 6200, emoji: '🍔', descripcion: 'Carne de res, queso, lechuga y tomate.' },
  { id: 'ham-doble', nombre: 'Hamburguesa doble carne', categoria: 'Hamburguesas', precio: 23000, costo: 9800, emoji: '🍔', descripcion: 'Doble carne, doble queso y tocineta.' },
  { id: 'ham-pollo', nombre: 'Hamburguesa de pollo crispy', categoria: 'Hamburguesas', precio: 18000, costo: 7100, emoji: '🍗', descripcion: 'Pechuga apanada crocante y salsa de la casa.' },
  { id: 'ham-veggie', nombre: 'Hamburguesa veggie', categoria: 'Hamburguesas', precio: 17000, costo: 6800, emoji: '🥬', descripcion: 'Torta de garbanzo y vegetales asados.' },

  // Acompañamientos
  { id: 'papas-clasicas', nombre: 'Papas a la francesa', categoria: 'Acompañamientos', precio: 8000, costo: 2600, emoji: '🍟' },
  { id: 'papas-gajo', nombre: 'Papas en gajos', categoria: 'Acompañamientos', precio: 9500, costo: 3100, emoji: '🥔' },
  { id: 'aros-cebolla', nombre: 'Aros de cebolla', categoria: 'Acompañamientos', precio: 9000, costo: 3000, emoji: '🧅' },
  { id: 'alitas', nombre: 'Alitas BBQ x6', categoria: 'Acompañamientos', precio: 22000, costo: 8200, emoji: '🍗' },
  { id: 'dedos-queso', nombre: 'Dedos de queso', categoria: 'Acompañamientos', precio: 12000, costo: 4200, emoji: '🧀' },

  // Bebidas
  { id: 'gaseosa', nombre: 'Gaseosa personal', categoria: 'Bebidas', precio: 5000, costo: 1700, emoji: '🥤' },
  { id: 'limonada', nombre: 'Limonada natural', categoria: 'Bebidas', precio: 6500, costo: 2100, emoji: '🍋' },
  { id: 'malteada', nombre: 'Malteada', categoria: 'Bebidas', precio: 11000, costo: 3900, emoji: '🥛' },
  { id: 'agua', nombre: 'Agua', categoria: 'Bebidas', precio: 4000, costo: 1200, emoji: '💧' },
  { id: 'cafe', nombre: 'Café', categoria: 'Bebidas', precio: 4500, costo: 1300, emoji: '☕' },

  // Postres
  { id: 'brownie', nombre: 'Brownie con helado', categoria: 'Postres', precio: 10000, costo: 3400, emoji: '🍫' },
  { id: 'helado', nombre: 'Helado de vainilla', categoria: 'Postres', precio: 7000, costo: 2200, emoji: '🍦' },

  // Combos prearmados
  {
    id: 'combo-clasico',
    nombre: 'Combo clásico',
    categoria: 'Combos',
    precio: 26000,
    costo: 10500,
    emoji: '🍔',
    componentes: [
      { productoId: 'ham-clasica', cantidad: 1 },
      { productoId: 'papas-clasicas', cantidad: 1 },
      { productoId: 'gaseosa', cantidad: 1 },
    ],
  },
  {
    id: 'combo-doble',
    nombre: 'Combo doble',
    categoria: 'Combos',
    precio: 35000,
    costo: 15000,
    emoji: '🍔',
    componentes: [
      { productoId: 'ham-doble', cantidad: 1 },
      { productoId: 'papas-gajo', cantidad: 1 },
      { productoId: 'limonada', cantidad: 1 },
    ],
  },
  {
    id: 'combo-pollo',
    nombre: 'Combo de pollo',
    categoria: 'Combos',
    precio: 28000,
    costo: 11800,
    emoji: '🍗',
    componentes: [
      { productoId: 'ham-pollo', cantidad: 1 },
      { productoId: 'aros-cebolla', cantidad: 1 },
      { productoId: 'gaseosa', cantidad: 1 },
    ],
  },
  {
    id: 'combo-duo',
    nombre: 'Combo dúo',
    categoria: 'Combos',
    precio: 50000,
    costo: 21000,
    emoji: '👥',
    componentes: [
      { productoId: 'ham-clasica', cantidad: 2 },
      { productoId: 'papas-clasicas', cantidad: 2 },
      { productoId: 'gaseosa', cantidad: 2 },
    ],
  },
  {
    id: 'combo-familiar',
    nombre: 'Combo familiar',
    categoria: 'Combos',
    precio: 72000,
    costo: 28900,
    emoji: '👨‍👩‍👧‍👦',
    componentes: [
      { productoId: 'ham-clasica', cantidad: 3 },
      { productoId: 'papas-clasicas', cantidad: 2 },
      { productoId: 'gaseosa', cantidad: 3 },
    ],
  },
];

/** Orden de presentación en el punto de venta: los combos primero. */
export const CATEGORIAS_PRODUCTO: CategoriaProducto[] = [
  'Combos',
  'Hamburguesas',
  'Acompañamientos',
  'Bebidas',
  'Postres',
];

const indiceProducto = new Map(catalogoProductos.map((p) => [p.id, p]));

/** Texto "1 Hamburguesa + papas + gaseosa" y precio sin combo, para un combo. */
export function detalleCombo(producto: Producto): {
  incluye: string;
  precioSuelto: number;
  ahorro: number;
} | null {
  if (!producto.componentes) return null;
  const partes: string[] = [];
  let precioSuelto = 0;
  for (const c of producto.componentes) {
    const item = indiceProducto.get(c.productoId);
    if (!item) continue;
    partes.push(c.cantidad > 1 ? `${c.cantidad} ${item.nombre}` : item.nombre);
    precioSuelto += item.precio * c.cantidad;
  }
  return { incluye: partes.join(' + '), precioSuelto, ahorro: precioSuelto - producto.precio };
}
