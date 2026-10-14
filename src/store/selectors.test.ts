import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedData, SEED_TIMESTAMP } from '../data';
import { createWarehouseStore } from './warehouseStore';
import { getFilteredShipments, getSiteKpis, isShipmentDelayed } from './selectors';

test('KPIs are scoped by site, use only completed outcomes, and count available stock', () => {
  const data = structuredClone(seedData);
  const site = data.sites[0].id;
  const completed = data.shipments.filter(s => s.siteId === site && s.status === 'completed');
  completed[0].completedAt = new Date(Date.parse(completed[0].etaDeparture) + 60_000).toISOString();
  data.inventoryItems[0].quantityOnHand = 110;
  data.inventoryItems[0].quantityReserved = 20;
  const store = createWarehouseStore(data);
  const state = store.getState();
  const kpis = getSiteKpis(state, site);
  assert.equal(kpis.onTimeRate, (completed.length - 1) / completed.length * 100);
  assert.equal(kpis.docksInUse, 1); assert.equal(kpis.totalDocks, 6); assert.equal(kpis.activeTrucks, 4);
  assert(kpis.lowStock >= 1);
  const baseline = getSiteKpis(state, data.sites[1].id);
  assert.equal(baseline.onTimeRate, 100);
  store.getState().setFilters({ delayedOnly: true, truckStatus: 'inspection' });
  assert.deepEqual(getSiteKpis(store.getState(), site), kpis);
  assert.equal(getSiteKpis(state, 'unknown').onTimeRate, null);
});

test('shipment delay follows pending arrival or departure deadlines, including exact boundary', () => {
  const loading = seedData.shipments[0];
  assert.equal(isShipmentDelayed(loading, loading.etaDeparture), false);
  assert.equal(isShipmentDelayed(loading, new Date(Date.parse(loading.etaDeparture) + 1).toISOString()), true);
  const transit = seedData.shipments.find(s => s.status === 'in_transit')!;
  assert.equal(isShipmentDelayed(transit, transit.etaArrival), false);
  assert.equal(isShipmentDelayed(transit, new Date(Date.parse(transit.etaArrival) + 1).toISOString()), true);
  assert.equal(isShipmentDelayed(loading, SEED_TIMESTAMP), false);
});

test('combined filters use current telemetry; site switching validates IDs and clears selection', () => {
  const store = createWarehouseStore();
  store.setState({ operationalTime: '2026-10-14T09:00:00.000Z' });
  const all = getFilteredShipments(store.getState());
  assert.equal(all.length, 4);
  store.getState().setFilters({ delayedOnly: true, truckStatus: 'loading' });
  const filtered = getFilteredShipments(store.getState());
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].truckId, 'truck-101');
  store.getState().advance('2026-10-14T09:00:02.000Z');
  assert.equal(getFilteredShipments(store.getState()).length, 0);
  store.getState().select({ kind: 'truck', id: 'truck-101' });
  store.getState().setSite('site-penang');
  assert.equal(store.getState().activeSiteId, 'site-penang'); assert.equal(store.getState().selected, null);
  store.getState().setSite('invalid'); assert.equal(store.getState().activeSiteId, 'site-penang');
  assert.deepEqual(store.getState().filters, { delayedOnly: true, truckStatus: 'loading' });
});
