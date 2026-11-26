import type { CategoriaProducto, EstacionCocina, Producto } from '../types';

type Base = Omit<Producto, 'categoria' | 'estacion' | 'tiempoPrep'>;

/** Arma los productos de una categoría con su estación y tiempo estándar de preparación. */
const grupo = (
  categoria: CategoriaProducto,
  estacion: EstacionCocina,
  tiempoPrep: number,
  items: Base[],
): Producto[] => items.map((p) => ({ ...p, categoria, estacion, tiempoPrep }));

/**
 * Carta de comida rápida costeña. `precio` es la base sin impuesto; `costo`
 * alimenta el costo de ventas. La estación y el tiempo de preparación los usa
 * la pantalla de cocina para enrutar cada plato y pintar el semáforo.
 */
export const catalogoProductos: Producto[] = [
  ...grupo('Pizzas', 'Horno', 14, [
    { id: 'pz-personal', nombre: 'Pizza personal', precio: 15000, costo: 5500, emoji: '🍕', descripcion: 'Sabor a elección: hawaiana, pollo o carnes.' },
    { id: 'pz-hawaiana', nombre: 'Pizza hawaiana mediana', precio: 32000, costo: 12000, emoji: '🍕', descripcion: 'Jamón, piña y queso mozzarella. 8 porciones.' },
    { id: 'pz-pollo', nombre: 'Pizza pollo y champiñones mediana', precio: 34000, costo: 13000, emoji: '🍕' },
    { id: 'pz-mexicana', nombre: 'Pizza mexicana mediana', precio: 35000, costo: 13500, emoji: '🌶️', descripcion: 'Carne molida, jalapeños, maíz y frijol.' },
    { id: 'pz-costena', nombre: 'Pizza costeña familiar', precio: 48000, costo: 18500, emoji: '🍕', descripcion: 'Butifarra, maíz tierno, maduro y queso costeño. 12 porciones.' },
  ]),
  ...grupo('Hamburguesas', 'Cocina', 10, [
    { id: 'ham-clasica', nombre: 'Hamburguesa clásica', precio: 16000, costo: 6200, emoji: '🍔', descripcion: 'Carne de res, queso, lechuga, tomate y papitas ripio.' },
    { id: 'ham-costena', nombre: 'Hamburguesa costeña', precio: 20000, costo: 8000, emoji: '🍔', descripcion: 'Queso costeño asado, maduro y suero.' },
    { id: 'ham-doble', nombre: 'Hamburguesa doble carne', precio: 24000, costo: 9800, emoji: '🍔', descripcion: 'Doble carne, doble queso y tocineta.' },
  ]),
  ...grupo('Perros', 'Cocina', 7, [
    { id: 'perro-sencillo', nombre: 'Perro sencillo', precio: 9000, costo: 3200, emoji: '🌭' },
    { id: 'perro-suizo', nombre: 'Perro suizo gratinado', precio: 14000, costo: 5200, emoji: '🌭' },
    { id: 'perro-ranchero', nombre: 'Perro ranchero', precio: 16000, costo: 6000, emoji: '🌭', descripcion: 'Tocineta, huevos de codorniz y papitas ripio.' },
  ]),
  ...grupo('Salchipapas y picadas', 'Cocina', 12, [
    { id: 'salchipapa', nombre: 'Salchipapa sencilla', precio: 12000, costo: 4200, emoji: '🍟' },
    { id: 'salchipapa-esp', nombre: 'Salchipapa especial', precio: 22000, costo: 8500, emoji: '🍟', descripcion: 'Pollo, chorizo, maíz y queso gratinado.' },
    { id: 'picada-2', nombre: 'Picada para 2', precio: 42000, costo: 17000, emoji: '🥩', descripcion: 'Carne, cerdo, chorizo, butifarra, maduro y bollo limpio.' },
    { id: 'picada-4', nombre: 'Picada familiar (4)', precio: 75000, costo: 30000, emoji: '🥩' },
  ]),
  ...grupo('Fritos', 'Cocina', 6, [
    { id: 'patacon-todo', nombre: 'Patacón con todo', precio: 18000, costo: 6800, emoji: '🫓', descripcion: 'Pollo desmechado, carne, queso y salsas.' },
    { id: 'mazorcada', nombre: 'Mazorcada', precio: 22000, costo: 8200, emoji: '🌽' },
    { id: 'arepa-huevo', nombre: 'Arepa de huevo', precio: 6000, costo: 2000, emoji: '🥚' },
    { id: 'papas', nombre: 'Porción de papas a la francesa', precio: 7000, costo: 2400, emoji: '🍟' },
  ]),
  ...grupo('Bebidas', 'Barra', 3, [
    { id: 'jugo-agua', nombre: 'Jugo natural en agua', precio: 6000, costo: 1800, emoji: '🧃', descripcion: 'Corozo, maracuyá, mango o lulo.' },
    { id: 'jugo-leche', nombre: 'Jugo natural en leche', precio: 7500, costo: 2500, emoji: '🥤' },
    { id: 'limonada-coco', nombre: 'Limonada de coco', precio: 9000, costo: 3000, emoji: '🥥' },
    { id: 'gaseosa', nombre: 'Gaseosa personal', precio: 4500, costo: 1600, emoji: '🥤' },
    { id: 'gaseosa-15', nombre: 'Gaseosa 1.5 L', precio: 8000, costo: 3200, emoji: '🍾' },
    { id: 'agua', nombre: 'Agua', precio: 3500, costo: 1100, emoji: '💧' },
  ]),
  ...grupo('Postres', 'Barra', 2, [
    { id: 'enyucado', nombre: 'Enyucado', precio: 5000, costo: 1800, emoji: '🍰' },
    { id: 'brownie', nombre: 'Brownie con helado', precio: 10000, costo: 3400, emoji: '🍫' },
  ]),
  // Combos prearmados: la cocina recibe sus componentes, cada uno en su estación.
  ...grupo('Combos', 'Cocina', 12, [
    {
      id: 'combo-perro',
      nombre: 'Combo perro suizo',
      precio: 22000,
      costo: 9200,
      emoji: '🌭',
      componentes: [
        { productoId: 'perro-suizo', cantidad: 1 },
        { productoId: 'papas', cantidad: 1 },
        { productoId: 'gaseosa', cantidad: 1 },
      ],
    },
    {
      id: 'combo-costeno',
      nombre: 'Combo costeño',
      precio: 28000,
      costo: 12200,
      emoji: '🍔',
      componentes: [
        { productoId: 'ham-costena', cantidad: 1 },
        { productoId: 'papas', cantidad: 1 },
        { productoId: 'jugo-agua', cantidad: 1 },
      ],
    },
    {
      id: 'combo-pareja',
      nombre: 'Combo pareja',
      precio: 34000,
      costo: 13800,
      emoji: '👥',
      componentes: [
        { productoId: 'perro-sencillo', cantidad: 2 },
        { productoId: 'salchipapa', cantidad: 1 },
        { productoId: 'gaseosa', cantidad: 2 },
      ],
    },
    {
      id: 'combo-familiar',
      nombre: 'Combo familiar',
      precio: 68000,
      costo: 30200,
      emoji: '👨‍👩‍👧‍👦',
      componentes: [
        { productoId: 'pz-costena', cantidad: 1 },
        { productoId: 'salchipapa-esp', cantidad: 1 },
        { productoId: 'gaseosa-15', cantidad: 1 },
      ],
    },
  ]),
];

/** Notas rápidas que el mesero puede pegar a un plato con un toque. */
export const NOTAS_RAPIDAS = [
  'Sin cebolla',
  'Sin salsas',
  'Salsas aparte',
  'Bien asada',
  'Sin hielo',
  'Para llevar',
  'Mitad y mitad',
];

/** Orden de presentación en la carta: los combos primero. */
export const CATEGORIAS_PRODUCTO: CategoriaProducto[] = [
  'Combos',
  'Pizzas',
  'Hamburguesas',
  'Perros',
  'Salchipapas y picadas',
  'Fritos',
  'Bebidas',
  'Postres',
];

export const ESTACIONES: EstacionCocina[] = ['Horno', 'Cocina', 'Barra'];

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
