import type {
  Dock, Forklift, InventoryItem, Shipment, Site, Truck, WarehouseData,
} from './types';

/** Fixed snapshot: 14 October 2026, 13:00 Malaysia time. No clock-dependent seeds. */
export const SEED_TIMESTAMP = '2026-10-14T05:00:00.000Z';
const timestamp = (minutes: number): string =>
  new Date(Date.parse(SEED_TIMESTAMP) + minutes * 60_000).toISOString();

export const sites: Site[] = [
  {
    id: 'site-shah-alam', name: 'Shah Alam Distribution Centre', code: 'SA',
    address: '18 Jalan Sepadu 25/123, Seksyen 25, 40400 Shah Alam, Selangor',
    timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 3.0258, longitude: 101.5485 },
  },
  {
    id: 'site-penang', name: 'Penang Regional Warehouse', code: 'PG',
    address: '12 Lorong Perusahaan 4, Prai Industrial Estate, 13600 Perai, Penang',
    timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 5.3378, longitude: 100.4051 },
  },
  {
    id: 'site-johor', name: 'Johor Southern Hub', code: 'JH',
    address: '8 Jalan Firma 2, Kawasan Perindustrian Tebrau, 81100 Johor Bahru, Johor',
    timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 1.5483, longitude: 103.7866 },
  },
];

export const docks: Dock[] = sites.flatMap((site) =>
  Array.from({ length: 6 }, (_, index): Dock => ({
    id: `${site.id}-dock-${index + 1}`, siteId: site.id, number: index + 1,
    type: index < 2 ? 'inbound' : index < 4 ? 'outbound' : 'mixed',
    status: 'available', activeShipmentId: null,
  })),
);

const registrations = [
  'BQR 4821', 'PKL 7316', 'JVR 2904', 'BSP 6158', 'PNA 8432', 'JTU 5071',
  'BWN 3269', 'PPF 1946', 'JWD 6823', 'BVE 7590', 'PMR 4187', 'JSH 9352',
];
const drivers = [
  'Ahmad Rahman', 'Tan Wei Ming', 'Suresh Kumar', 'Farid Ismail',
  'Lim Jia Hao', 'Arun Raj', 'Hafiz Osman', 'Wong Kai Seng',
  'Ravi Menon', 'Azlan Yusof', 'Lee Jun Jie', 'Daniel Thomas',
];
const carriers = ['Straits Logistics', 'Northern Freight', 'Southern Haulage'];

export const trucks: Truck[] = registrations.map((registration, index) => ({
  id: `truck-${101 + index}`, registration, carrier: carriers[index % 3],
  driverName: drivers[index], capacityPallets: index % 4 === 0 ? 30 : 26,
  status: 'idle', currentSiteId: null, activeShipmentId: null,
}));

export const forklifts: Forklift[] = Array.from({ length: 8 }, (_, index) => {
  const siteIndex = index < 3 ? 0 : index < 6 ? 1 : 2;
  return {
    id: `forklift-${index + 1}`, siteId: sites[siteIndex].id,
    code: `${sites[siteIndex].code}-FL-${String(index + 1).padStart(2, '0')}`,
    status: index === 4 ? 'charging' : index === 7 ? 'maintenance' : 'idle',
    batteryPercent: index === 4 ? 22 : 94 - index * 7,
    capacityKg: index % 2 === 0 ? 2500 : 3000,
    operatorName: index === 4 || index === 7 ? null : drivers[(index + 4) % drivers.length],
    activeShipmentId: null,
  };
});

const catalog: Array<Pick<InventoryItem, 'sku' | 'name' | 'category' | 'unit'>> = [
  { sku: 'EL-1001', name: 'Wi-Fi 6 Router', category: 'electronics', unit: 'piece' },
  { sku: 'EL-1002', name: '24-Port Network Switch', category: 'electronics', unit: 'piece' },
  { sku: 'EL-1003', name: 'Cat6 Cable 305 m', category: 'electronics', unit: 'carton' },
  { sku: 'EL-1004', name: 'Indoor IP Camera', category: 'electronics', unit: 'piece' },
  { sku: 'AP-2001', name: 'Electric Kettle 1.7 L', category: 'appliances', unit: 'piece' },
  { sku: 'AP-2002', name: 'Rice Cooker 1.8 L', category: 'appliances', unit: 'piece' },
  { sku: 'AP-2003', name: 'Standing Fan 16 inch', category: 'appliances', unit: 'piece' },
  { sku: 'AP-2004', name: 'Air Purifier', category: 'appliances', unit: 'piece' },
  { sku: 'IN-3001', name: 'Safety Gloves, 100 pairs', category: 'industrial', unit: 'carton' },
  { sku: 'IN-3002', name: 'Packing Tape, 36 rolls', category: 'industrial', unit: 'carton' },
  { sku: 'IN-3003', name: 'Stretch Film, 6 rolls', category: 'industrial', unit: 'carton' },
  { sku: 'IN-3004', name: 'Thermal Shipping Labels', category: 'industrial', unit: 'carton' },
  { sku: 'CO-4001', name: 'Laundry Detergent, 12 bottles', category: 'consumer', unit: 'carton' },
  { sku: 'CO-4002', name: 'Tissue Paper, 24 packs', category: 'consumer', unit: 'carton' },
];

export const inventoryItems: InventoryItem[] = Array.from({ length: 40 }, (_, index) => {
  const siteIndex = index < 14 ? 0 : index < 27 ? 1 : 2;
  const localIndex = index - [0, 14, 27][siteIndex];
  return {
    id: `inventory-${String(index + 1).padStart(3, '0')}`,
    siteId: sites[siteIndex].id, ...catalog[localIndex],
    quantityOnHand: 80 + (index * 37) % 420, quantityReserved: 0,
    reorderPoint: 100,
    location: {
      aisle: ['A', 'B', 'C'][Math.floor(localIndex / 5)],
      rack: localIndex % 5 + 1, level: localIndex % 3 + 1, bin: 1,
    },
    updatedAt: timestamp(-15 - index * 3),
  };
});

const counterparts = [
  { name: 'Metro Retail Fulfilment', city: 'Kuala Lumpur' },
  { name: 'Island Electronics Supply', city: 'George Town' },
  { name: 'Southern Home Stores', city: 'Johor Bahru' },
  { name: 'Central Packaging Supply', city: 'Ipoh' },
  { name: 'East Coast Distribution', city: 'Kuantan' },
];

export const shipments: Shipment[] = Array.from({ length: 25 }, (_, index) => {
  const site = sites[index % sites.length];
  const status: Shipment['status'] = index < 3 ? 'loading'
    : index < 7 ? 'in_transit' : index < 12 ? 'scheduled' : 'completed';
  const direction: Shipment['direction'] = index % 2 === 0 ? 'outbound' : 'inbound';
  const siteItems = inventoryItems.filter((item) => item.siteId === site.id);
  const lines = [0, 1].map((offset) => ({
    inventoryItemId: siteItems[(index * 2 + offset) % siteItems.length].id,
    quantity: 12 + (index * 7 + offset * 5) % 36,
  }));
  const arrivalMinutes = status === 'completed' ? -360 - (index - 12) * 50
    : status === 'loading' ? -40 - index * 10
    : status === 'in_transit' ? 20 + (index - 3) * 25
    : 150 + (index - 7) * 35;
  const palletCount = 12 + index % 14;
  const dockNumber = direction === 'inbound' ? 1 + index % 2 : 3 + index % 2;
  return {
    id: `shipment-${String(index + 1).padStart(3, '0')}`,
    reference: `WT-261014-${String(index + 1).padStart(3, '0')}`,
    siteId: site.id, truckId: trucks[index % trucks.length].id,
    dockId: status === 'in_transit' ? null : `${site.id}-dock-${dockNumber}`,
    direction, status, counterpart: counterparts[index % counterparts.length], lines,
    palletCount, palletsHandled: status === 'completed' ? palletCount
      : status === 'loading' ? 7 + index * 2 : 0,
    etaArrival: timestamp(arrivalMinutes), etaDeparture: timestamp(arrivalMinutes + 100),
    actualArrival: status === 'completed' || status === 'loading'
      ? timestamp(arrivalMinutes - 5) : null,
    completedAt: status === 'completed' ? timestamp(arrivalMinutes + 85) : null,
  };
});

// Link current operations in both directions; completed shipments retain history only.
for (const shipment of shipments) {
  if (shipment.status === 'completed') continue;
  const truck = trucks.find((candidate) => candidate.id === shipment.truckId)!;
  truck.status = shipment.status;
  truck.activeShipmentId = shipment.id;
  truck.currentSiteId = shipment.status === 'loading' ? shipment.siteId : null;

  if (shipment.status === 'loading') {
    const dock = docks.find((candidate) => candidate.id === shipment.dockId)!;
    dock.status = 'occupied';
    dock.activeShipmentId = shipment.id;
    const forklift = forklifts.find((candidate) =>
      candidate.siteId === shipment.siteId && candidate.status === 'idle')!;
    forklift.status = 'working';
    forklift.activeShipmentId = shipment.id;
  }

  // On-hand includes reserved stock. Inbound receipts add stock only on completion.
  if (shipment.direction === 'outbound') {
    for (const line of shipment.lines) {
      const item = inventoryItems.find((candidate) => candidate.id === line.inventoryItemId)!;
      item.quantityReserved += line.quantity;
    }
  }
}

export const seedData: WarehouseData = { sites, docks, trucks, forklifts, inventoryItems, shipments };
