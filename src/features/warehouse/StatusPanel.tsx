import { useStore } from 'zustand';
import { getObjectDetails, warehouseStore } from '../../store/warehouseStore';

const label = (state: string) => state.replaceAll('_', ' ');
export function StatusPanel() {
  const selected = useStore(warehouseStore, s => s.selected);
  const live = useStore(warehouseStore, s => selected ? s.live[`${selected.kind}:${selected.id}`] : null);
  const data = useStore(warehouseStore, s => s.data);
  const details = getObjectDetails({ ...warehouseStore.getState(), selected, data }, selected);
  if (!details || !live) return null;
  const updated = new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(live.updatedAt));
  return <aside className="status-panel" aria-label="Selected object live status">
    <div className="panel-heading"><span>{details.ref.kind.toUpperCase()}</span>
      <button aria-label="Close status panel" onClick={() => warehouseStore.getState().select(null)}>×</button></div>
    <h1>{details.name}</h1>
    <p className="simulation-tag"><span className="status-dot" /> SIMULATED LIVE · 2 SECOND UPDATES</p>
    <dl>
      <div><dt>State</dt><dd className="state-badge" data-testid="object-state" aria-live="polite">{label(live.state)}</dd></div>
      <div><dt>Current shipment{details.shipments.length > 1 ? 's' : ''}</dt><dd>
        {details.shipments.length ? details.shipments.map(shipment => <div className="shipment-row" key={shipment.id}>
          <strong>{shipment.reference}</strong><small>{shipment.direction} · {label(shipment.status)}</small>
        </div>) : <span className="muted">No active shipment</span>}
      </dd></div>
      <div><dt>Last update</dt><dd><time dateTime={live.updatedAt} data-testid="last-update">{updated} MYT</time></dd></div>
    </dl>
    <p className="panel-note">Vehicle telemetry is simulated. Shipment assignments and warehouse positions use the existing data snapshot.</p>
  </aside>;
}
