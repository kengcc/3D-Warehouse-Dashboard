import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { seedData } from '../data/seed';
import { cameraLimits, dockX, getSiteLayout, MAP_HALF_SIZE, rackPosition } from './layout';

test('each site uses matching records and loading trucks align with assigned docks', () => {
  const before = JSON.stringify(seedData);
  for (const site of seedData.sites) {
    const layout = getSiteLayout(seedData, site.id);
    assert.equal(layout.docks.length, 6);
    assert.equal(layout.trucks.length, seedData.trucks.filter(t => t.currentSiteId === site.id).length);
    for (const { truck, position } of layout.trucks) {
      const shipment = seedData.shipments.find(s => s.id === truck.activeShipmentId)!;
      const dock = layout.docks.find(d => d.id === shipment.dockId)!;
      assert.equal(position[0], dockX(dock.number));
    }
    assert.equal(layout.racks.flatMap(r => r.items).length, seedData.inventoryItems.filter(i => i.siteId === site.id).length);
    for (const { forklift } of layout.forklifts) assert.equal(forklift.siteId, site.id);
    for (const rack of layout.racks) {
      const position = rackPosition(rack.aisle, rack.rack);
      assert(position.every(n => Math.abs(n) < MAP_HALF_SIZE));
    }
  }
  assert.equal(JSON.stringify(seedData), before);
});

test('camera footprint stays inside map across zoom levels and screen aspect ratios', () => {
  for (const [width, height] of [[1920,1080],[390,844],[2560,720]]) {
    for (const zoom of [1,7,13,34]) {
      const bounds = cameraLimits(width,height,zoom);
      const constrained = cameraLimits(width,height,Math.max(zoom,bounds.minimumZoom));
      assert(constrained.maxTarget >= 0);
      assert(constrained.maxTarget < MAP_HALF_SIZE);
      assert(Number.isFinite(bounds.minimumZoom));
      assert.equal(constrained.maxTarget,bounds.maxTarget);
      const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 350);
      camera.zoom = Math.max(zoom, bounds.minimumZoom);
      const target = new Vector3(constrained.maxTarget, 0, -constrained.maxTarget);
      camera.position.copy(target).add(new Vector3(52, 52, 52));
      camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      const ray = new Raycaster();
      const floor = new Plane(new Vector3(0, 1, 0), 0);
      for (const x of [-1, 1]) for (const y of [-1, 1]) {
        ray.setFromCamera(new Vector2(x, y), camera);
        const corner = ray.ray.intersectPlane(floor, new Vector3());
        assert(corner);
        assert(Math.abs(corner.x) <= MAP_HALF_SIZE, `Ground corner x escaped at ${width}x${height}`);
        assert(Math.abs(corner.z) <= MAP_HALF_SIZE, `Ground corner z escaped at ${width}x${height}`);
      }
    }
  }
});
