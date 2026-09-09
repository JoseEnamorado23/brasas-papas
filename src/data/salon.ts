import type { EstadoMesa, Mesa, ZonaSalon } from '../types';

/** Zonas del local en el orden en que se muestran en los tableros. */
export const ZONAS_SALON: ZonaSalon[] = ['Salón', 'Terraza', 'Barra', 'Privado'];

/** Dimensiones del recinto en metros; las usa el modelo 3D para piso y muros. */
export const LOCAL = { ancho: 14, fondo: 11, altoMuro: 1.3 };

/**
 * Distribución inicial del salón. `x`/`z` son el centro de cada mesa en metros,
 * con el origen al centro del local (x crece a la derecha, z hacia la fachada).
 */
export const mesasIniciales: Mesa[] = [
  // Salón principal: dos hileras.
  m('M-01', 'Mesa 1', 'Salón', 4, 'cuadrada', -4.6, -2.6, 1.0, 1.0),
  m('M-02', 'Mesa 2', 'Salón', 4, 'cuadrada', -1.6, -2.6, 1.0, 1.0),
  m('M-03', 'Mesa 3', 'Salón', 4, 'cuadrada', 1.4, -2.6, 1.0, 1.0),
  m('M-04', 'Mesa 4', 'Salón', 2, 'redonda', 4.3, -2.6, 0.85, 0.85),
  m('M-05', 'Mesa 5', 'Salón', 4, 'cuadrada', -4.6, 0.4, 1.0, 1.0),
  m('M-06', 'Mesa 6', 'Salón', 6, 'rectangular', -1.4, 0.4, 1.9, 1.0),
  m('M-07', 'Mesa 7', 'Salón', 4, 'cuadrada', 1.6, 0.4, 1.0, 1.0),
  m('M-08', 'Mesa 8', 'Salón', 2, 'redonda', 4.3, 0.4, 0.85, 0.85),

  // Terraza: hilera contra la fachada.
  m('M-09', 'Terraza 1', 'Terraza', 2, 'redonda', -4.4, 3.9, 0.85, 0.85),
  m('M-10', 'Terraza 2', 'Terraza', 2, 'redonda', -1.9, 3.9, 0.85, 0.85),
  m('M-11', 'Terraza 3', 'Terraza', 4, 'cuadrada', 1.1, 3.9, 1.0, 1.0),
  m('M-12', 'Terraza 4', 'Terraza', 4, 'cuadrada', 4.1, 3.9, 1.0, 1.0),

  // Barra: mesas altas contra el fondo.
  m('M-13', 'Barra 1', 'Barra', 2, 'cuadrada', -5.4, -4.4, 0.7, 0.7),
  m('M-14', 'Barra 2', 'Barra', 2, 'cuadrada', -3.9, -4.4, 0.7, 0.7),

  // Privado: mesa grande en la esquina.
  m('M-15', 'Privado', 'Privado', 8, 'rectangular', 4.7, -4.2, 2.3, 1.1),
];

function m(
  id: string,
  nombre: string,
  zona: ZonaSalon,
  capacidad: number,
  forma: Mesa['forma'],
  x: number,
  z: number,
  ancho: number,
  fondo: number,
): Mesa {
  return { id, nombre, zona, capacidad, forma, x, z, ancho, fondo, necesitaLimpieza: false };
}

/** Color por estado, compartido por el modelo 3D y las etiquetas de las vistas. */
export const COLOR_ESTADO_MESA: Record<EstadoMesa, string> = {
  Libre: '#1F6B4A', // balance
  Ocupada: '#E5471B', // ember
  Reservada: '#C98A1B', // ámbar
  'Por limpiar': '#7A736A', // muted
};

/** Clases de Tailwind para pintar chips y bordes con el mismo criterio. */
export const CLASE_ESTADO_MESA: Record<EstadoMesa, string> = {
  Libre: 'bg-balance/10 text-balance',
  Ocupada: 'bg-ember/10 text-ember',
  Reservada: 'bg-[#C98A1B]/12 text-[#9a6a12]',
  'Por limpiar': 'bg-paper text-muted',
};
