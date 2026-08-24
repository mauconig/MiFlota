import type { MobileView } from '../../useMobileView';
import { CobroSuccess, CobroWizard } from './CobroWizard';
import { GastoSuccess, GastoWizard } from './GastoWizard';

export function Registrar({ v }: { v: MobileView }) {
  const r = v.registrar;
  if (!r) return null;
  if (r.tab === 'cobro') return r.success ? <CobroSuccess r={r} /> : <CobroWizard r={r} />;
  return r.success ? <GastoSuccess r={r} /> : <GastoWizard r={r} />;
}
