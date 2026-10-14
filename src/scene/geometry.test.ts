import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, Vector3 } from 'three';
import { seedData } from '../data';
import { getSiteLayout } from './layout';
import { groupParts, partMatrices, selectedParts, warehouseGeometry } from './geometry';
import { rackId } from '../store/warehouseStore';

const site = seedData.sites[0];
const layout = getSiteLayout(seedData, site.id);
const rackKeys = Object.fromEntries(layout.racks.map(r => [`${r.aisle}-${r.rack}`, `rack:${rackId(site.id, r.aisle, r.rack)}`]));
const geometry = warehouseGeometry(layout, `site:${site.id}`, rackKeys);

test('hundreds of repeated parts fit a small batch budget and retain entity picking identities', () => {
  assert(geometry.parts.length > 400);
  assert(groupParts(geometry.parts).length <= 6);
  assert.equal(geometry.labels.length, 6);
  for (const item of seedData.inventoryItems.filter(i => i.siteId === site.id)) {
    assert(geometry.parts.some(p => p.key === `inventory:${item.id}`));
  }
  for (const parts of groupParts(geometry.parts)) {
    assert(parts.every(p => p.kind === parts[0].kind && p.emissive === parts[0].emissive && p.castShadow === parts[0].castShadow));
  }
});

test('instanced wheel transforms preserve original axle orientation and placement', () => {
  const wheel = geometry.parts.find(p => p.kind === 'wheel')!;
  const matrix = new Matrix4().fromArray(partMatrices([wheel]));
  const center = new Vector3().applyMatrix4(matrix);
  assert.deepEqual(center.toArray(), wheel.position.map(Math.fround));
  const axle = new Vector3(0, 1, 0).transformDirection(matrix);
  assert(Math.abs(axle.x + 1) < 1e-6);
  assert(Math.abs(axle.y) < 1e-6 && Math.abs(axle.z) < 1e-6);
});

test('selection outlines only its object, including stock on a selected rack', () => {
  const truck = selectedParts(geometry.parts, 'truck:truck-101', `site:${site.id}`);
  assert.equal(truck.length, 13);
  assert(truck.every(p => p.key === 'truck:truck-101'));
  const rackKey = rackKeys['A-1'];
  const rack = selectedParts(geometry.parts, rackKey, `site:${site.id}`);
  assert(rack.some(p => p.key === 'inventory:inventory-001'));
  assert(rack.every(p => p.key === rackKey || p.rackKey === rackKey));
  assert.equal(selectedParts(geometry.parts, null, `site:${site.id}`).length, 0);
  assert.equal(selectedParts(geometry.parts, `site:${site.id}`, `site:${site.id}`).length, geometry.parts.length);
});
