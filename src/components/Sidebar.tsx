import type { NavItem } from '../useFleetView';
import { Btn } from './Btn';
import { IconPath, TruckLogo } from '../icons';

export function Sidebar({ navItems, diasCierre }: { navItems: NavItem[]; diasCierre: number }) {
  return (
    <aside style={{ background: '#16150f', color: '#fffdf8', padding: '26px 18px', display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11, padding: '0 6px' }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: '#e8a13a', color: '#16150f', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <TruckLogo />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Sikka Flota</div>
          <div style={{ fontSize: 11, color: '#bdb6a4' }}>Panel del dueño</div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((n) => (
          <Btn
            key={n.key}
            onClick={n.pick}
            style={{
              border: 'none',
              background: n.bg,
              color: n.fg,
              borderRadius: 14,
              minHeight: 44,
              padding: '0 14px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            hoverStyle={{ background: '#242219' }}
          >
            <IconPath d={n.icon} size={18} />
            <span style={{ flex: 1, minWidth: 0 }}>{n.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: n.badgeFg }}>{n.badge}</span>
          </Btn>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ border: '1px solid #333024', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bdb6a4' }}>Cierre del mes</span>
          <span style={{ fontSize: 13, color: '#e4dece', lineHeight: 1.45 }}>Faltan {diasCierre} días para cerrar agosto.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '0 4px' }}>
          <span style={{ width: 34, height: 34, borderRadius: 17, background: '#e8a13a', color: '#16150f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>
            MR
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Miguel Rojas</div>
            <div style={{ fontSize: 11, color: '#bdb6a4' }}>15 vehículos</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
