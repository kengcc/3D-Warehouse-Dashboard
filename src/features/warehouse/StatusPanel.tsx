import { useStore } from 'zustand';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getObjectDetails, warehouseStore } from '../../store/warehouseStore';

const updatedTime = new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kuala_Lumpur' });
const label = (state: string) => state.replaceAll('_', ' ');
export function StatusPanel() {
  const { selected, live, data } = useStore(warehouseStore, useShallow(s => ({
    selected: s.selected, data: s.data,
    live: s.selected ? s.live[`${s.selected.kind}:${s.selected.id}`] : null,
  })));
  const details = useMemo(() => getObjectDetails({ data,
    live: selected && live ? { [`${selected.kind}:${selected.id}`]: live } : {},
  }, selected), [data, selected, live]);
  if (!details || !live) return null;
  const updated = updatedTime.format(new Date(live.updatedAt));
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
