import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { btnSecondary, btnSecondaryHover, modalOverlay, modalPanel } from '../styles';

/** Confirmación para acciones que borran datos. El botón que confirma nombra la
 *  acción ("Eliminar vehículo") en vez de decir "Aceptar": el usuario lee el
 *  botón antes que el texto, y ahí tiene que estar lo que va a pasar. */
export function Confirm({ v }: { v: View }) {
  if (!v.confirmOpen) return null;
  return (
    <div onClick={v.cancelarConfirm} style={{ ...modalOverlay, zIndex: 80 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 420, gap: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{v.confirmTitulo}</div>
        <div style={{ fontSize: 13, color: '#3d3a34', lineHeight: 1.55 }}>{v.confirmDetalle}</div>
        {v.confirmAviso && (
          <div style={{ fontSize: 12, color: '#a8412f', background: '#fdeeea', border: '1px solid #f0d0c6', borderRadius: 12, padding: '10px 12px', lineHeight: 1.5 }}>{v.confirmAviso}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Btn onClick={v.cancelarConfirm} style={btnSecondary} hoverStyle={btnSecondaryHover}>
            Cancelar
          </Btn>
          <Btn
            onClick={v.confirmar}
            style={{ border: 'none', background: '#a8412f', color: '#fffdf8', borderRadius: 14, minHeight: 44, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            hoverStyle={{ background: '#8f3324' }}
          >
            {v.confirmBoton}
          </Btn>
        </div>
      </div>
    </div>
  );
}
