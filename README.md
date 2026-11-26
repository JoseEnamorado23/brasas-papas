# Don Chorizo — Gestión y contabilidad

Sistema de gestión para un restaurante de comida rápida costeña (Montería) con un **motor contable
de partida doble** que corre en segundo plano. No hay backend ni base de datos:
todo vive en el estado de React (`useReducer` + Context) y parte de un set de
datos precargado con ~2 semanas de operación para hacer una demostración.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS 3
- Recharts (gráficas)
- Three.js (modelo 3D del salón)
- Lucide React (iconos)

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve el build de producción
```

## Despliegue en Vercel

Sitio estático de Vite. Framework preset **Vite**, build `npm run build`, output
`dist`. Sin variables de entorno.

## Módulos

Un solo local en Montería (el modelo conserva `sedeId`, así que una segunda sede no exige migrar datos).

| Grupo | Vista | Qué hace |
| --- | --- | --- |
| Operación | **Salón y mesas** | Plano 2D del salón (con opción de vista 3D) y estado por mesa. Abrir walk-in, sentar reservas, ver rondas y estado de cocina, cobrar y marcar limpia. |
| Operación | **Toma de pedidos** | Pantalla del mesero pensada para celular: plano 2D de mesas, carta táctil, notas por plato ("sin cebolla", "mitad y mitad"), rondas enviadas a cocina, anulaciones con motivo, precuenta y cobro. El mismo flujo sirve para **digitar comandas de papel** en caja (quedan marcadas como "papel"). |
| Operación | **Cocina (KDS)** | Pantalla de cocina: comandas de mesa, mostrador y domicilio en una fila, filtradas por estación (horno, cocina, barra). Semáforo por tiempo estándar, toque por plato (pendiente → preparando → listo), "bump" por estación, sincronización de tiempos ("iniciar en N min"), anulados en rojo, métricas de preparación y pase con tiquete de despacho impreso (modelo híbrido). |
| Operación | **Mostrador** | Venta para llevar: se cobra y el pedido sale a cocina. |
| Operación | **Domicilios / Reservas** | Pedidos propios o por plataforma (zonas de Montería); "pasar a cocina" crea la comanda en el KDS y al entregar se emite el tiquete POS. |
| Caja | **Facturación** | Soporta los dos documentos electrónicos: **tiquete POS** (consumidor final) y **factura electrónica** (con NIT/cédula y correo). Numeración por resolución, código CUDE/CUFE y QR de consulta. **Simulado**: no se transmite a la DIAN. |
| Caja | **Ventas** | Historial con canal (mesa, mostrador, domicilio) y asiento vinculado. |
| Administración | **Dashboard, Carta y agotados, Compras y gastos, Empleados** | Indicadores y estados financieros; marcar productos agotados (dejan de poderse vender); compras, gastos y nómina. |
| Contabilidad | **Libro diario / mayor** | Asientos de partida doble y balance de comprobación. |

### Cobro

El cobro (mesa o mostrador) elige documento POS o FE, aplica la **propina voluntaria** (sugerida 10% en mesa) y admite **pago mixto** con efectivo, Nequi, Daviplata, Bre-B o tarjeta. Cada cobro genera venta, documento electrónico y asiento: efectivo a caja, los demás medios a bancos, y la propina como pasivo con los empleados (cuenta 2380), no como ingreso.

## Arquitectura del código

| Ruta | Rol |
| --- | --- |
| `src/data/cuentas.ts` | Plan de cuentas, tasas de impuesto y deducción, mapeos de categoría a cuenta |
| `src/data/menu.ts` · `personal.ts` | Carta y plantilla inicial |
| `src/data/facturacion.ts` | Emisor, resoluciones POS/FE simuladas y medios de pago |
| `src/lib/comandas.ts` | Comandas: creación (combos repartidos por estación), anulaciones, estados de cocina, semáforo y sincronización de tiempos |
| `src/lib/facturacion.ts` | Emisión del documento electrónico, código único simulado y URL del QR |
| `src/data/salon.ts` | Distribución inicial de mesas (zonas y coordenadas para el 3D) y colores por estado |
| `src/data/seed.ts` | `construirEstadoInicial()` — arma la demo aplicando los mismos `aplicar*` que el reducer |
| `src/lib/operaciones.ts` | Traduce cada evento operativo (venta, compra, gasto, nómina) en su asiento de partida doble |
| `src/lib/salon.ts` | Operaciones puras de reservas y mesas (sentar, abrir, consumo, cerrar, limpiar) y el estado derivado de cada mesa + indicadores del salón |
| `src/lib/contabilidad.ts` | Motor de reportes: saldos, estado de resultados, balance general, libro mayor, balance de comprobación y series para gráficas |
| `src/store/tienda.tsx` | `useReducer` + Context con toda la data en memoria |
| `src/components/` | UI compartida, bloque de asiento, gráficas (Recharts) y el salón 3D (`Salon3D.tsx`, Three.js) |
| `src/views/` | Una vista por módulo |

## El motor contable

- **Naturaleza de la cuenta:** Activo y Gasto son deudoras (un débito las
  aumenta); Pasivo, Patrimonio e Ingreso son acreedoras.
- **Venta:** débito a caja/bancos por el total, crédito a ingresos por la base,
  crédito a impuesto al consumo por pagar, y en paralelo débito a costo de ventas
  contra crédito a inventario.
- **Nómina:** débito a gastos de personal por el devengado, crédito a deducciones
  por pagar y crédito a bancos por el neto.
- **Domicilio propio:** débito a caja/bancos por el total (productos + impuesto +
  envío), crédito a ingresos por ventas, impuesto al consumo e ingresos por
  domicilios; el pago al domiciliario va a gastos de reparto.
- **Domicilio por plataforma:** débito a cuentas por cobrar plataformas por el
  neto y a comisiones de plataformas por la comisión, contra ingresos y costo de
  ventas. La liquidación mueve el saldo de la cuenta por cobrar a bancos.
- **Reportes:** no se guardan totales; se recalculan leyendo los asientos cada
  vez que cambia el estado.
- **Estado de resultados:** Ingresos − Costo de ventas = Utilidad bruta; menos
  gastos operativos = Utilidad neta.
- **Balance general:** Activos = Pasivos + Capital + Utilidad del ejercicio. El
  dashboard y el libro mayor muestran un aviso verde cuando la ecuación cuadra.
