import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { DirectionalLight, Object3D, PCFSoftShadowMap } from 'three';
import type { MapControls } from 'three-stdlib';
import { StrategyCamera } from './StrategyCamera';
import { MAP_HALF_SIZE } from './layout';
import type { getSiteLayout } from './layout';
import { GeometryResources, InstancedWarehouseParts } from './InstancedParts';
import { selectedParts, warehouseGeometry } from './geometry';

export interface SceneSelection {
  selectedKey: string | null; siteKey: string; rackKeys: Record<string, string>; onSelect: (key: string) => void;
}
export interface WarehousePresentation { position: [number, number, number]; layout: ReturnType<typeof getSiteLayout>; selection: SceneSelection }

function CampusLight() {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const controls = useThree(s => s.controls) as MapControls | null;
  const gl = useThree(s => s.gl);
  useFrame(() => {
    if (!light.current || !controls || target.position.equals(controls.target)) return;
    target.position.copy(controls.target);
    light.current.position.set(target.position.x - 25, 55, target.position.z + 20);
    target.updateMatrixWorld();
    gl.shadowMap.needsUpdate = true;
  });
  return <>
    <primitive object={target} />
    <directionalLight ref={light} target={target} position={[-25, 55, 20]} intensity={3} color="#ffe4b9" castShadow
      shadow-mapSize={[2048, 2048]} shadow-camera-left={-65} shadow-camera-right={65}
      shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-near={1} shadow-camera-far={150}
      shadow-bias={-0.0003} shadow-normalBias={0.04} shadow-radius={3} />
  </>;
}

const Warehouse = memo(function Warehouse({ layout, selection }: Omit<WarehousePresentation, 'position'>) {
  const { selectedKey, siteKey, rackKeys, onSelect } = selection;
  const geometry = useMemo(() => warehouseGeometry(layout, siteKey, rackKeys), [layout, siteKey, rackKeys]);
  const selected = useMemo(() => selectedParts(geometry.parts, selectedKey, siteKey), [geometry, selectedKey, siteKey]);
  return <>
    <InstancedWarehouseParts geometry={geometry} selected={selected} onSelect={onSelect} />
    <Grid position={[0, 0.015, 0]} args={[144, 144]} cellSize={2} cellThickness={0.5}
      cellColor="#47545a" sectionSize={10} sectionThickness={0.8} sectionColor="#637078"
      fadeDistance={180} fadeStrength={1} infiniteGrid={false} />
  </>;
});

function Apron({ warehouses, cameraTarget }: { warehouses: WarehousePresentation[]; cameraTarget: [number, number, number] }) {
  const { gl, invalidate } = useThree();
  useLayoutEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true; invalidate();
  }, [gl, invalidate]);
  return <mesh position={[(warehouses.length - 1) * 90, -0.55, 0]} receiveShadow
    onClick={event => {
      event.stopPropagation();
      const focused = warehouses.find(w => w.position[0] === cameraTarget[0]);
      if (event.delta <= 5 && focused) focused.selection.onSelect(focused.selection.siteKey);
    }}>
    <boxGeometry args={[(warehouses.length - 1) * 180 + MAP_HALF_SIZE * 2, 0.5, 144]} />
    <meshStandardMaterial color="#303e44" roughness={0.78} metalness={0.12} />
  </mesh>;
}

/** Pure presentation: batches, pointer picking and camera control only. */
export const WarehouseScene = memo(function WarehouseScene({ warehouses, cameraTarget }: {
  warehouses: WarehousePresentation[]; cameraTarget: [number, number, number];
}) {
  return <Canvas orthographic frameloop="demand" shadows={{ type: PCFSoftShadowMap }} dpr={[1, 1.5]}
    camera={{ position: [52, 52, 52], zoom: 13, near: 0.1, far: 350 }} gl={{ antialias: true }}
    fallback={<div className="fallback">WebGL is required to explore the warehouse.</div>}>
    <color attach="background" args={['#172229']} />
    <hemisphereLight args={['#dce9ee', '#50524a', 2.1]} />
    <CampusLight />
    <Apron warehouses={warehouses} cameraTarget={cameraTarget} />
    <GeometryResources>
      {warehouses.map(w => <group key={w.selection.siteKey} position={w.position}>
        <Warehouse layout={w.layout} selection={w.selection} />
      </group>)}
    </GeometryResources>
    <StrategyCamera focus={cameraTarget} />
  </Canvas>;
});
