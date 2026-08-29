import { useMemo, useState } from "react";
import { PortList } from "./features/ports/PortList";
import { usePorts } from "./features/ports/usePorts";

export default function App() {
  const [query, setQuery] = useState("");
  const [showTcp, setShowTcp] = useState(true);
  const [showUdp, setShowUdp] = useState(true);
  const options = useMemo(
    () => ({ showTcp, showUdp, listeningOnly: true }),
    [showTcp, showUdp],
  );
  const { ports, loading, error, refresh } = usePorts(options);

  const visiblePorts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return ports;
    return ports.filter((entry) =>
      [entry.port, entry.pid, entry.processName]
        .filter((value) => value !== undefined)
        .some((value) => String(value).toLocaleLowerCase().includes(normalized)),
    );
  }, [ports, query]);

  return (
    <main className="shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local port inspector</p>
          <h1>PortWatch</h1>
        </div>
        <button className="button" type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <section className="toolbar" aria-label="Port filters">
        <label className="search">
          <span className="sr-only">Search by port, process, or PID</span>
          <input
            type="search"
            placeholder="Search port, process, or PID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="check"><input type="checkbox" checked={showTcp} onChange={(event) => setShowTcp(event.target.checked)} /> TCP</label>
        <label className="check"><input type="checkbox" checked={showUdp} onChange={(event) => setShowUdp(event.target.checked)} /> UDP</label>
      </section>

      <section aria-live="polite" aria-busy={loading}>
        {loading && ports.length === 0 ? <div className="state">Inspecting listening ports…</div> : null}
        {error ? <div className="state state--error" role="alert"><strong>Unable to refresh</strong><span>{error}</span></div> : null}
        {!loading && !error && visiblePorts.length === 0 ? <div className="state"><strong>No occupied ports found</strong><span>{query ? "Try a different search." : "No matching TCP or UDP listeners are visible."}</span></div> : null}
        {!error && visiblePorts.length > 0 ? <PortList ports={visiblePorts} /> : null}
      </section>
    </main>
  );
}
