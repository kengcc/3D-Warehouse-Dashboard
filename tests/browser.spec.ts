import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { RootState } from '@react-three/fiber';
import type { MapControls } from 'three-stdlib';
import type { StoreApi } from 'zustand';
import type { WarehouseStore } from '../src/store/warehouseStore';
import type { Part } from '../src/scene/geometry';

declare global {
  interface Window { reviewRoot: RootState; reviewStore: StoreApi<WarehouseStore>; reviewCanvas: HTMLCanvasElement }
}

async function setup(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  let storeUrl = '', fiberUrl = '';
  page.on('request', request => {
    if (!storeUrl && request.url().includes('/src/store/warehouseStore.ts')) storeUrl = request.url();
    if (!fiberUrl && request.url().includes('/.vite/deps/@react-three_fiber.js')) fiberUrl = request.url();
  });
  await page.goto('/'); await page.locator('canvas').waitFor();
  await expect.poll(() => page.evaluate(async ({ storeUrl, fiberUrl }) => {
    const { _roots } = await import(fiberUrl);
    const canvas = document.querySelector('canvas');
    const root = _roots.get(canvas)?.store.getState();
    if (!root?.gl || !canvas) return false;
    window.reviewCanvas = canvas;
    window.reviewRoot = root;
    window.reviewStore = (await import(storeUrl)).warehouseStore;
    return root.gl.info.render.calls > 0;
  }, { storeUrl, fiberUrl }), { timeout: 10_000 }).toBe(true);
  return errors;
}

async function point(page: Page, key: string, shape: 'truck' | 'forklift' | 'rack' | 'inventory' | 'dock' | 'site') {
  return page.evaluate(({ key, shape }) => {
    const root = window.reviewRoot.get();
    let result: { part: Part; object: import('three').Object3D } | undefined;
    let label: { position: [number, number, number]; object: import('three').Object3D } | undefined;
    root.scene.traverse(object => {
      if (shape === 'dock') {
        const entry = object.userData.labels?.find((l: { key: string }) => l.key === key);
        if (entry) label = { position: entry.position, object };
      }
      for (const part of (object.userData.parts ?? []) as Part[]) {
        if (part.key !== key || part.kind !== 'box') continue;
        const match = shape === 'truck' ? part.size[2] === 9.6
          : shape === 'forklift' ? part.size[1] === 0.15 && part.size[0] === 1.6
          : shape === 'rack' ? part.size[1] === 0.12 && part.position[1] === 6.1
          : shape === 'inventory' ? part.size[0] === 1.75
          : shape === 'site' ? part.size[0] === 144 : false;
        if (match && !result) result = { part, object };
      }
    });
    if (!result && !label) throw new Error(`Missing clickable object ${key}`);
    const object = label?.object ?? result!.object;
    const position = label?.position ?? result!.part.position;
    const v = object.position.clone().fromArray(position);
    if (!label) {
      if (shape === 'site') v.set(35, 0.04, 20);
      else if (shape === 'inventory') { v.y -= 0.05; v.z += result!.part.size[2] / 2 + 0.015; }
      else v.y += result!.part.size[1] / 2 + 0.02;
    }
    object.localToWorld(v); v.project(root.camera);
    const rect = window.reviewCanvas.getBoundingClientRect();
    return { x: rect.left + (v.x + 1) * rect.width / 2, y: rect.top + (1 - v.y) * rect.height / 2 };
  }, { key, shape });
}

async function click(page: Page, key: string, shape: Parameters<typeof point>[2]) {
  const p = await point(page, key, shape); await page.mouse.click(p.x, p.y);
}

async function freezeTelemetry(page: Page) {
  await page.evaluate(() => window.reviewStore.setState({ advance: () => {} }));
}

test('instanced picking, live panel, outlines, drag suppression and resource cleanup', async ({ page }) => {
  const errors = await setup(page);
  await click(page, 'truck:truck-101', 'truck');
  await expect(page.getByRole('heading', { name: /TRUCK-101/ })).toBeVisible();
  await expect(page.locator('.controls-hint')).toBeHidden();
  const timestamp = await page.getByTestId('last-update').getAttribute('datetime');
  await expect.poll(() => page.getByTestId('last-update').getAttribute('datetime')).not.toBe(timestamp);
  expect(await page.evaluate(() => window.reviewCanvas === document.querySelector('canvas'))).toBe(true);
  expect(await page.evaluate(() => window.reviewRoot.get().scene.children.length)).toBeLessThan(20);
  await page.getByRole('button', { name: 'Close status panel' }).click();
  for (const [key, shape, heading] of [
    ['forklift:forklift-1', 'forklift', 'SA-FL-01'],
    ['dock:site-shah-alam-dock-1', 'dock', 'Dock 01'],
    ['rack:site-shah-alam/A/1', 'rack', 'Shelving A1'],
    ['inventory:inventory-005', 'inventory', 'Electric Kettle 1.7 L · AP-2001'],
    ['site:site-shah-alam', 'site', 'Shah Alam Distribution Centre'],
  ] as const) {
    await click(page, key, shape); await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.reviewRoot.get().gl.info.render.calls)).toBeLessThan(30);
    await page.getByRole('button', { name: 'Close status panel' }).click();
  }
  await freezeTelemetry(page);
  await page.mouse.move(600, 600); await page.mouse.down(); await page.mouse.move(750, 650, { steps: 15 }); await page.mouse.up();
  await expect(page.locator('.status-panel')).toHaveCount(0);
  for (let i = 0; i < 12; i++) {
    await click(page, 'truck:truck-101', 'truck'); await page.keyboard.press('Escape');
  }
  await expect.poll(() => page.evaluate(() => window.reviewRoot.get().gl.info.memory.geometries)).toBeLessThan(12);
  expect(errors).toEqual([]);
});

test('demand rendering sleeps across telemetry ticks, but camera flights continue after idle', async ({ page }) => {
  const errors = await setup(page);
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.reviewRoot.get().gl.info.render.frame);
  await page.waitForTimeout(2400);
  expect(await page.evaluate(() => window.reviewRoot.get().gl.info.render.frame)).toBe(before);
  await page.selectOption('[aria-label="Warehouse site"]', 'site-penang');
  await page.waitForTimeout(180);
  const midway = await page.evaluate(() => (window.reviewRoot.get().controls as MapControls).target.x);
  expect(midway).toBeGreaterThan(0); expect(midway).toBeLessThan(180);
  await expect.poll(() => page.evaluate(() => (window.reviewRoot.get().controls as MapControls).target.x)).toBe(180);
  await click(page, 'forklift:forklift-4', 'forklift'); await expect(page.getByRole('heading', { name: 'PG-FL-04', exact: true })).toBeVisible();
  await page.selectOption('[aria-label="Warehouse site"]', 'site-johor');
  await page.selectOption('[aria-label="Warehouse site"]', 'site-shah-alam');
  await expect.poll(() => page.evaluate(() => (window.reviewRoot.get().controls as MapControls).target.x)).toBe(0);
  await expect(page.locator('.status-panel')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('combined filters preserve KPIs, bounds and raycasting after resizing and matrix updates', async ({ page }) => {
  const errors = await setup(page); await freezeTelemetry(page);
  await page.evaluate(() => {
    const state = window.reviewStore.getState();
    window.reviewStore.setState({ live: { ...state.live, 'truck:truck-101': { state: 'loading', updatedAt: state.operationalTime } } });
  });
  await page.selectOption('[aria-label="Truck status filter"]', 'loading');
  await expect(page.getByTestId('shipment-count')).toHaveText('1');
  await expect(page.getByTestId('kpi-trucks')).toHaveText('4');
  await page.getByRole('checkbox', { name: 'Only delayed shipments' }).check();
  await expect(page.getByTestId('shipment-count')).toHaveText('0');
  await page.evaluate(() => window.reviewStore.setState({ operationalTime: '2026-10-14T09:00:00.000Z' }));
  await expect(page.getByTestId('shipment-count')).toHaveText('1');
  await click(page, 'truck:truck-101', 'truck'); await expect(page.getByRole('heading', { name: /TRUCK-101/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  // Filtering reconstructs instance buffers; label UVs must follow dock numbers, not array order.
  await page.evaluate(() => {
    const data = window.reviewStore.getState().data;
    window.reviewStore.setState({ data: { ...data, docks: [...data.docks].reverse() } });
  });
  await expect.poll(() => page.evaluate(() => {
    let correct = true;
    window.reviewRoot.get().scene.traverse(object => {
      const labels = object.userData.labels as Array<{ number: number }> | undefined;
      if (!labels) return;
      const mesh = object as import('three').InstancedMesh;
      labels.forEach((label, index) => { if (mesh.geometry.attributes.labelIndex.getX(index) !== label.number - 1) correct = false; });
    });
    return correct;
  })).toBe(true);
  await page.mouse.move(750, 550);
  for (let i = 0; i < 25; i++) await page.mouse.wheel(0, -500);
  await page.mouse.down(); await page.mouse.move(1350, 900, { steps: 15 }); await page.mouse.up();
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 500);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => {
    const camera = window.reviewRoot.get().camera;
    const direction = camera.position.clone().set(0, 0, -1).transformDirection(camera.matrixWorld);
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      const corner = camera.position.clone().set(x, y, -1).unproject(camera);
      corner.addScaledVector(direction, -corner.y / direction.y);
      if (Math.abs(corner.x) > 72.001 || Math.abs(corner.z) > 72.001) return false;
    }
    return true;
  })).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.selectOption('[aria-label="Warehouse site"]', 'site-penang');
  await expect.poll(() => page.evaluate(() => (window.reviewRoot.get().controls as MapControls).target.x)).toBe(180);
  await click(page, 'forklift:forklift-4', 'forklift'); await expect(page.getByRole('heading', { name: 'PG-FL-04', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('continuous renderer budget and frame timings', async ({ page }, testInfo) => {
  const errors = await setup(page);
  const result = await page.evaluate(async () => {
    const root = window.reviewRoot.get(); root.setFrameloop('always');
    const intervals: number[] = []; let last = performance.now();
    await new Promise<void>(resolve => {
      function frame(time: number) { intervals.push(time - last); last = time;
        if (intervals.length < 180) requestAnimationFrame(frame); else resolve(); }
      requestAnimationFrame(frame);
    });
    const samples = intervals.slice(10).sort((a, b) => a - b);
    const context = root.gl.getContext(), extension = context.getExtension('WEBGL_debug_renderer_info');
    const result = {
      fps: 1000 / (samples.reduce((sum, t) => sum + t, 0) / samples.length), p95Ms: samples[Math.floor(samples.length * 0.95)],
      calls: root.gl.info.render.calls, geometries: root.gl.info.memory.geometries, textures: root.gl.info.memory.textures,
      renderer: extension ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
      dpr: root.viewport.dpr, viewport: root.size,
    };
    root.setFrameloop('demand'); return result;
  });
  expect(result.calls).toBeLessThan(30); expect(result.geometries).toBeLessThan(12);
  await testInfo.attach('renderer-benchmark', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  console.log('Renderer benchmark:', JSON.stringify(result));
  expect(errors).toEqual([]);
});


test.describe('retina rendering', () => {
  test.use({ deviceScaleFactor: 2 });
  test('selected-site outline stays within draw budget at the capped DPR', async ({ page }, testInfo) => {
    const errors = await setup(page);
    await click(page, 'site:site-shah-alam', 'site');
    await expect(page.getByRole('heading', { name: 'Shah Alam Distribution Centre', exact: true })).toBeVisible();
    const result = await page.evaluate(async () => {
      const root = window.reviewRoot.get(); root.setFrameloop('always');
      const intervals: number[] = []; let last = performance.now();
      await new Promise<void>(resolve => {
        function frame(time: number) { intervals.push(time - last); last = time;
          if (intervals.length < 180) requestAnimationFrame(frame); else resolve(); }
        requestAnimationFrame(frame);
      });
      const samples = intervals.slice(10).sort((a, b) => a - b);
      const result = { fps: 1000 / (samples.reduce((sum, t) => sum + t, 0) / samples.length),
        p95Ms: samples[Math.floor(samples.length * 0.95)], calls: root.gl.info.render.calls, dpr: root.viewport.dpr };
      root.setFrameloop('demand'); return result;
    });
    expect(result.dpr).toBe(1.5); expect(result.calls).toBeLessThan(30);
    await testInfo.attach('retina-renderer-benchmark', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    console.log('Retina benchmark:', JSON.stringify(result));
    expect(errors).toEqual([]);
  });
});
