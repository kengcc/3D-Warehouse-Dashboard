import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { CanvasTexture, DirectionalLight, Object3D, PCFSoftShadowMap } from 'three';
import type { MapControls } from 'three-stdlib';
import { StrategyCamera } from './StrategyCamera';
import { Box, DockModel, ForkliftModel, ShelfModel, TruckModel } from './objects';
import { dockX, DOCK_Z, MAP_HALF_SIZE } from './layout';
import type { getSiteLayout } from './layout';
import { ObjectOutline, Selectable } from './Selectable';

export interface SceneSelection {
  selectedKey: string | null; siteKey: string; rackKeys: Record<string, string>; onSelect: (key: string) => void;
}
type SiteLayout = ReturnType<typeof getSiteLayout>;
export interface WarehousePresentation { position: [number, number, number]; layout: SiteLayout; selection: SceneSelection }

function CampusLight() {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const controls = useThree(s => s.controls) as MapControls | null;
  useFrame(() => {
    if (!light.current || !controls) return;
    target.position.copy(controls.target);
    light.current.position.set(target.position.x - 25, 55, target.position.z + 20);
    target.updateMatrixWorld();
  });
  return <>
    <primitive object={target} />
    <directionalLight ref={light} target={target} position={[-25, 55, 20]} intensity={3} color="#ffe4b9" castShadow
      shadow-mapSize={[2048, 2048]} shadow-camera-left={-65} shadow-camera-right={65}
      shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-near={1} shadow-camera-far={150}
      shadow-bias={-0.0003} shadow-normalBias={0.04} shadow-radius={3} />
  </>;
}

function DockNumber({ number, x }: { number: number; x: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#18262d'; context.fillRect(0, 0, 128, 64);
    context.fillStyle = '#e2e6df'; context.font = '600 46px system-ui';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(String(number).padStart(2, '0'), 64, 34);
    return new CanvasTexture(canvas);
  }, [number]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[x, 4.85, DOCK_Z + 0.6]}>
    <planeGeometry args={[1.1, 0.55]} /><meshBasicMaterial map={texture} />
    <ObjectOutline />
  </mesh>;
}

function Warehouse({ layout, selection }: { layout: SiteLayout; selection: SceneSelection }) {
  const { selectedKey, siteKey, rackKeys, onSelect } = selection;
  return <Selectable id={siteKey} selected={selectedKey === siteKey} onSelect={() => onSelect(siteKey)}>
    <Box position={[0, -0.25, 0]} size={[MAP_HALF_SIZE * 2, 0.5, MAP_HALF_SIZE * 2]} color="#303e44" />
    <Grid position={[0, 0.015, 0]} args={[MAP_HALF_SIZE * 2, MAP_HALF_SIZE * 2]} cellSize={2} cellThickness={0.5}
      cellColor="#47545a" sectionSize={10} sectionThickness={0.8} sectionColor="#637078"
      fadeDistance={180} fadeStrength={1} infiniteGrid={false} />
    <Box position={[0, 0.04, -12]} size={[49, 0.08, 42]} color="#677577" />
    <Box position={[0, 3.2, -33]} size={[50, 6.4, 0.5]} color="#3c4b52" />
    <Box position={[-25, 1.1, -12]} size={[0.5, 2.2, 42]} color="#43525a" />
    <Box position={[25, 1.1, -12]} size={[0.5, 2.2, 42]} color="#43525a" />
    <Box position={[0, 0.12, 8]} size={[50, 0.24, 0.5]} color="#a0a59a" />
    {layout.docks.map(dock => <Selectable key={dock.id} id={`dock:${dock.id}`} selected={selectedKey === `dock:${dock.id}`} onSelect={() => onSelect(`dock:${dock.id}`)}>
      <DockModel dock={dock} />
      <DockNumber number={dock.number} x={dockX(dock.number)} />
      {[-2.8, 2.8].map(offset => <Box key={offset} position={[dockX(dock.number) + offset, 0.035, 19]} size={[0.06, 0.02, 19]} color="#b29152" />)}
      <Box position={[dockX(dock.number), 0.035, 28.5]} size={[5.6, 0.02, 0.06]} color="#b29152" />
    </Selectable>)}
    {layout.racks.map(rack => {
      const key = rackKeys[`${rack.aisle}-${rack.rack}`];
      return <Selectable key={key} id={key} selected={selectedKey === key} onSelect={() => onSelect(key)}>
        <ShelfModel {...rack} selectedKey={selectedKey} onSelect={onSelect} />
      </Selectable>;
    })}
    {layout.trucks.map(entry => <Selectable key={entry.truck.id} id={`truck:${entry.truck.id}`} selected={selectedKey === `truck:${entry.truck.id}`} onSelect={() => onSelect(`truck:${entry.truck.id}`)}>
      <TruckModel {...entry} />
    </Selectable>)}
    {layout.forklifts.map(entry => <Selectable key={entry.forklift.id} id={`forklift:${entry.forklift.id}`} selected={selectedKey === `forklift:${entry.forklift.id}`} onSelect={() => onSelect(`forklift:${entry.forklift.id}`)}>
      <ForkliftModel {...entry} />
    </Selectable>)}
    {Array.from({ length: 13 }, (_, i) => <Box key={i} position={[-30 + i * 5, 0.035, 35]} size={[2.5, 0.025, 0.13]} color="#afb5a8" />)}
    {[-1, 1].map(side => <Box key={side} position={[0, 0.04, side * (MAP_HALF_SIZE - 0.5)]} size={[MAP_HALF_SIZE * 2 - 1, 0.08, 0.15]} color="#b98b40" />)}
    {[-1, 1].map(side => <Box key={side} position={[side * (MAP_HALF_SIZE - 0.5), 0.04, 0]} size={[0.15, 0.08, MAP_HALF_SIZE * 2 - 1]} color="#b98b40" />)}
  </Selectable>;
}

/** Pure presentation: layout and selection actions are provided by the application. */
export function WarehouseScene({ warehouses, cameraTarget }: {
  warehouses: WarehousePresentation[]; cameraTarget: [number, number, number];
}) {
  const focusedWarehouse = warehouses.find(w => w.position[0] === cameraTarget[0]);
  return <Canvas orthographic shadows={{ type: PCFSoftShadowMap }} dpr={[1, 1.75]}
    camera={{ position: [52, 52, 52], zoom: 13, near: 0.1, far: 350 }}
    gl={{ antialias: true }} fallback={<div className="fallback">WebGL is required to explore the warehouse.</div>}>
    <color attach="background" args={['#172229']} />
    <hemisphereLight args={['#dce9ee', '#50524a', 2.1]} />
    <CampusLight />
    <Selectable id="campus-apron" selected={false} onSelect={() => focusedWarehouse?.selection.onSelect(focusedWarehouse.selection.siteKey)}>
      <Box position={[(warehouses.length - 1) * 90, -0.55, 0]} size={[(warehouses.length - 1) * 180 + MAP_HALF_SIZE * 2, 0.5, MAP_HALF_SIZE * 2]} color="#303e44" />
    </Selectable>
    {warehouses.map(warehouse => <group key={warehouse.selection.siteKey} position={warehouse.position}>
      <Warehouse layout={warehouse.layout} selection={warehouse.selection} />
    </group>)}
    <StrategyCamera focus={cameraTarget} />

  </Canvas>;
}
