# Brasa & Papas — Gestión y contabilidad

Sistema de gestión para un restaurante de comida rápida con un **motor contable
de partida doble** que corre en segundo plano. No hay backend ni base de datos:
todo vive en el estado de React (`useReducer` + Context) y parte de un set de
datos precargado con ~2 semanas de operación para hacer una demostración.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS 3
- Recharts (gráficas)
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

| Vista | Qué hace |
| --- | --- |
| **Punto de venta** | Carta con emoji por producto, filtro por categoría y buscador. Combos prearmados que muestran lo que incluyen y el ahorro frente a comprar suelto. Carrito con impuesto al consumo 8% y forma de pago. Cada venta genera un asiento compuesto (caja, ingreso, impuesto por pagar, costo de ventas, salida de inventario). |
| **Ventas** | Historial operativo paginado con canal (mostrador / domicilio); cada fila se expande al detalle de productos y al asiento vinculado. |
| **Domicilios** | Pedidos con canal propio o por plataforma (Rappi, Didi Food). Valor de envío por zona, asignación de domiciliario, tablero por estado (recibido → en preparación → en camino → entregado) y liquidación de plataformas. Al entregar se genera la venta y el asiento compuesto; los pedidos por plataforma registran la comisión y quedan como cuenta por cobrar hasta la liquidación. |
| **Compras y gastos** | Formularios para compras a proveedor (inventario o gasto; contado, transferencia o crédito) y gastos operativos por categoría. |
| **Empleados y nómina** | Alta de empleados y corrida de nómina quincenal: devengado, deducciones de salud y pensión (8%) y neto. Genera el asiento de nómina. |
| **Libro diario** | Todos los asientos con filtro por origen, paginación y verificación de partida doble. |
| **Libro mayor** | Balance de comprobación (sumas y saldos) y detalle de movimientos por cuenta con saldo corriente. |
| **Dashboard** | KPIs (ticket promedio, margen bruto, impuestos por pagar…), gráficas (ventas por día, ingresos vs. gastos, gastos por categoría, productos más vendidos) y estados financieros. |

## Arquitectura del código

| Ruta | Rol |
| --- | --- |
| `src/data/cuentas.ts` | Plan de cuentas, tasas de impuesto y deducción, mapeos de categoría a cuenta |
| `src/data/menu.ts` · `personal.ts` | Carta y plantilla inicial |
| `src/data/seed.ts` | `construirEstadoInicial()` — arma la demo aplicando los mismos `aplicar*` que el reducer |
| `src/lib/operaciones.ts` | Traduce cada evento operativo (venta, compra, gasto, nómina) en su asiento de partida doble |
| `src/lib/contabilidad.ts` | Motor de reportes: saldos, estado de resultados, balance general, libro mayor, balance de comprobación y series para gráficas |
| `src/store/tienda.tsx` | `useReducer` + Context con toda la data en memoria |
| `src/components/` | UI compartida, bloque de asiento y gráficas (Recharts) |
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
