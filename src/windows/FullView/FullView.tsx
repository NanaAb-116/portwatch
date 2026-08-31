import { PortResults } from "../../features/ports/components/PortResults";
import { PortTable } from "../../features/ports/components/PortTable";
import { PortToolbar } from "../../features/ports/components/PortToolbar";
import { usePortView } from "../../features/ports/hooks/usePortView";
import { TerminationDialog } from "../../features/processes/TerminationDialog";
import { useState } from "react";
import { SettingsDialog } from "../../features/settings/SettingsDialog";

function formatRefreshTime(value?: Date): string {
  return value ? `Last refreshed ${value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Not refreshed yet";
}

export function FullView() {
  const view = usePortView({ sortable: true });
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <main className="full-shell">
      <header className="full-header">
        <div>
          <div className="title-row"><span className="identity-mark" aria-hidden="true">P</span><h1>PortWatch</h1></div>
          <p>Inspect listening TCP and bound UDP ports on this computer.</p>
        </div>
        <div className="refresh-group">
          <span>{formatRefreshTime(view.lastRefreshed)}</span>
          <button className="button" type="button" onClick={() => setSettingsOpen(true)}>Settings</button>
          <button className="button" type="button" onClick={() => void view.refresh()} disabled={view.initialLoading || view.refreshing}>
            {view.refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>
      <PortToolbar
        query={view.query}
        onQueryChange={view.setQuery}
        showTcp={view.showTcp}
        onShowTcpChange={view.setShowTcp}
        showUdp={view.showUdp}
        onShowUdpChange={view.setShowUdp}
      />
      <PortResults
        initialLoading={view.initialLoading}
        refreshing={view.refreshing}
        error={view.error}
        actionMessage={view.termination.message}
        totalCount={view.ports.length}
        visibleCount={view.visiblePorts.length}
        hasQuery={Boolean(view.query.trim())}
        protocolsEnabled={view.showTcp || view.showUdp}
      >
        <PortTable
          ports={view.visiblePorts}
          sort={view.sort}
          onSortChange={view.setSort}
          pendingPid={view.termination.pendingPid}
          onTerminate={view.termination.requestTermination}
        />
      </PortResults>
      {view.termination.dialog ? (
        <TerminationDialog
          state={view.termination.dialog}
          pending={view.termination.pendingPid !== undefined}
          onCancel={view.termination.cancel}
          onConfirmGraceful={() => void view.termination.confirmGraceful()}
          onConfirmForce={() => void view.termination.confirmForce()}
        />
      ) : null}
      {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
    </main>
  );
}
