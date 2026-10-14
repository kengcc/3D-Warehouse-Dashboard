import { createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, EdgesGeometry,
  InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial,
  PlaneGeometry, ShaderMaterial, SRGBColorSpace,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import type { GeometryLayout, Part } from './geometry';
import { groupParts, partMatrices } from './geometry';

function makeResources() {
  const box = new BoxGeometry(1, 1, 1);
  const wheel = new CylinderGeometry(0.5, 0.5, 1, 10);
  const label = new PlaneGeometry(1.1, 0.55);
  const lit = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0.12 });
  const wheelMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  const glow = new Map(['#ffb43c', '#3c9f71', '#ffd077'].map(color => [color,
    new MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0.12, emissive: color, emissiveIntensity: 0.65 })]));
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18262d'; ctx.fillRect(0, 0, 768, 64);
  ctx.fillStyle = '#e2e6df'; ctx.font = '600 46px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 6; i++) ctx.fillText(String(i + 1).padStart(2, '0'), i * 128 + 64, 34);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  const labelMaterial = new ShaderMaterial({
    uniforms: { atlas: { value: texture } },
    vertexShader: `attribute float labelIndex; varying vec2 labelUv;
      void main() { labelUv = vec2((uv.x + labelIndex) / 6.0, uv.y);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D atlas; varying vec2 labelUv;
      void main() { gl_FragColor = texture2D(atlas, labelUv);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const boxEdges = new EdgesGeometry(box);
  const wheelEdges = new EdgesGeometry(wheel);
  const outline = new ShaderMaterial({
    uniforms: { color: { value: new Color('#ffb43c') } },
    vertexShader: `attribute mat4 instanceTransform;
      void main() { gl_Position = projectionMatrix * modelViewMatrix * instanceTransform * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    depthWrite: false,
  });
  return { box, wheel, label, lit, wheelMaterial, glow, texture, labelMaterial, boxEdges, wheelEdges, outline };
}
const Resources = createContext<ReturnType<typeof makeResources> | null>(null);

/** One owned resource set for the whole canvas; shared props aren't auto-disposed. */
export function GeometryResources({ children }: { children: ReactNode }) {
  const [resources] = useState(makeResources);
  useEffect(() => () => {
    resources.box.dispose(); resources.wheel.dispose(); resources.label.dispose(); resources.wheelMaterial.dispose();
    resources.boxEdges.dispose(); resources.wheelEdges.dispose(); resources.lit.dispose();
    resources.glow.forEach(m => m.dispose()); resources.texture.dispose();
    resources.labelMaterial.dispose(); resources.outline.dispose();
  }, [resources]);
  return <Resources.Provider value={resources}>{children}</Resources.Provider>;
}

function useResources() {
  const resources = useContext(Resources);
  if (!resources) throw new Error('GeometryResources must wrap the warehouse geometry');
  return resources;
}

function clickPart(event: ThreeEvent<MouseEvent>, key: string | undefined, onSelect: (key: string) => void) {
  event.stopPropagation();
  if (key && event.delta <= 5) onSelect(key);
}

const PartBatch = memo(function PartBatch({ parts, onSelect }: { parts: Part[]; onSelect: (key: string) => void }) {
  const resources = useResources();
  const mesh = useRef<InstancedMesh>(null);
  const { gl, invalidate } = useThree();
  const first = parts[0];
  const geometry = first.kind === 'box' ? resources.box : resources.wheel;
  const material = first.emissive ? resources.glow.get(first.emissive)! : first.kind === 'wheel' ? resources.wheelMaterial : resources.lit;
  useLayoutEffect(() => {
    const object = mesh.current!;
    const matrices = partMatrices(parts);
    const matrix = new Matrix4(), color = new Color();
    parts.forEach((part, index) => {
      object.setMatrixAt(index, matrix.fromArray(matrices, index * 16));
      object.setColorAt(index, color.set(part.color));
    });
    object.instanceMatrix.needsUpdate = true;
    object.instanceColor!.needsUpdate = true;
    // Recompute bounds after filtering; stale bounds break picking/frustum culling.
    object.computeBoundingBox(); object.computeBoundingSphere();
    gl.shadowMap.needsUpdate = true; invalidate();
  }, [parts, gl, invalidate]);
  return <instancedMesh ref={mesh} args={[geometry, material, parts.length]}
    castShadow={first.castShadow} receiveShadow userData={{ parts }}
    onClick={event => clickPart(event, parts[event.instanceId ?? -1]?.key, onSelect)} />;
});

const Labels = memo(function Labels({ labels, onSelect }: { labels: GeometryLayout['labels']; onSelect: (key: string) => void }) {
  const resources = useResources();
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => resources.label.clone().setAttribute('labelIndex',
    new InstancedBufferAttribute(new Float32Array(labels.map(l => l.number - 1)), 1)), [resources.label, labels]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const invalidate = useThree(s => s.invalidate);
  useLayoutEffect(() => {
    const matrix = new Matrix4();
    labels.forEach((label, i) => mesh.current!.setMatrixAt(i, matrix.makeTranslation(...label.position)));
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.computeBoundingSphere(); invalidate();
  }, [labels, invalidate]);
  return <instancedMesh ref={mesh} args={[geometry, resources.labelMaterial, labels.length]}
    userData={{ labels }} onClick={event => clickPart(event, labels[event.instanceId ?? -1]?.key, onSelect)} />;
});

const noop = () => {};
function OutlineBatch({ parts, edges, material }: { parts: Part[]; edges: BufferGeometry; material: Material }) {
  const matrices = useMemo(() => partMatrices(parts), [parts]);
  return <lineSegments material={material} frustumCulled={false} raycast={noop} renderOrder={1}>
    <instancedBufferGeometry instanceCount={parts.length}>
      <bufferAttribute attach="attributes-position" args={[edges.attributes.position.array, 3]} />
      <instancedBufferAttribute attach="attributes-instanceTransform" args={[matrices, 16]} />
    </instancedBufferGeometry>
  </lineSegments>;
}

export const InstancedWarehouseParts = memo(function InstancedWarehouseParts({ geometry, selected, onSelect }: {
  geometry: GeometryLayout; selected: Part[]; onSelect: (key: string) => void;
}) {
  const resources = useResources();
  const batches = useMemo(() => groupParts(geometry.parts), [geometry]);
  const boxes = useMemo(() => selected.filter(p => p.kind === 'box'), [selected]);
  const wheels = useMemo(() => selected.filter(p => p.kind === 'wheel'), [selected]);
  return <>
    {batches.map(parts => <PartBatch key={`${parts[0].kind}:${parts[0].emissive}:${parts[0].castShadow}`} parts={parts} onSelect={onSelect} />)}
    {!!geometry.labels.length && <Labels labels={geometry.labels} onSelect={onSelect} />}
    {!!boxes.length && <OutlineBatch parts={boxes} edges={resources.boxEdges} material={resources.outline} />}
    {!!wheels.length && <OutlineBatch parts={wheels} edges={resources.wheelEdges} material={resources.outline} />}
  </>;
});
