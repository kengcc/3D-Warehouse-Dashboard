import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { DOCK_Z, MAP_HALF_SIZE, dockX, rackPosition } from './layout';
import type { getSiteLayout } from './layout';

export type Vec3 = [number, number, number];
export interface Part {
  key: string;
  rackKey?: string;
  position: Vec3;
  size: Vec3;
  kind: 'box' | 'wheel';
  color: string;
  emissive?: string;
  castShadow: boolean;
}
export interface GeometryLayout { parts: Part[]; labels: { key: string; number: number; position: Vec3 }[] }

/** Pure visual description. One part is one instance, rather than one scene node. */
export function warehouseGeometry(layout: ReturnType<typeof getSiteLayout>, siteKey: string, rackKeys: Record<string, string>): GeometryLayout {
  const parts: Part[] = [];
  const add = (key: string, position: Vec3, size: Vec3, color: string, options: Partial<Part> = {}) => {
    parts.push({ key, position, size, color, kind: 'box', castShadow: true, ...options });
  };
  const at = (origin: Vec3, local: Vec3): Vec3 => [origin[0] + local[0], origin[1] + local[1], origin[2] + local[2]];
  const wheel = (key: string, position: Vec3, radius: number) =>
    add(key, position, [radius * 2, 0.3, radius * 2], '#172027', { kind: 'wheel' });
  const flat = { castShadow: false };
  add(siteKey, [0, -0.25, 0], [MAP_HALF_SIZE * 2, 0.5, MAP_HALF_SIZE * 2], '#303e44', flat);
  add(siteKey, [0, 0.04, -12], [49, 0.08, 42], '#677577', flat);
  add(siteKey, [0, 3.2, -33], [50, 6.4, 0.5], '#3c4b52');
  add(siteKey, [-25, 1.1, -12], [0.5, 2.2, 42], '#43525a');
  add(siteKey, [25, 1.1, -12], [0.5, 2.2, 42], '#43525a');
  add(siteKey, [0, 0.12, 8], [50, 0.24, 0.5], '#a0a59a', flat);
  for (const dock of layout.docks) {
    const key = `dock:${dock.id}`;
    const origin: Vec3 = [dockX(dock.number), 0, DOCK_Z];
    const box = (position: Vec3, size: Vec3, color: string, options?: Partial<Part>) => add(key, at(origin, position), size, color, options);
    const active = dock.status === 'occupied';
    box([0, 2.7, 0], [5.7, 5.4, 0.55], '#34424a');
    box([0, 2.15, 0.32], [4.2, 4.3, 0.1], active ? '#19272a' : '#4b5a60');
    for (const y of [0.8, 1.5, 2.2, 2.9, 3.6]) box([0, y, 0.41], [4.1, 0.035, 0.03], '#657279');
    box([0, 0.25, 0.8], [4.7, 0.5, 1.5], '#5e686c');
    for (const x of [-2.4, 2.4]) {
      box([x, 2.2, 0.4], [0.16, 4.4, 0.25], active ? '#ffb43c' : '#222e35');
      box([x, 0.7, 1.4], [0.2, 1.4, 0.2], '#e7aa43');
    }
    box([2.65, 3.6, 0.45], [0.16, 0.3, 0.12], active ? '#ffb43c' : '#6bcda1', { emissive: active ? '#ffb43c' : '#3c9f71' });
    box([0, 4.85, 0.4], [1.1, 0.45, 0.15], '#18262d');
    for (const offset of [-2.8, 2.8]) add(key, [origin[0] + offset, 0.035, 19], [0.06, 0.02, 19], '#b29152', flat);
    add(key, [origin[0], 0.035, 28.5], [5.6, 0.02, 0.06], '#b29152', flat);
  }
  for (const rack of layout.racks) {
    const key = rackKeys[`${rack.aisle}-${rack.rack}`];
    const origin = rackPosition(rack.aisle, rack.rack);
    const box = (position: Vec3, size: Vec3, color: string) => add(key, at(origin, position), size, color);
    for (const x of [-2.1, 2.1]) for (const z of [-1.5, 1.5]) box([x, 3.1, z], [0.15, 6.2, 0.15], '#364650');
    for (const y of [0.25, 2.2, 4.15, 6.1]) {
      box([0, y, 0], [4.4, 0.12, 3.2], '#5b6361');
      box([0, y, 1.55], [4.5, 0.18, 0.13], '#df9636');
    }
    for (const item of rack.items) {
      if (item.quantityOnHand <= 0) continue;
      const itemKey = `inventory:${item.id}`;
      const base = at(origin, [0, 0.38 + (item.location.level - 1) * 1.95, 0]);
      const carton = (position: Vec3, size: Vec3, color: string) => add(itemKey, at(base, position), size, color, { rackKey: key });
      carton([0, 0.08, 0], [3.8, 0.16, 2.7], '#8b704a');
      for (let i = 0; i < Math.min(4, Math.ceil(item.quantityOnHand / 100)); i++) {
        const x = -0.96 + (i % 2) * 1.9;
        carton([x, 0.8, 0.66 - Math.floor(i / 2) * 1.32], [1.75, 1.3, 1.15], item.category === 'electronics' ? '#b9b8ac' : '#bd976b');
        carton([x, 0.8, 1.245 - Math.floor(i / 2) * 1.32], [0.45, 0.3, 0.015], '#e4dcc7');
      }
    }
  }
  for (const { truck, position } of layout.trucks) {
    const key = `truck:${truck.id}`;
    const box = (local: Vec3, size: Vec3, color: string, emissive?: string) => add(key, at(position, local), size, color, { emissive });
    box([0, 1.7, -1.8], [3.1, 2.7, 9.6], '#d6d8d2');
    box([0, 0.65, 0], [2.7, 0.35, 12], '#29343b');
    box([0, 1.45, 4.5], [3.15, 2.3, 2.6], '#d6a04f');
    box([0, 2, 5.82], [2.65, 0.85, 0.05], '#2a4753');
    box([0, 0.8, 5.85], [3.2, 0.25, 0.15], '#69777f');
    for (const x of [-1.55, 1.55]) for (const z of [-4.6, -3.3, 4.5]) wheel(key, at(position, [x, 0.55, z]), 0.55);
    for (const x of [-1.12, 1.12]) box([x, 1.1, 5.85], [0.45, 0.2, 0.1], '#ffe2a0', '#ffd077');
  }
  for (const { forklift, position } of layout.forklifts) {
    const key = `forklift:${forklift.id}`;
    const color = forklift.status === 'maintenance' ? '#717c82' : '#e9a23a';
    const box = (local: Vec3, size: Vec3, c: string) => add(key, at(position, local), size, c);
    box([0, 0.75, 0], [1.5, 1, 2.2], color);
    box([0, 1.35, 0.35], [0.8, 0.35, 0.6], '#213039');
    for (const x of [-0.63, 0.63]) for (const z of [-0.7, 0.65]) wheel(key, at(position, [x, 0.38, z]), 0.38);
    for (const x of [-0.64, 0.64]) box([x, 1.75, 0.5], [0.1, 1.9, 0.1], '#27353c');
    box([0, 2.75, 0.35], [1.6, 0.15, 1.65], color);
    for (const x of [-0.45, 0.45]) {
      box([x, 1.4, -1.15], [0.16, 2.5, 0.18], '#33434b');
      box([x, 0.3, -1.8], [0.18, 0.12, 1.6], '#70808a');
    }
    if (forklift.status === 'working') box([0, 0.9, -1.8], [1.4, 1.1, 1.2], '#bd9665');
  }
  for (let i = 0; i < 13; i++) add(siteKey, [-30 + i * 5, 0.035, 35], [2.5, 0.025, 0.13], '#afb5a8', flat);
  for (const side of [-1, 1]) {
    add(siteKey, [0, 0.04, side * (MAP_HALF_SIZE - 0.5)], [MAP_HALF_SIZE * 2 - 1, 0.08, 0.15], '#b98b40', flat);
    add(siteKey, [side * (MAP_HALF_SIZE - 0.5), 0.04, 0], [0.15, 0.08, MAP_HALF_SIZE * 2 - 1], '#b98b40', flat);
  }
  return { parts, labels: layout.docks.map(d => ({ key: `dock:${d.id}`, number: d.number, position: [dockX(d.number), 4.85, DOCK_Z + 0.6] })) };
}

export function groupParts(parts: Part[]) {
  const groups = new Map<string, Part[]>();
  for (const part of parts) {
    const key = `${part.kind}:${part.emissive ?? 'lit'}:${part.castShadow}`;
    const group = groups.get(key) ?? [];
    group.push(part); groups.set(key, group);
  }
  return [...groups.values()];
}

export function selectedParts(parts: Part[], selectedKey: string | null, siteKey: string) {
  return selectedKey ? parts.filter(p => selectedKey === siteKey || p.key === selectedKey || p.rackKey === selectedKey) : [];
}

export function partMatrices(parts: Part[]) {
  const buffer = new Float32Array(parts.length * 16);
  const matrix = new Matrix4(), position = new Vector3(), scale = new Vector3();
  const wheelRotation = new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 2));
  const identity = new Quaternion();
  parts.forEach((part, i) => {
    matrix.compose(position.fromArray(part.position), part.kind === 'wheel' ? wheelRotation : identity, scale.fromArray(part.size));
    matrix.toArray(buffer, i * 16);
  });
  return buffer;
}

