import { useStore } from 'zustand';
import { warehouseStore } from '../../store/warehouseStore';
import { getSiteKpis, TRUCK_STATUSES } from '../../store/selectors';

export function OperationsBar() {
  const state = useStore(warehouseStore);
  const kpis = getSiteKpis(state);
  return <>
    <header className="topbar">
      <div className="brand"><span className="brand-icon" aria-hidden="true">▦</span> WARETRACK <span className="mode">LIVE OPERATIONS</span></div>
      <label className="site-picker">SITE <select aria-label="Warehouse site" value={state.activeSiteId} onChange={e => state.setSite(e.target.value)}>
        {state.data.sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select></label>
    </header>
    <section className="operations-bar" aria-label="Site operations">
      <div className="kpi-grid" aria-label="Selected site KPIs">
        <article className="kpi-card" title="Proxy: completed shipments finished by planned departure. Actual delivery timestamps are not available.">
          <span className="kpi-label">On-time delivery rate</span>
          <strong data-testid="kpi-on-time">{kpis.onTimeRate === null ? '—' : `${kpis.onTimeRate.toFixed(1)}%`}</strong>
          <small>Completion proxy · {kpis.completedCount} completed</small>
        </article>
        <article className="kpi-card"><span className="kpi-label">Docks in use</span><strong data-testid="kpi-docks">{kpis.docksInUse}<span> / {kpis.totalDocks}</span></strong><small>Occupied loading bays</small></article>
        <article className="kpi-card"><span className="kpi-label">Active trucks</span><strong data-testid="kpi-trucks">{kpis.activeTrucks}</strong><small>On-site + assigned movements</small></article>
        <article className={`kpi-card ${kpis.lowStock ? 'kpi-alert' : ''}`}><span className="kpi-label">Low-stock alerts</span><strong data-testid="kpi-stock">{kpis.lowStock}</strong><small>Available stock below reorder point</small></article>
      </div>
      <div className="filter-bar" aria-label="Shipment filters">
        <span className="filter-heading">FILTER MOVEMENTS</span>
        <label className={`delay-filter ${state.filters.delayedOnly ? 'is-active' : ''}`}>
          <input type="checkbox" checked={state.filters.delayedOnly} onChange={e => state.setFilters({ delayedOnly: e.target.checked })} /> Only delayed shipments
        </label>
        <label className="truck-filter">Truck status <select aria-label="Truck status filter" value={state.filters.truckStatus} onChange={e => state.setFilters({ truckStatus: e.target.value })}>
          <option value="all">All statuses</option>{TRUCK_STATUSES.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select></label>
        {(state.filters.delayedOnly || state.filters.truckStatus !== 'all') && <button className="reset-filters" onClick={() => state.setFilters({ delayedOnly: false, truckStatus: 'all' })}>Clear filters</button>}
        <span className="filter-note">KPIs show the whole site</span>
      </div>
    </section>
  </>;
}
