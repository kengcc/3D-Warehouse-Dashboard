import { useStore } from 'zustand';
import { warehouseStore } from '../../store/warehouseStore';
const scenarioTime = new Intl.DateTimeFormat('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kuala_Lumpur', hour12: false });
export function LiveCaption() {
  const time = useStore(warehouseStore, s => s.operationalTime);
  return <div className="scene-caption"><span className="status-dot" /> SIMULATED LIVE <span>SCENARIO {scenarioTime.format(new Date(time))} MYT</span></div>;
}
