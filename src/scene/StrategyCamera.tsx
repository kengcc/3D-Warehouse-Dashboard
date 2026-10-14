import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { MOUSE, TOUCH, OrthographicCamera, Vector3 } from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { cameraLimits } from './layout';

interface Flight { startedAt: number; from: Vector3; to: Vector3; fromZoom: number; toZoom: number }
export function StrategyCamera({ focus }: { focus: [number, number, number] }) {
  const controls = useRef<MapControlsImpl>(null);
  const flight = useRef<Flight | null>(null);
  const initialized = useRef(false);
  const boundCenter = useRef(new Vector3(...focus));
  const camera = useThree(s => s.camera);
  const get = useThree(s => s.get);
  const invalidate = useThree(s => s.invalidate);
  const offset = useMemo(() => new Vector3(52, 52, 52), []);
  const [x, y, z] = focus;
  useLayoutEffect(() => {
    const c = controls.current;
    if (!c || !(camera instanceof OrthographicCamera)) return;
    const destination = new Vector3(x, y, z);
    const { size } = get();
    const zoom = Math.max(13, cameraLimits(size.width, size.height, 13).minimumZoom);
    if (!initialized.current) {
      initialized.current = true;
      c.target.copy(destination); boundCenter.current.copy(destination);
      camera.position.copy(destination).add(offset);
      camera.zoom = zoom; camera.updateProjectionMatrix(); c.update(); invalidate(); return;
    }
    if (boundCenter.current.equals(destination) && !flight.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    flight.current = { startedAt: performance.now() / 1000 - (reduced ? 1.1 : 0), from: c.target.clone(), to: destination, fromZoom: camera.zoom, toZoom: zoom };
    c.enabled = false; invalidate();
  // Viewport changes are handled by bounds; focus changes alone launch a flight.
  }, [camera, x, y, z, get, invalidate, offset]);

  useFrame(() => {
    const { size } = get();
    const c = controls.current;
    if (!c || !(camera instanceof OrthographicCamera)) return;
    if (flight.current) {
      const f = flight.current;
      const t = Math.min(1, (performance.now() / 1000 - f.startedAt) / 1.1);
      const eased = t * t * (3 - 2 * t);
      c.target.lerpVectors(f.from, f.to, eased);
      boundCenter.current.copy(c.target);
      camera.position.copy(c.target).add(offset);
      camera.zoom = f.fromZoom + (f.toZoom - f.fromZoom) * eased;
      camera.updateProjectionMatrix();
      if (t === 1) { flight.current = null; boundCenter.current.copy(f.to); c.enabled = true; }
      else invalidate();
    }
    const bounds = cameraLimits(size.width, size.height, camera.zoom);
    c.minZoom = Math.max(7, bounds.minimumZoom);
    c.maxZoom = Math.max(34, c.minZoom * 2);
    const zoom = Math.min(c.maxZoom, Math.max(c.minZoom, camera.zoom));
    if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
    const limit = cameraLimits(size.width, size.height, camera.zoom).maxTarget;
    const center = boundCenter.current;
    const nextX = Math.max(center.x - limit, Math.min(center.x + limit, c.target.x));
    const nextZ = Math.max(center.z - limit, Math.min(center.z + limit, c.target.z));
    camera.position.x += nextX - c.target.x;
    camera.position.y -= c.target.y;
    camera.position.z += nextZ - c.target.z;
    c.target.set(nextX, 0, nextZ);
  }, -0.5);

  return <MapControls ref={controls} makeDefault enableRotate={false} enableDamping={false}
    screenSpacePanning={false} zoomSpeed={0.8} panSpeed={0.8}
    mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
    touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }} />;
}
