/** All timestamps are ISO 8601 UTC strings; quantities count whole stock units. */
export type Timestamp = string;
export type SiteId = string;
export type DockId = string;
export type TruckId = string;
export type ForkliftId = string;
export type InventoryItemId = string;
export type ShipmentId = string;

export interface Site {
  id: SiteId;
  name: string;
  code: string;
  address: string;
  timezone: string;
  coordinates: { latitude: number; longitude: number };
}

export interface Dock {
  id: DockId;
  siteId: SiteId;
  number: number;
  type: 'inbound' | 'outbound' | 'mixed';
  status: 'available' | 'occupied' | 'maintenance';
  /** Current loading operation only; historic assignments live on Shipment. */
  activeShipmentId: ShipmentId | null;
}

export interface Truck {
  id: TruckId;
  registration: string;
  carrier: string;
  driverName: string;
  capacityPallets: number;
  status: 'scheduled' | 'in_transit' | 'loading' | 'idle' | 'maintenance';
  /** Null when off-site; a scheduled truck has not yet arrived. */
  currentSiteId: SiteId | null;
  activeShipmentId: ShipmentId | null;
}

export interface Forklift {
  id: ForkliftId;
  siteId: SiteId;
  code: string;
  status: 'idle' | 'working' | 'charging' | 'maintenance';
  batteryPercent: number;
  capacityKg: number;
  operatorName: string | null;
  activeShipmentId: ShipmentId | null;
}

/** A stock record for one SKU at one site and storage location. */
export interface InventoryItem {
  id: InventoryItemId;
  siteId: SiteId;
  sku: string;
  name: string;
  category: 'electronics' | 'appliances' | 'industrial' | 'consumer';
  unit: 'piece' | 'carton';
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number;
  location: { aisle: string; rack: number; level: number; bin: number };
  updatedAt: Timestamp;
}

export interface ShipmentLine {
  inventoryItemId: InventoryItemId;
  quantity: number;
}

export interface Shipment {
  id: ShipmentId;
  reference: string;
  /** The warehouse handling this movement; counterpart is an external location. */
  siteId: SiteId;
  truckId: TruckId;
  /** Null until a compatible dock has been assigned. */
  dockId: DockId | null;
  direction: 'inbound' | 'outbound';
  status: 'scheduled' | 'in_transit' | 'loading' | 'completed';
  counterpart: { name: string; city: string };
  lines: ShipmentLine[];
  palletCount: number;
  palletsHandled: number;
  etaArrival: Timestamp;
  etaDeparture: Timestamp;
  actualArrival: Timestamp | null;
  completedAt: Timestamp | null;
}

export interface WarehouseData {
  sites: Site[];
  docks: Dock[];
  trucks: Truck[];
  forklifts: Forklift[];
  inventoryItems: InventoryItem[];
  shipments: Shipment[];
}
