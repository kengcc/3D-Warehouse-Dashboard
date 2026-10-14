import { createStore } from 'zustand/vanilla';
import { seedData, SEED_TIMESTAMP } from '../data';
import type { Shipment, WarehouseData } from '../data';

export type ObjectKind = 'site' | 'dock' | 'truck' | 'forklift' | 'rack' | 'inventory';
export interface ObjectRef { kind: ObjectKind; id: string }
export interface LiveStatus { state: string; updatedAt: string }
export interface ObjectDetails extends LiveStatus {
  ref: ObjectRef; name: string; siteId: string | null; shipments: Shipment[];
}
export const objectKey = (ref: ObjectRef) => `${ref.kind}:${ref.id}`;
export const rackId = (siteId: string, aisle: string, rack: number) => `${siteId}/${aisle}/${rack}`;

export interface WarehouseStore {
  data: WarehouseData;
  selected: ObjectRef | null;
  live: Record<string, LiveStatus>;
  tick: number;
  activeSiteId: string;
  operationalTime: string;
  filters: { delayedOnly: boolean; truckStatus: string };
  setSite: (siteId: string) => void;
  setFilters: (filters: Partial<WarehouseStore['filters']>) => void;
  select: (ref: ObjectRef | null) => void;
  advance: (updatedAt: string) => void;
}

export function createWarehouseStore(data: WarehouseData = seedData) {
  const live: Record<string, LiveStatus> = {};
  const add = (kind: ObjectKind, id: string, state: string, updatedAt = SEED_TIMESTAMP) => {
    live[objectKey({ kind, id })] = { state, updatedAt };
  };
  data.sites.forEach(s => add('site', s.id, 'operational'));
  data.docks.forEach(d => add('dock', d.id, d.status));
  data.trucks.forEach(t => add('truck', t.id, t.status));
  data.forklifts.forEach(f => add('forklift', f.id, f.status));
  data.inventoryItems.forEach(i => {
    add('inventory', i.id, i.quantityOnHand - i.quantityReserved < i.reorderPoint ? 'low_stock' : 'in_stock', i.updatedAt);
    const id = rackId(i.siteId, i.location.aisle, i.location.rack);
    const previous = live[objectKey({ kind: 'rack', id })];
    add('rack', id, 'stocked', previous && previous.updatedAt > i.updatedAt ? previous.updatedAt : i.updatedAt);
  });
  return createStore<WarehouseStore>()((set, get) => ({
    data, selected: null, live, tick: 0,
    activeSiteId: data.sites[0]?.id ?? '', operationalTime: SEED_TIMESTAMP,
    filters: { delayedOnly: false, truckStatus: 'all' },
    setSite: activeSiteId => {
      if (get().data.sites.some(s => s.id === activeSiteId)) set({ activeSiteId, selected: null });
    },
    setFilters: filters => set(state => ({ filters: { ...state.filters, ...filters }, selected: null })),
    select: ref => { if (!ref || get().live[objectKey(ref)]) set({ selected: ref }); },
    advance: updatedAt => set(state => {
      const next = { ...state.live };
      // Telemetry phases are separate from shipment lifecycle and physical placement.
      // Existing assignments remain valid while a vehicle waits or is inspected.
      for (const truck of state.data.trucks) {
        const phases = truck.currentSiteId ? ['waiting', 'inspection', 'loading']
          : truck.status === 'in_transit' ? ['traffic_delay', 'in_transit']
          : ['driver_check', 'scheduled'];
        next[objectKey({ kind: 'truck', id: truck.id })] = {
          state: phases[state.tick % phases.length], updatedAt,
        };
      }
      for (const forklift of state.data.forklifts) {
        const phases = forklift.status === 'maintenance' ? ['inspection', 'maintenance']
          : forklift.status === 'charging' ? ['battery_check', 'charging']
          : forklift.activeShipmentId ? ['waiting', 'working', 'positioning']
          : ['repositioning', 'idle'];
        next[objectKey({ kind: 'forklift', id: forklift.id })] = {
          state: phases[state.tick % phases.length], updatedAt,
        };
      }
      return { live: next, tick: state.tick + 1,
        operationalTime: new Date(Date.parse(state.operationalTime) + 2000).toISOString() };
    }),
  }));
}

export const warehouseStore = createWarehouseStore();

/** Resolve status and relationships in the application layer, never in 3D components. */
export function getObjectDetails(state: WarehouseStore, ref: ObjectRef | null): ObjectDetails | null {
  if (!ref) return null;
  const status = state.live[objectKey(ref)];
  if (!status) return null;
  const { data } = state;
  let name = ''; let siteId: string | null = null; let ids: string[] = [];
  const active = data.shipments.filter(s => s.status !== 'completed');
  switch (ref.kind) {
    case 'site': {
      const site = data.sites.find(s => s.id === ref.id)!;
      name = site.name; siteId = site.id; ids = active.filter(s => s.siteId === siteId).map(s => s.id); break;
    }
    case 'dock': {
      const dock = data.docks.find(d => d.id === ref.id)!;
      name = `Dock ${String(dock.number).padStart(2, '0')}`; siteId = dock.siteId;
      ids = dock.activeShipmentId ? [dock.activeShipmentId] : []; break;
    }
    case 'truck': {
      const truck = data.trucks.find(t => t.id === ref.id)!;
      name = `${truck.id.toUpperCase()} · ${truck.registration}`; siteId = truck.currentSiteId;
      ids = truck.activeShipmentId ? [truck.activeShipmentId] : []; break;
    }
    case 'forklift': {
      const forklift = data.forklifts.find(f => f.id === ref.id)!;
      name = forklift.code; siteId = forklift.siteId;
      ids = forklift.activeShipmentId ? [forklift.activeShipmentId] : []; break;
    }
    case 'rack':
    case 'inventory': {
      const items = data.inventoryItems.filter(i => ref.kind === 'inventory' ? i.id === ref.id
        : rackId(i.siteId, i.location.aisle, i.location.rack) === ref.id);
      const item = items[0]; if (!item) return null;
      name = ref.kind === 'inventory' ? `${item.name} · ${item.sku}` : `Shelving ${item.location.aisle}${item.location.rack}`;
      siteId = item.siteId;
      ids = active.filter(s => s.lines.some(l => items.some(i => i.id === l.inventoryItemId))).map(s => s.id); break;
    }
  }
  return { ref, name, siteId, ...status, shipments: data.shipments.filter(s => ids.includes(s.id)) };
}
