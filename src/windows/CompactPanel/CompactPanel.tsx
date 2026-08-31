import { useEffect, useRef, useState } from "react";
import { CompactPortList } from "../../features/ports/components/CompactPortList";
import { PortResults } from "../../features/ports/components/PortResults";
import { PortToolbar } from "../../features/ports/components/PortToolbar";
import { usePortView } from "../../features/ports/hooks/usePortView";
import { hideCompactPanel, openFullView, quitApp } from "../../lib/desktop";
import { TerminationDialog } from "../../features/processes/TerminationDialog";
import { SettingsDialog } from "../../features/settings/SettingsDialog";

export function CompactPanel() {
  const view = usePortView();
  const searchRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const handleFocus = () => searchRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") void hideCompactPanel();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <main className="compact-shell">
      <header className="compact-header">
        <div className="identity">
          <span className="identity-mark" aria-hidden="true">P</span>
          <div><h1>PortWatch</h1><p>Occupied local ports</p></div>
        </div>
        <div className="compact-header-actions">
          <button className="icon-button" type="button" onClick={() => void view.refresh()} disabled={view.initialLoading || view.refreshing} aria-label="Refresh ports" title="Refresh ports">
            <span aria-hidden="true">↻</span>
          </button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Settings">
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </header>
      <PortToolbar
        compact
        searchRef={searchRef}
        query={view.query}
        onQueryChange={view.setQuery}
        showTcp={view.showTcp}
        onShowTcpChange={view.setShowTcp}
        showUdp={view.showUdp}
        onShowUdpChange={view.setShowUdp}
      />
      <PortResults
        compact
        initialLoading={view.initialLoading}
        refreshing={view.refreshing}
        error={view.error}
        actionMessage={view.termination.message}
        totalCount={view.ports.length}
        visibleCount={view.visiblePorts.length}
        hasQuery={Boolean(view.query.trim())}
        protocolsEnabled={view.showTcp || view.showUdp}
      >
        <CompactPortList
          ports={view.visiblePorts}
          pendingPid={view.termination.pendingPid}
          onTerminate={view.termination.requestTermination}
        />
      </PortResults>
      <footer className="compact-footer">
        <button className="text-button text-button--primary" type="button" onClick={() => void openFullView()}>Open full view <span aria-hidden="true">↗</span></button>
        <button className="text-button" type="button" onClick={() => void quitApp()}>Quit</button>
      </footer>
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
