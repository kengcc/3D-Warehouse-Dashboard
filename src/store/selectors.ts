import type { Shipment } from '../data';
import type { WarehouseStore } from './warehouseStore';

export const TRUCK_STATUSES = ['loading', 'waiting', 'inspection', 'scheduled', 'driver_check', 'in_transit', 'traffic_delay', 'idle', 'maintenance'];

/** Arrival is the deadline until arrival is recorded; then planned departure applies. */
export function isShipmentDelayed(shipment: Shipment, asOf: string) {
  if (shipment.status === 'completed') {
    return shipment.completedAt !== null && Date.parse(shipment.completedAt) > Date.parse(shipment.etaDeparture);
  }
  const deadline = shipment.actualArrival ? shipment.etaDeparture : shipment.etaArrival;
  return Date.parse(asOf) > Date.parse(deadline);
}

export function getSiteKpis(state: WarehouseStore, siteId = state.activeSiteId) {
  const shipments = state.data.shipments.filter(s => s.siteId === siteId);
  const completed = shipments.filter(s => s.status === 'completed' && s.completedAt !== null);
  const onTime = completed.filter(s => Date.parse(s.completedAt!) <= Date.parse(s.etaDeparture)).length;
  const docks = state.data.docks.filter(d => d.siteId === siteId);
  const assigned = new Set(shipments.filter(s => s.status !== 'completed').map(s => s.truckId));
  const activeTrucks = state.data.trucks.filter(t => (t.currentSiteId === siteId || assigned.has(t.id))
    && !['idle', 'maintenance'].includes(state.live[`truck:${t.id}`]?.state ?? t.status)).length;
  const lowStock = state.data.inventoryItems.filter(i => i.siteId === siteId
    && i.quantityOnHand - i.quantityReserved < i.reorderPoint).length;
  return {
    onTimeRate: completed.length ? onTime / completed.length * 100 : null,
    completedCount: completed.length,
    docksInUse: docks.filter(d => (state.live[`dock:${d.id}`]?.state ?? d.status) === 'occupied').length,
    totalDocks: docks.length, activeTrucks, lowStock,
  };
}

/** Filters combine with AND; site KPIs deliberately remain unfiltered. */
export function getFilteredShipments(state: WarehouseStore, siteId = state.activeSiteId) {
  return state.data.shipments.filter(s => s.siteId === siteId && s.status !== 'completed'
    && (!state.filters.delayedOnly || isShipmentDelayed(s, state.operationalTime))
    && (state.filters.truckStatus === 'all' || state.live[`truck:${s.truckId}`]?.state === state.filters.truckStatus));
}
