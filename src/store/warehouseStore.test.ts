import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../data';
import { createWarehouseStore, getObjectDetails, rackId } from './warehouseStore';
import { startSimulation } from './simulation';

test('telemetry changes all vehicles, preserves assignments and the source snapshot', () => {
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
      assert.notEqual(after.live[`${kind}:${entity.id}`].state, live[`${kind}:${entity.id}`].state);
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
