import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { WarehouseScene } from '../../scene/WarehouseScene';
import { getSiteLayout } from '../../scene/layout';
import { objectKey, rackId, warehouseStore } from '../../store/warehouseStore';
import type { ObjectRef } from '../../store/warehouseStore';
import { getFilteredShipments } from '../../store/selectors';

export function WarehouseView() {
  const state = useStore(warehouseStore);
  const layouts = useMemo(() => state.data.sites.map((site, index) => ({
    site, position: [index * 180, 0, 0] as [number, number, number],
    layout: getSiteLayout(state.data, site.id),
  })), [state.data]);
  const warehouses = layouts.map(({ site, position, layout }) => {
    const shipments = getFilteredShipments(state, site.id);
    const ids = new Set(shipments.map(s => s.id));
    const filtered = state.filters.delayedOnly || state.filters.truckStatus !== 'all';
    return {
      position, layout: {
        ...layout,
        trucks: filtered ? layout.trucks.filter(e => e.truck.activeShipmentId && ids.has(e.truck.activeShipmentId)) : layout.trucks,
        forklifts: filtered ? layout.forklifts.filter(e => e.forklift.activeShipmentId && ids.has(e.forklift.activeShipmentId)) : layout.forklifts,
      },
      selection: {
        selectedKey: state.selected ? objectKey(state.selected) : null,
        siteKey: objectKey({ kind: 'site', id: site.id }),
        rackKeys: Object.fromEntries(layout.racks.map(r => [`${r.aisle}-${r.rack}`, objectKey({ kind: 'rack', id: rackId(site.id, r.aisle, r.rack) })])),
        onSelect: (key: string) => {
          const colon = key.indexOf(':');
          state.select({ kind: key.slice(0, colon) as ObjectRef['kind'], id: key.slice(colon + 1) });
        },
      },
    };
  });
  // A telemetry change can remove a selected vehicle from a status-filtered view.
  useEffect(() => {
    if (!state.selected || !(state.filters.delayedOnly || state.filters.truckStatus !== 'all')) return;
    const shipments = getFilteredShipments(state);
    if (state.selected.kind === 'truck' && !shipments.some(s => s.truckId === state.selected!.id)) state.select(null);
    if (state.selected.kind === 'forklift') {
      const forklift = state.data.forklifts.find(f => f.id === state.selected!.id);
      if (!shipments.some(s => s.id === forklift?.activeShipmentId)) state.select(null);
    }
  }, [state.selected, state.filters, state.live, state.operationalTime, state.activeSiteId, state.data, state.select]);
  const index = Math.max(0, state.data.sites.findIndex(s => s.id === state.activeSiteId));
  return <WarehouseScene warehouses={warehouses} cameraTarget={layouts[index]?.position ?? [0, 0, 0]} />;
}
