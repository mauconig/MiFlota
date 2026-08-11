import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { PlusIcon } from '../icons';
import { card } from '../styles';

/** Encabezado de columnas. Sin él, dos montos seguidos en la misma fila no
 *  dicen cuál es cuál. Los anchos van pegados a los de las filas de abajo. */
const th: React.CSSProperties = {
  padding: '8px 20px',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 13,
  borderBottom: '1px solid #f0ebe0',
  flex: 'none',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6b665c',
};

const avatar: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 18,
  background: '#f4f0e8',
  color: '#5f5a51',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  flex: 'none',
};

const tag: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  padding: '5px 10px',
  borderRadius: 11,
};

export function Cobros({ v }: { v: View }) {
  const enPagos = v.cobrosTab === 'pagos';

  return (
    <Screen label="Cobros" style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
        <ChipRow chips={v.cobrosTabChips} />
        <span style={{ width: 1, height: 20, background: '#ece4d6', margin: '0 4px' }} />
        <SearchBar value={v.pendQ} onChange={v.setPendQ} placeholder="Buscar chofer o chapa…" />
        {!enPagos && <ChipRow chips={v.pendKindChips} />}
        <span style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#6b665c' }}>{enPagos ? v.pagosSub : v.cobrosSub}</span>
          <Btn
            onClick={v.abrirPago}
            style={{ border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 12, minHeight: 34, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flex: 'none' }}
            hoverStyle={{ background: '#2a2820' }}
          >
            <PlusIcon size={14} />
            Registrar pago
          </Btn>
        </span>
      </div>

      {enPagos ? (
        <>
          <div style={th}>
            <span style={{ width: 36, flex: 'none' }} />
            <span style={{ width: 190, flex: 'none' }}>Chofer</span>
            <span style={{ flex: 1, minWidth: 0 }}>Vehículo</span>
            <span style={{ width: 180, flex: 'none' }}>Nota</span>
            <span style={{ width: 74, flex: 'none' }}>Fecha</span>
            <span style={{ width: 84, flex: 'none' }}>Tipo</span>
            <span style={{ width: 96, flex: 'none', textAlign: 'right' }}>Monto</span>
            <span style={{ width: 28, flex: 'none' }} />
          </div>
          {!v.pagosFull.length && (
            <Vacio titulo="Sin pagos en el período" detalle="Acá queda el libro de lo que fue entrando, con la fecha real de cada pago. Registrá uno con el botón de arriba." />
          )}
          <ScrollArea style={{ padding: '4px 20px' }}>
            {v.pagosFull.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, padding: '11px 0', borderBottom: '1px solid #f4efe4' }}>
                <span style={avatar}>{p.initials}</span>
                <span style={{ width: 190, flex: 'none', fontSize: 14, fontWeight: 700 }}>{p.driver}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#6b665c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.carLbl}</span>
                <span style={{ width: 180, flex: 'none', fontSize: 12, color: '#6b665c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nota || '—'}</span>
                <span style={{ width: 74, flex: 'none', fontSize: 12, color: '#6b665c' }}>{p.dateLbl}</span>
                <span style={{ width: 84, flex: 'none' }}>
                  <span style={{ ...tag, background: p.tagBg, color: p.tagFg }}>{p.tag}</span>
                </span>
                <span style={{ width: 96, flex: 'none', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#2e7d5b' }}>{p.monto}</span>
                {/* Un pago no se edita: cambiarle el monto reescribiría en
                    silencio a qué cuotas quedó imputado. Se borra y se rehace. */}
                <Btn
                  onClick={p.borrar}
                  ariaLabel={'Eliminar pago de ' + p.driver}
                  style={{ width: 28, height: 28, flex: 'none', border: 'none', background: 'none', borderRadius: 8, color: '#a09a8d', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
                  hoverStyle={{ background: '#fdeeea', color: '#a8412f' }}
                >
                  ×
                </Btn>
              </div>
            ))}
          </ScrollArea>
        </>
      ) : (
        <>
          <div style={th}>
            <span style={{ width: 36, flex: 'none' }} />
            <span style={{ width: 190, flex: 'none' }}>Chofer</span>
            <span style={{ flex: 1, minWidth: 0 }}>Concepto</span>
            <span style={{ width: 74, flex: 'none' }}>Fecha</span>
            <span style={{ width: 84, flex: 'none' }}>Estado</span>
            <span style={{ width: 122, flex: 'none', textAlign: 'right' }}>Cobrado</span>
            <span style={{ width: 84, flex: 'none', textAlign: 'right' }}>Debe</span>
          </div>
          {!v.cobrosFull.length &&
            (v.pendQ || v.pendKind !== 'todas' ? (
              <div style={{ padding: '30px 0', fontSize: 13, color: '#6b665c', textAlign: 'center' }}>Ningún cobro coincide</div>
            ) : (
              <Vacio titulo="No hay cobros en el período" detalle="Acá aparecen las cuotas del período: las cobradas, las pagadas a medias y las que todavía no entraron." />
            ))}
          <ScrollArea style={{ padding: '4px 20px' }}>
            {v.cobrosFull.map((p, i) => (
              <Btn
                key={i}
                onClick={p.open}
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, width: '100%', padding: '11px 0', border: 'none', background: 'none', borderBottom: '1px solid #f4efe4', textAlign: 'left', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
                hoverStyle={{ background: '#fbf7ee' }}
              >
                <span style={avatar}>{p.initials}</span>
                <span style={{ width: 190, flex: 'none' }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{p.driver}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{p.plate}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#3d3a34' }}>{p.desc}</span>
                <span style={{ width: 74, flex: 'none', fontSize: 12, color: '#6b665c' }}>{p.dateLbl}</span>
                <span style={{ width: 84, flex: 'none' }}>
                  <span style={{ ...tag, background: p.tagBg, color: p.tagFg }}>{p.tag}</span>
                </span>
                <span style={{ width: 122, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, color: p.amt === '—' ? '#6b665c' : '#2e7d5b' }}>{p.amt}</span>
                <span style={{ width: 84, flex: 'none', textAlign: 'right', fontSize: 14, fontWeight: 700, color: p.debeFg }}>{p.debe || '—'}</span>
              </Btn>
            ))}
          </ScrollArea>
        </>
      )}
    </Screen>
  );
}
