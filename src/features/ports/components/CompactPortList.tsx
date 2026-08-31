import { ProtocolBadge } from "../../../components/ProtocolBadge";
import type { PortEntry } from "../../../types/ports";
import { terminationTarget } from "../../processes/target";

export function CompactPortList({
  ports,
  pendingPid,
  onTerminate,
}: {
  ports: PortEntry[];
  pendingPid?: number;
  onTerminate: (entry: PortEntry) => void;
}) {
  return (
    <ul className="compact-list" aria-label="Occupied ports">
      {ports.map((entry) => {
        const target = terminationTarget(entry);
        return <li key={`${entry.protocol}-${entry.address}-${entry.port}-${entry.pid ?? "unknown"}`}>
          <div className="compact-primary">
            <span className="compact-port">{entry.port}</span>
            <ProtocolBadge protocol={entry.protocol} />
          </div>
          <div className="compact-owner">
            <span className="truncate" title={entry.processName ?? "Process unavailable"}>{entry.processName ?? "Process unavailable"}</span>
            <span className="muted">PID {entry.pid ?? "—"}</span>
          </div>
          <span className="compact-address truncate" title={entry.address}>{entry.address}</span>
          {target ? (
            <button
              className="terminate-button terminate-button--compact"
              type="button"
              onClick={() => onTerminate(entry)}
              disabled={pendingPid !== undefined}
              aria-label={`Terminate ${target.processName} on port ${entry.port}`}
            >
              {pendingPid === target.pid ? "Stopping…" : "Terminate"}
            </button>
          ) : null}
        </li>;
      })}
    </ul>
  );
}
