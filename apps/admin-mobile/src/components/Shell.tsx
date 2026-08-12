import type { MobileView } from '../useMobileView';
import { TabHeader, SubHeader, SearchHeader } from './Header';
import { BottomNav } from './BottomNav';
import { Toast } from './Toast';
import { PeriodoSheet } from './PeriodoSheet';
import { EstadoSheet } from './EstadoSheet';
import { ChoferSheet } from './ChoferSheet';
import { Dashboard } from '../screens/Dashboard';
import { Flota } from '../screens/Flota';
import { Detalle } from '../screens/Detalle';
import { NuevoVehiculo } from '../screens/NuevoVehiculo';
import { Registrar } from '../screens/registrar/Registrar';
import { Reportes } from '../screens/Reportes';
import { Ranking } from '../screens/Ranking';
import { Search } from '../screens/Search';

export function Shell({ v, nombre }: { v: MobileView; nombre: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#f4f0e8', color: '#1a1a18', position: 'relative' }}>
      {v.isTab && <TabHeader title={v.headerTitle} sub={v.headerSub} onSearch={v.openSearch} nombre={nombre} />}
      {v.isSub && <SubHeader title={v.headerTitle} onBack={v.back} />}
      {v.isSearch && <SearchHeader q={v.search.q} onQ={v.search.setQ} onClear={v.search.clearQ} onBack={v.back} />}

      {v.screen === 'dashboard' && <Dashboard v={v} />}
      {v.screen === 'flota' && <Flota v={v} />}
      {v.screen === 'detalle' && <Detalle v={v} />}
      {v.screen === 'nuevoVehiculo' && <NuevoVehiculo v={v} />}
      {v.screen === 'registrar' && <Registrar v={v} />}
      {v.screen === 'reportes' && <Reportes v={v} />}
      {v.screen === 'ranking' && <Ranking v={v} />}
      {v.screen === 'search' && <Search v={v} />}

      <div style={{ position: 'sticky', bottom: 0, zIndex: 10, marginTop: 'auto' }}>
        {v.period.open && <PeriodoSheet v={v} />}
        {v.estadoSheet.open && <EstadoSheet v={v} />}
        {v.choferSheet.open && <ChoferSheet v={v} />}
        <Toast msg={v.toast} />
        <BottomNav v={v} />
      </div>
    </div>
  );
}
