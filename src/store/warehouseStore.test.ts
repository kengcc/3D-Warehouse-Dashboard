import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../data';
import { createWarehouseStore, getObjectDetails, rackId } from './warehouseStore';
import { startSimulation } from './simulation';

test('telemetry updates vehicles while preserving maintenance, assignments and the source snapshot', () => {
  const before = JSON.stringify(seedData);
  const store = createWarehouseStore();
  const data = store.getState().data;
  const live = store.getState().live;
  const ref = { kind: 'truck' as const, id: 'truck-101' };
  store.getState().select(ref);
  const beforeDetails = getObjectDetails(store.getState(), ref)!;
  store.getState().advance('2026-10-14T06:00:02.000Z');
  const after = store.getState();
  assert.equal(after.data, data);
  assert.equal(after.selected, ref);
  for (const kind of ['truck', 'forklift'] as const) {
    for (const entity of kind === 'truck' ? data.trucks : data.forklifts) {
      if (entity.status === 'maintenance') assert.equal(after.live[`${kind}:${entity.id}`].state, 'maintenance');
      else assert.notEqual(after.live[`${kind}:${entity.id}`].state, live[`${kind}:${entity.id}`].state);
      assert.equal(after.live[`${kind}:${entity.id}`].updatedAt, '2026-10-14T06:00:02.000Z');
    }
  }
  const afterDetails = getObjectDetails(after, ref)!;
  assert.notEqual(beforeDetails.state, afterDetails.state);
  assert.deepEqual(afterDetails.shipments, beforeDetails.shipments);
  assert.equal(JSON.stringify(seedData), before);
});

test('all selectable categories resolve names, states, shipment references and timestamps', () => {
  const store = createWarehouseStore();
  const item = seedData.inventoryItems[0];
  const refs = [
    { kind: 'site' as const, id: seedData.sites[0].id },
    { kind: 'dock' as const, id: seedData.docks[0].id },
    { kind: 'truck' as const, id: seedData.trucks[0].id },
    { kind: 'forklift' as const, id: seedData.forklifts[0].id },
    { kind: 'inventory' as const, id: item.id },
    { kind: 'rack' as const, id: rackId(item.siteId, item.location.aisle, item.location.rack) },
  ];
  for (const ref of refs) {
    const details = getObjectDetails(store.getState(), ref)!;
    assert(details.name && details.state);
    assert(Number.isFinite(Date.parse(details.updatedAt)));
    assert(details.shipments.every(s => s.status !== 'completed'));
  }
  assert.equal(getObjectDetails(store.getState(), null), null);
  store.getState().select(refs[0]);
  store.getState().select({ kind: 'truck', id: 'missing' });
  assert.deepEqual(store.getState().selected, refs[0]);
  store.getState().select(null);
  assert.equal(store.getState().selected, null);
});

test('simulation schedules exactly two seconds and returns its cleanup function', () => {
  const store = createWarehouseStore();
  let callback: () => void = () => {};
  let cleaned = false;
  const stop = startSimulation(store, (tick, milliseconds) => {
    assert.equal(milliseconds, 2000); callback = tick;
    return () => { cleaned = true; };
  }, () => '2026-10-14T06:00:02.000Z');
  callback();
  assert.equal(store.getState().tick, 1);
  stop(); assert(cleaned);
});

test('simulation never activates idle trucks or equipment in maintenance', () => {
  const data = structuredClone(seedData);
  data.trucks[0].status = 'maintenance';
  data.trucks[1].status = 'idle';
  const store = createWarehouseStore(data);
  for (let i = 0; i < 6; i++) {
    store.getState().advance('2026-10-14T06:00:02.000Z');
    assert.equal(store.getState().live['truck:truck-101'].state, 'maintenance');
    assert.equal(store.getState().live['truck:truck-102'].state, 'idle');
    assert.equal(store.getState().live['forklift:forklift-8'].state, 'maintenance');
  }
});

test('telemetry atomically clears an object that no longer matches a status filter', () => {
  const store = createWarehouseStore();
  store.getState().setFilters({ truckStatus: 'loading' });
  store.getState().select({ kind: 'truck', id: 'truck-101' });
  assert(store.getState().selected);
  const snapshots: Array<{ state: string; selected: unknown }> = [];
  const unsubscribe = store.subscribe(s => snapshots.push({ state: s.live['truck:truck-101'].state, selected: s.selected }));
  store.getState().advance('2026-10-14T06:00:02.000Z');
  unsubscribe();
  assert.deepEqual(snapshots, [{ state: 'waiting', selected: null }]);
});

test('stale registry entries and completed assignments never crash or appear as current shipments', () => {
  const store = createWarehouseStore(structuredClone(seedData));
  const state = store.getState();
  const ref = { kind: 'truck' as const, id: 'truck-101' };
  state.data.trucks[0].activeShipmentId = state.data.shipments.find(s => s.status === 'completed')!.id;
  assert.equal(getObjectDetails(state, ref)!.shipments.length, 0);
  state.data.trucks = state.data.trucks.filter(t => t.id !== ref.id);
  assert.equal(getObjectDetails(state, ref), null);
});
