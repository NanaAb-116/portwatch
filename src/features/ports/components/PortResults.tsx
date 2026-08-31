import type { ReactNode } from "react";

type PortResultsProps = {
  initialLoading: boolean;
  refreshing: boolean;
  error?: string;
  actionMessage?: string;
  totalCount: number;
  visibleCount: number;
  hasQuery: boolean;
  protocolsEnabled: boolean;
  children: ReactNode;
  compact?: boolean;
};

export function PortResults({
  initialLoading,
  refreshing,
  error,
  actionMessage,
  totalCount,
  visibleCount,
  hasQuery,
  protocolsEnabled,
  children,
  compact = false,
}: PortResultsProps) {
  const stateClass = `state${compact ? " state--compact" : ""}`;
  return (
    <section className="results" aria-busy={initialLoading || refreshing}>
      <div className="results-summary" aria-live="polite" aria-atomic="true">
        <span>{visibleCount} {visibleCount === 1 ? "result" : "results"}</span>
        {refreshing ? <span className="refresh-status">Refreshing in background…</span> : null}
      </div>
      {error ? (
        <div className="error-banner" role="alert">
          <strong>Unable to refresh.</strong> {error}
          {totalCount > 0 ? " Showing results from the previous refresh." : ""}
        </div>
      ) : null}
      {actionMessage ? <div className="action-banner" role="status">{actionMessage}</div> : null}
      {initialLoading ? <div className={stateClass}><span className="spinner" aria-hidden="true" />Inspecting listening ports…</div> : null}
      {!initialLoading && visibleCount === 0 && !(error && totalCount === 0) ? (
        <div className={stateClass}>
          <strong>No occupied ports found</strong>
          <span>{!protocolsEnabled ? "Enable TCP or UDP to see results." : hasQuery ? "Try a different search." : "No matching TCP or UDP listeners are visible."}</span>
        </div>
      ) : null}
      {!initialLoading && visibleCount > 0 ? children : null}
    </section>
  );
}
