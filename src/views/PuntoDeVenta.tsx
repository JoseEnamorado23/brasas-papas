import { useMemo, useState } from 'react';
import { ChefHat, Minus, Plus, Trash2, Wallet } from 'lucide-react';
import type { Producto } from '../types';
import { useTienda } from '../store/tienda';
import { IMPUESTO_CONSUMO } from '../data/cuentas';
import { formatoMoneda } from '../lib/formato';
import { AsientoBloque } from '../components/AsientoBloque';
import { Carta } from '../components/Carta';
import { Cobro } from '../components/Cobro';
import { Boton, EstadoVacio, Panel } from '../components/ui';

type Carrito = Record<string, number>;

/**
 * Caja de mostrador: ventas para llevar o para comer de pie. Se cobra primero
 * (como en toda comida rápida) y el pedido sale a la pantalla de cocina.
 */
export function PuntoDeVenta() {
  const { estado, dispatch, sede } = useTienda();
  const [carrito, setCarrito] = useState<Carrito>({});
  const [enviarCocina, setEnviarCocina] = useState(true);
  const [cobrando, setCobrando] = useState(false);
  const [ultimaVentaId, setUltimaVentaId] = useState<string | null>(null);

  const cambiar = (id: string, delta: number) =>
    setCarrito((prev) => {
      const cantidad = (prev[id] ?? 0) + delta;
      const copia = { ...prev };
      if (cantidad <= 0) delete copia[id];
      else copia[id] = cantidad;
      return copia;
    });

  const lineas = useMemo(
    () =>
      Object.entries(carrito)
        .map(([productoId, cantidad]) => {
          const producto = estado.productos.find((p) => p.id === productoId);
          return producto ? { producto, cantidad, subtotal: producto.precio * cantidad } : null;
        })
        .filter((l): l is { producto: Producto; cantidad: number; subtotal: number } => l !== null),
    [carrito, estado.productos],
  );

  const base = lineas.reduce((s, l) => s + l.subtotal, 0);
  const impuesto = Math.round(base * IMPUESTO_CONSUMO);
  const total = base + impuesto;

  const asientoUltimaVenta =
    ultimaVentaId != null ? estado.asientos.find((a) => a.referencia === ultimaVentaId) : undefined;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <Carta productos={estado.productos} cantidades={carrito} onAgregar={(p) => cambiar(p.id, 1)} />

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Panel titulo="Cuenta actual" sinPadding>
          <div className="max-h-[40vh] overflow-y-auto px-4 py-3">
            {lineas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Toca un producto o un combo para agregarlo a la cuenta.
              </p>
            ) : (
              <ul className="space-y-2">
                {lineas.map(({ producto, cantidad, subtotal }) => (
                  <li key={producto.id} className="flex items-center gap-2 text-sm">
                    <span className="text-base" aria-hidden>
                      {producto.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ink">{producto.nombre}</p>
                      <p className="font-mono text-xs text-muted">{formatoMoneda(producto.precio)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => cambiar(producto.id, -1)}
                        className="grid h-6 w-6 place-items-center rounded border border-line text-ink hover:border-ink"
                        aria-label={`Quitar una unidad de ${producto.nombre}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-mono tabular text-ink">{cantidad}</span>
                      <button
                        type="button"
                        onClick={() => cambiar(producto.id, 1)}
                        className="grid h-6 w-6 place-items-center rounded border border-line text-ink hover:border-ink"
                        aria-label={`Agregar una unidad de ${producto.nombre}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="w-20 text-right font-mono tabular text-ink">{formatoMoneda(subtotal)}</span>
                    <button
                      type="button"
                      onClick={() => cambiar(producto.id, -cantidad)}
                      className="text-muted hover:text-ember"
                      aria-label={`Eliminar ${producto.nombre} de la cuenta`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line px-4 py-3 text-sm">
            <div className="flex justify-between py-1 text-ink/80">
              <span>Base gravable</span>
              <span className="font-mono tabular">{formatoMoneda(base)}</span>
            </div>
            <div className="flex justify-between py-1 text-ink/80">
              <span>Impuesto al consumo (8%)</span>
              <span className="font-mono tabular">{formatoMoneda(impuesto)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-ink/25 py-1.5 font-semibold text-ink">
              <span>Total a cobrar</span>
              <span className="font-mono tabular">{formatoMoneda(total)}</span>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={enviarCocina}
                onChange={(e) => setEnviarCocina(e.target.checked)}
                className="h-4 w-4 accent-[#1C1A17]"
              />
              <ChefHat className="h-4 w-4 text-muted" />
              Enviar a cocina al cobrar (para llevar)
            </label>

            <Boton
              type="button"
              onClick={() => setCobrando(true)}
              disabled={lineas.length === 0}
              className="mt-3 w-full !py-2.5"
            >
              <Wallet className="h-4 w-4" />
              Cobrar
            </Boton>
          </div>
        </Panel>

        {asientoUltimaVenta && (
          <div className="space-y-2">
            <p className="text-xs text-muted">Asiento generado por la última venta</p>
            <AsientoBloque asiento={asientoUltimaVenta} cuentas={estado.cuentas} destacado />
          </div>
        )}

        <Panel titulo="Últimas ventas">
          {estado.ventas.length === 0 ? (
            <EstadoVacio>Sin ventas registradas todavía.</EstadoVacio>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {estado.ventas
                .slice(-5)
                .reverse()
                .map((venta) => (
                  <li key={venta.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="font-mono text-xs text-muted">{venta.id}</span>
                    <span className="truncate text-ink/70">
                      {venta.canal} · {venta.formaPago}
                    </span>
                    <span className="font-mono tabular text-ink">{formatoMoneda(venta.total)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>

      {cobrando && (
        <Cobro
          titulo="Cobrar venta de mostrador"
          descripcion={enviarCocina ? 'Al cobrar, el pedido sale a la pantalla de cocina' : undefined}
          base={base}
          propinaSugerida={false}
          onCerrar={() => setCobrando(false)}
          onConfirmar={(cobro) => {
            dispatch({
              tipo: 'VENTA',
              cobro,
              enviarCocina,
              sedeId: sede,
              lineas: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
            });
            setUltimaVentaId(`V-${String(estado.ventas.length + 1).padStart(4, '0')}`);
            setCarrito({});
            setCobrando(false);
          }}
        />
      )}
    </div>
  );
}
