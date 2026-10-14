import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { warehouseStore } from '../../store/warehouseStore';
import { getFilteredShipments, isShipmentDelayed } from '../../store/selectors';

const arrivalTime = new Intl.DateTimeFormat('en-MY', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' });
export function ShipmentList() {
  const state = useStore(warehouseStore, useShallow(s => ({ data: s.data, live: s.live, filters: s.filters, operationalTime: s.operationalTime, activeSiteId: s.activeSiteId, select: s.select })));
  const shipments = getFilteredShipments(state);
  const formatTime = (date: string) => arrivalTime.format(new Date(date));
  return <section className="movement-panel" aria-label="Filtered shipments">
    <div className="movement-heading"><h2>Site movements</h2><span data-testid="shipment-count">{shipments.length}</span></div>
    <p className="movement-note">Off-site trucks appear here. Filters control scene vehicles.</p>
    <div className="movement-list">
      {!shipments.length && <p className="empty-movements" role="status">No movements match these filters. Clear the filters to see all active shipments.</p>}
      {shipments.map(shipment => {
        const truck = state.data.trucks.find(t => t.id === shipment.truckId);
        if (!truck) return null;
        const delayed = isShipmentDelayed(shipment, state.operationalTime);
        return <button key={shipment.id} className="movement-row" onClick={() => state.select({ kind: 'truck', id: truck.id })}>
          <span><strong>{shipment.reference}</strong><small>{truck.registration} · {shipment.direction}</small></span>
          <span className="movement-status"><b className={delayed ? 'is-delayed' : ''}>{delayed ? 'Delayed' : state.live[`truck:${truck.id}`]?.state.replaceAll('_', ' ')}</b><small>ETA {formatTime(shipment.etaArrival)} MYT</small></span>
        </button>;
      })}
    </div>
  </section>;
}
