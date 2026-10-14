import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { WarehouseView } from './features/warehouse/WarehouseView';
import { StatusPanel } from './features/warehouse/StatusPanel';
import { warehouseStore } from './store/warehouseStore';
import { startSimulation } from './store/simulation';
import { OperationsBar } from './features/warehouse/OperationsBar';
import { ShipmentList } from './features/warehouse/ShipmentList';
import { LiveCaption } from './features/warehouse/LiveCaption';
import './style.css';

function App() {
  useEffect(() => startSimulation(), []);
  useEffect(() => {
    const clearSelection = (event: KeyboardEvent) => { if (event.key === 'Escape') warehouseStore.getState().select(null); };
    window.addEventListener('keydown', clearSelection);
    return () => window.removeEventListener('keydown', clearSelection);
  }, []);
  return <main className="app">
    <OperationsBar />
    <section className="scene" aria-label="Interactive isometric warehouse">
      <WarehouseView />
      <ShipmentList />
      <StatusPanel />
      <LiveCaption />
      <div className="controls-hint"><span>↔</span> Drag to pan <i /> <span>⊕</span> Scroll to zoom <i /> Click to inspect</div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
