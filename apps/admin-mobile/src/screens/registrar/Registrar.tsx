import type { MobileView } from '../../useMobileView';
import { CobroWizard } from './CobroWizard';
import { GastoWizard } from './GastoWizard';

export function Registrar({ v }: { v: MobileView }) {
  const r = v.registrar;
  if (!r) return null;
  return r.tab === 'cobro' ? <CobroWizard r={r} /> : <GastoWizard r={r} />;
}
