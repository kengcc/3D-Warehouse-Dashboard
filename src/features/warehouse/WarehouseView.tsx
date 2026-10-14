import { useCallback, useMemo } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { WarehouseScene } from '../../scene/WarehouseScene';
import { getSiteLayout } from '../../scene/layout';
import { objectKey, rackId, warehouseStore } from '../../store/warehouseStore';
import type { ObjectRef } from '../../store/warehouseStore';
import { getFilteredShipments } from '../../store/selectors';

export function WarehouseView() {
  const { data, selected, activeSiteId, visibility } = useStore(warehouseStore, useShallow(s => ({
    data: s.data, selected: s.selected, activeSiteId: s.activeSiteId,
    // Only geometry visibility changes should wake the scene, not telemetry timestamps.
    visibility: s.filters.delayedOnly || s.filters.truckStatus !== 'all'
      ? s.data.sites.flatMap(site => getFilteredShipments(s, site.id).map(shipment => shipment.id)).join('|') : null,
  })));
  const layouts = useMemo(() => data.sites.map((site, index) => ({
    site, position: [index * 180, 0, 0] as [number, number, number],
    layout: getSiteLayout(data, site.id),
    rackKeys: Object.fromEntries(data.inventoryItems.filter(i => i.siteId === site.id).map(i =>
      [`${i.location.aisle}-${i.location.rack}`, objectKey({ kind: 'rack', id: rackId(site.id, i.location.aisle, i.location.rack) })])),
  })), [data]);
  const visibleLayouts = useMemo(() => {
    if (visibility === null) return layouts;
    const ids = new Set(visibility.split('|'));
    return layouts.map(w => ({ ...w, layout: {
      ...w.layout,
      trucks: w.layout.trucks.filter(e => e.truck.activeShipmentId && ids.has(e.truck.activeShipmentId)),
      forklifts: w.layout.forklifts.filter(e => e.forklift.activeShipmentId && ids.has(e.forklift.activeShipmentId)),
    } }));
  }, [layouts, visibility]);
  const onSelect = useCallback((key: string) => {
    const colon = key.indexOf(':');
    warehouseStore.getState().select({ kind: key.slice(0, colon) as ObjectRef['kind'], id: key.slice(colon + 1) });
  }, []);
  const warehouses = useMemo(() => visibleLayouts.map(w => ({
    position: w.position, layout: w.layout,
    selection: { selectedKey: selected ? objectKey(selected) : null,
      siteKey: objectKey({ kind: 'site', id: w.site.id }), rackKeys: w.rackKeys, onSelect },
  })), [visibleLayouts, selected, onSelect]);
  const index = Math.max(0, data.sites.findIndex(s => s.id === activeSiteId));
  return <WarehouseScene warehouses={warehouses} cameraTarget={layouts[index]?.position ?? [0, 0, 0]} />;
}
