import type { WarehouseData } from '../data';

export const MAP_HALF_SIZE = 72;
export const ELEVATION = Math.atan(1 / Math.sqrt(2));
export const DOCK_Z = 8;
export const dockX = (number: number) => (number - 3.5) * 7;
export const rackPosition = (aisle: string, rack: number): [number, number, number] =>
  [-19 + (aisle.charCodeAt(0) - 65) * 14, 0, -27 + (rack - 1) * 5];

/** Derive physical placement without altering or decorating source records. */
export function getSiteLayout(data: WarehouseData, siteId: string) {
  const docks = data.docks.filter(d => d.siteId === siteId);
  const trucks = data.trucks.filter(t => t.currentSiteId === siteId).map((truck, i) => {
    const shipment = data.shipments.find(s => s.id === truck.activeShipmentId);
    const dock = docks.find(d => d.id === shipment?.dockId);
    return { truck, position: [dock ? dockX(dock.number) : -20 + i * 7, 0, dock ? 15 : 32] as [number, number, number] };
  });
  const forklifts = data.forklifts.filter(f => f.siteId === siteId).map((forklift, i) => {
    const shipment = data.shipments.find(s => s.id === forklift.activeShipmentId);
    const dock = docks.find(d => d.id === shipment?.dockId);
    return { forklift, position: [dock ? dockX(dock.number) : -11 + i * 7, 0, dock ? 2 : -5] as [number, number, number] };
  });
  const racks = new Map<string, { aisle: string; rack: number; items: WarehouseData['inventoryItems'] }>();
  for (const item of data.inventoryItems.filter(item => item.siteId === siteId)) {
    const key = `${item.location.aisle}-${item.location.rack}`;
    const rack = racks.get(key) ?? { aisle: item.location.aisle, rack: item.location.rack, items: [] };
    rack.items.push(item);
    racks.set(key, rack);
  }
  return { docks, trucks, forklifts, racks: [...racks.values()] };
}

/** Ground-plane footprint of a fixed 45° azimuth orthographic camera. */
export function cameraLimits(width: number, height: number, zoom: number) {
  const minimumZoom = (width + height / Math.sin(ELEVATION)) / (2 * Math.SQRT2 * (MAP_HALF_SIZE - 1));
  const effectiveZoom = Math.max(zoom, minimumZoom);
  const extent = (width + height / Math.sin(ELEVATION)) / (2 * Math.SQRT2 * effectiveZoom);
  return { minimumZoom, maxTarget: Math.max(0, MAP_HALF_SIZE - extent - 0.5) };
}
