import { useState } from 'react';
import type { UIState } from './types';
import { generateFleetData } from './data';
import { useFleetView, blankCar, blankDrv } from './useFleetView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Resumen } from './screens/Resumen';
import { Flota } from './screens/Flota';
import { Choferes } from './screens/Choferes';
import { Alertas } from './screens/Alertas';
import { Reportes } from './screens/Reportes';
import { Cobros } from './screens/Cobros';
import { DetailDrawer } from './components/DetailDrawer';
import { CarModal } from './components/CarModal';
import { DriverModal } from './components/DriverModal';
import { Toast } from './components/Toast';

const initialState: UIState = {
  period: 'mes',
  filter: 'todos',
  brand: 'todas',
  sortK: 'net',
  sortDir: -1,
  hide: false,
  nav: 'resumen',
  toast: '',
  cFrom: '2026-08-01',
  cTo: '2026-08-28',
  movType: 'todos',
  movCat: 'todas',
  modal: null,
  ncar: blankCar(),
  ndrv: blankDrv(),
  detailId: null,
};

function App() {
  const [seed] = useState(() => generateFleetData());
  const [cars, setCars] = useState(() => seed.cars);
  const [state, setState] = useState<UIState>(initialState);

  const update = (patch: Partial<UIState> | ((s: UIState) => Partial<UIState>)) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  };

  const v = useFleetView(cars, setCars, seed.movs, state, update);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '236px 1fr', height: '100vh', width: '100%', background: '#f4f0e8', position: 'relative', overflow: 'hidden' }}>
      <Sidebar navItems={v.navItems} diasCierre={v.diasCierre} />

      <main style={{ padding: '14px 22px 16px', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0, height: '100%', overflowY: 'auto' }}>
        <Header
          kicker={v.kicker}
          pageTitle={v.pageTitle}
          headerSub={v.headerSub}
          periodChips={v.periodChips}
          isCustom={v.isCustom}
          cFrom={v.cFrom}
          cTo={v.cTo}
          onFrom={v.onFrom}
          onTo={v.onTo}
          montosLbl={v.montosLbl}
          toggleMontos={v.toggleMontos}
        />

        {v.sResumen && <Resumen v={v} />}
        {v.sFlota && <Flota v={v} />}
        {v.sChoferes && <Choferes v={v} />}
        {v.sAlertas && <Alertas v={v} />}
        {v.sReportes && <Reportes v={v} />}
        {v.sCobros && <Cobros v={v} />}
      </main>

      <DetailDrawer v={v} />
      <CarModal v={v} />
      <DriverModal v={v} />
      <Toast v={v} />
    </div>
  );
}

export default App;
