import { useState } from 'react';
import { Wallet } from 'lucide-react';
import type { SesionMesa } from '../types';
import { useTienda } from '../store/tienda';
import { Cobro } from './Cobro';
import { Boton } from './ui';

/** Botón "Cobrar" de una mesa. El documento emitido lo muestra `AvisoFacturaNueva`. */
export function CobrarMesa({
  sesion,
  nombreMesa,
  className = '',
}: {
  sesion: SesionMesa;
  nombreMesa: string;
  className?: string;
}) {
  const { dispatch } = useTienda();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Boton
        type="button"
        onClick={() => setAbierto(true)}
        disabled={sesion.consumo.length === 0}
        className={className}
      >
        <Wallet className="h-4 w-4" />
        Cobrar cuenta
      </Boton>
      {abierto && (
        <Cobro
          titulo={`Cobrar ${nombreMesa}`}
          descripcion={`${sesion.comensales} comensales · atendió ${sesion.mesero}`}
          base={sesion.base}
          propinaSugerida
          onCerrar={() => setAbierto(false)}
          onConfirmar={(cobro) => {
            dispatch({ tipo: 'COBRAR_MESA', sesionId: sesion.id, cobro });
            setAbierto(false);
          }}
        />
      )}
    </>
  );
}
