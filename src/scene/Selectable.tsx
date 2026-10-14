import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';

const Highlight = createContext(false);
export function ObjectOutline() {
  const selected = useContext(Highlight);
  return selected ? <Outlines color="#ffb43c" thickness={2} /> : null;
}

/** Presentation only: pointer gestures and visual selection supplied by the caller. */
export function Selectable({ id, selected, onSelect, children }: {
  id: string; selected: boolean; onSelect: () => void; children: ReactNode;
}) {
  const parentSelected = useContext(Highlight);
  return <group name={`selectable-${id}`} userData={{ selectableId: id }}
    onClick={(event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      // R3F delta distinguishes clicks from camera drags.
      if (event.delta <= 5) onSelect();
    }}>
    <Highlight.Provider value={selected || parentSelected}>{children}</Highlight.Provider>
  </group>;
}
