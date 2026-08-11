import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { VehicleTable } from '../components/VehicleTable';
import { GastosChart } from '../components/GastosChart';
import { AlertBanner } from '../components/AlertBanner';
import { Screen } from '../components/Screen';
import { WarningIcon, ClockIcon } from '../icons';
import { card, linkBtn, linkBtnHover, sectionTitle } from '../styles';

export function Resumen({ v }: { v: View }) {
  return (
    <Screen label="Resumen" style={{ gap: 9 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
        {v.kpis.map((k) => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.bd}`, borderRadius: 16, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: k.labelFg }}>{k.label}</span>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: k.valueFg }}>{k.value}</span>
            <span style={{ fontSize: 11, color: k.deltaFg }}>{k.delta}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 9, minHeight: 0, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0, minHeight: 0 }}>
          <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
              <SearchBar value={v.carQ} onChange={v.setCarQ} placeholder="Buscar vehículo…" />
              <ChipRow chips={v.fleetFilters} />
              <Btn onClick={v.goFlota} style={{ ...linkBtn, minHeight: 34, padding: '0 6px', marginLeft: 'auto' }} hoverStyle={linkBtnHover}>
                Ver todo →
              </Btn>
            </div>
            <VehicleTable cols={v.cols} rows={v.rows} variant="resumen" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
          <GastosChart v={v} />

          <AlertBanner icon={<WarningIcon size={18} />} iconBg="#fdeeea" iconFg="#a8412f" title="Necesitan atención" summary={v.alertsSummary} badge={v.alertCount} onClick={v.goAlertas} />

          <AlertBanner icon={<ClockIcon size={18} />} iconBg="#fdf3e2" iconFg="#a8730f" title="Cobros pendientes" summary={v.pendSummary} onClick={v.goCobros} />

          <div style={{ background: '#16150f', color: '#fffdf8', borderRadius: 16, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
              <span style={{ flex: 1, ...sectionTitle }}>Más rentables</span>
              <span style={{ fontSize: 11, color: '#bdb6a4' }}>{v.periodShort}</span>
              <Btn onClick={v.goFlotaTop} style={{ border: 'none', background: 'none', color: '#e8a13a', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }} hoverStyle={{ color: '#f7dfae' }}>
                Ver todo →
              </Btn>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {v.topCars.map((t) => (
                <div key={t.pos} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#e8a13a', width: 14, flex: 'none' }}>{t.pos}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '0.01em' }}>{t.plate}</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#bdb6a4', marginTop: 1 }}>{t.driver}</span>
                  </span>
                  <span style={{ flex: 'none', fontSize: 13, fontWeight: 700 }}>{t.net}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}
