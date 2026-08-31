import type { RefObject } from "react";

type PortToolbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  showTcp: boolean;
  onShowTcpChange: (show: boolean) => void;
  showUdp: boolean;
  onShowUdpChange: (show: boolean) => void;
  searchRef?: RefObject<HTMLInputElement | null>;
  compact?: boolean;
};

export function PortToolbar({
  query,
  onQueryChange,
  showTcp,
  onShowTcpChange,
  showUdp,
  onShowUdpChange,
  searchRef,
  compact = false,
}: PortToolbarProps) {
  return (
    <section className={`toolbar${compact ? " toolbar--compact" : ""}`} aria-label="Port filters">
      <label className="search">
        <span className="sr-only">Search by port, process, or PID</span>
        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m14.2 13.1 3.3 3.3-1.1 1.1-3.3-3.3a6.5 6.5 0 1 1 1.1-1.1ZM9 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>
        <input
          ref={searchRef}
          type="search"
          placeholder={compact ? "Search ports or processes" : "Search port, process, or PID"}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <div className="protocol-filters" aria-label="Protocols">
        <button
          className="filter-toggle filter-toggle--tcp"
          type="button"
          aria-pressed={showTcp}
          onClick={() => onShowTcpChange(!showTcp)}
        >TCP</button>
        <button
          className="filter-toggle filter-toggle--udp"
          type="button"
          aria-pressed={showUdp}
          onClick={() => onShowUdpChange(!showUdp)}
        >UDP</button>
      </div>
    </section>
  );
}
