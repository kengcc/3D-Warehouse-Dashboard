import { warehouseStore } from './warehouseStore';

export type Schedule = (callback: () => void, milliseconds: number) => () => void;
const schedule: Schedule = (callback, milliseconds) => {
  const timer = setInterval(callback, milliseconds);
  return () => clearInterval(timer);
};

/** Effect-owned lifecycle: cleanup prevents duplicate timers, including StrictMode. */
export function startSimulation(
  store = warehouseStore,
  every: Schedule = schedule,
  now: () => string = () => new Date().toISOString(),
) {
  return every(() => store.getState().advance(now()), 2000);
}
