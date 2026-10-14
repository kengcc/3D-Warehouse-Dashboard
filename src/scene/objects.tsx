import { ObjectOutline, Selectable } from './Selectable';
import type { Dock, Forklift, InventoryItem, Truck } from '../data';
import { dockX, DOCK_Z, rackPosition } from './layout';

type Vec3 = [number, number, number];
export function Box({ position, size, color, emissive, opacity = 1 }: {
  position: Vec3; size: Vec3; color: string; emissive?: string; opacity?: number;
}) {
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.78} metalness={0.12}
      emissive={emissive} emissiveIntensity={emissive ? 0.65 : 0}
      transparent={opacity < 1} opacity={opacity} />
    <ObjectOutline />
  </mesh>;
}

function Wheel({ position, radius = 0.42 }: { position: Vec3; radius?: number }) {
  return <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
    <cylinderGeometry args={[radius, radius, 0.3, 10]} />
    <meshStandardMaterial color="#172027" roughness={0.9} />
    <ObjectOutline />
  </mesh>;
}

export function DockModel({ dock }: { dock: Dock }) {
  const active = dock.status === 'occupied';
  return <group position={[dockX(dock.number), 0, DOCK_Z]} name={dock.id} userData={{ dockId: dock.id }}>
    <Box position={[0, 2.7, 0]} size={[5.7, 5.4, 0.55]} color="#34424a" />
    <Box position={[0, 2.15, 0.32]} size={[4.2, 4.3, 0.1]} color={active ? '#19272a' : '#4b5a60'} />
    {[0.8, 1.5, 2.2, 2.9, 3.6].map(y => <Box key={y} position={[0, y, 0.41]} size={[4.1, 0.035, 0.03]} color="#657279" />)}
    <Box position={[0, 0.25, 0.8]} size={[4.7, 0.5, 1.5]} color="#5e686c" />
    {[-2.4, 2.4].map(x => <group key={x}>
      <Box position={[x, 2.2, 0.4]} size={[0.16, 4.4, 0.25]} color={active ? '#ffb43c' : '#222e35'} />
      <Box position={[x, 0.7, 1.4]} size={[0.2, 1.4, 0.2]} color="#e7aa43" />
    </group>)}
    <Box position={[2.65, 3.6, 0.45]} size={[0.16, 0.3, 0.12]} color={active ? '#ffb43c' : '#6bcda1'} emissive={active ? '#ffb43c' : '#3c9f71'} />
    <Box position={[0, 4.85, 0.4]} size={[1.1, 0.45, 0.15]} color="#18262d" />
  </group>;
}

export function TruckModel({ truck, position }: { truck: Truck; position: Vec3 }) {
  return <group position={position} name={truck.id} userData={{ truckId: truck.id }}>
    <Box position={[0, 1.7, -1.8]} size={[3.1, 2.7, 9.6]} color="#d6d8d2" />
    <Box position={[0, 0.65, 0]} size={[2.7, 0.35, 12]} color="#29343b" />
    <Box position={[0, 1.45, 4.5]} size={[3.15, 2.3, 2.6]} color="#d6a04f" />
    <Box position={[0, 2, 5.82]} size={[2.65, 0.85, 0.05]} color="#2a4753" />
    <Box position={[0, 0.8, 5.85]} size={[3.2, 0.25, 0.15]} color="#69777f" />
    {[-1.55, 1.55].flatMap(x => [-4.6, -3.3, 4.5].map(z => <Wheel key={`${x}-${z}`} position={[x, 0.55, z]} radius={0.55} />))}
    {[-1.12, 1.12].map(x => <Box key={x} position={[x, 1.1, 5.85]} size={[0.45, 0.2, 0.1]} color="#ffe2a0" emissive="#ffd077" />)}

  </group>;
}

export function ForkliftModel({ forklift, position }: { forklift: Forklift; position: Vec3 }) {
  const color = forklift.status === 'maintenance' ? '#717c82' : '#e9a23a';
  return <group position={position} name={forklift.id} userData={{ forkliftId: forklift.id }}>
    <Box position={[0, 0.75, 0]} size={[1.5, 1, 2.2]} color={color} />
    <Box position={[0, 1.35, 0.35]} size={[0.8, 0.35, 0.6]} color="#213039" />
    {[-0.63, 0.63].flatMap(x => [-0.7, 0.65].map(z => <Wheel key={`${x}-${z}`} position={[x, 0.38, z]} radius={0.38} />))}
    {[-0.64, 0.64].map(x => <Box key={x} position={[x, 1.75, 0.5]} size={[0.1, 1.9, 0.1]} color="#27353c" />)}
    <Box position={[0, 2.75, 0.35]} size={[1.6, 0.15, 1.65]} color={color} />
    {[-0.45, 0.45].map(x => <group key={x}>
      <Box position={[x, 1.4, -1.15]} size={[0.16, 2.5, 0.18]} color="#33434b" />
      <Box position={[x, 0.3, -1.8]} size={[0.18, 0.12, 1.6]} color="#70808a" />
    </group>)}
    {forklift.status === 'working' && <Box position={[0, 0.9, -1.8]} size={[1.4, 1.1, 1.2]} color="#bd9665" />}
  </group>;
}

export function ShelfModel({ aisle, rack, items, selectedKey, onSelect }: {
  aisle: string; rack: number; items: InventoryItem[]; selectedKey: string | null; onSelect: (key: string) => void;
}) {
  return <group position={rackPosition(aisle, rack)} name={`rack-${aisle}-${rack}`}>
    {[-2.1, 2.1].flatMap(x => [-1.5, 1.5].map(z => <Box key={`${x}-${z}`} position={[x, 3.1, z]} size={[0.15, 6.2, 0.15]} color="#364650" />))}
    {[0.25, 2.2, 4.15, 6.1].map(y => <group key={y}>
      <Box position={[0, y, 0]} size={[4.4, 0.12, 3.2]} color="#5b6361" />
      <Box position={[0, y, 1.55]} size={[4.5, 0.18, 0.13]} color="#df9636" />
    </group>)}
    {items.filter(item => item.quantityOnHand > 0).map(item => {
      const y = 0.38 + (item.location.level - 1) * 1.95;
      const cartons = Math.min(4, Math.ceil(item.quantityOnHand / 100));
      return <Selectable key={item.id} id={`inventory:${item.id}`} selected={selectedKey === `inventory:${item.id}`} onSelect={() => onSelect(`inventory:${item.id}`)}>
        <group position={[0, y, 0]} userData={{ inventoryItemId: item.id }}>
        <Box position={[0, 0.08, 0]} size={[3.8, 0.16, 2.7]} color="#8b704a" />
        {Array.from({ length: cartons }, (_, i) => <group key={i}>
          <Box position={[-0.96 + (i % 2) * 1.9, 0.8, 0.66 - Math.floor(i / 2) * 1.32]} size={[1.75, 1.3, 1.15]} color={item.category === 'electronics' ? '#b9b8ac' : '#bd976b'} />
          <Box position={[-0.96 + (i % 2) * 1.9, 0.8, 1.245 - Math.floor(i / 2) * 1.32]} size={[0.45, 0.3, 0.015]} color="#e4dcc7" />
        </group>)}
        </group>
      </Selectable>;
    })}
  </group>;
}
