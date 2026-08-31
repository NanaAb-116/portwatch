import { ProtocolBadge } from "../../../components/ProtocolBadge";
import type { PortEntry, PortSort, PortSortKey } from "../../../types/ports";
import { nextSort } from "../utilities/ports";
import { terminationTarget } from "../../processes/target";

const columns: Array<{ key: PortSortKey; label: string }> = [
  { key: "port", label: "Port" },
  { key: "protocol", label: "Protocol" },
  { key: "processName", label: "Process" },
  { key: "pid", label: "PID" },
  { key: "address", label: "Address" },
];

export function PortTable({
  ports,
  sort,
  onSortChange,
  pendingPid,
  onTerminate,
}: {
  ports: PortEntry[];
  sort: PortSort;
  onSortChange: (sort: PortSort) => void;
  pendingPid?: number;
  onTerminate: (entry: PortEntry) => void;
}) {
  return (
    <div className="port-table-wrap">
      <table className="port-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} aria-sort={sort.key === column.key ? sort.direction : "none"}>
                <button type="button" onClick={() => onSortChange(nextSort(sort, column.key))}>
                  {column.label}
                  <span className="sort-mark" aria-hidden="true">{sort.key === column.key ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}</span>
                </button>
              </th>
            ))}
            <th>State</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {ports.map((entry) => {
            const target = terminationTarget(entry);
            return <tr key={`${entry.protocol}-${entry.address}-${entry.port}-${entry.pid ?? "unknown"}`}>
              <td className="port-number">{entry.port}</td>
              <td><ProtocolBadge protocol={entry.protocol} /></td>
              <td><span className="cell-truncate" title={entry.processName ?? "Unavailable"}>{entry.processName ?? <span className="muted">Unavailable</span>}</span></td>
              <td>{entry.pid ?? <span className="muted">—</span>}</td>
              <td className="address"><span className="cell-truncate" title={entry.address}>{entry.address}</span></td>
              <td>{entry.state ? <span className="state-label">{entry.state}</span> : <span className="muted">—</span>}</td>
              <td>
                {target ? (
                  <button
                    className="terminate-button"
                    type="button"
                    onClick={() => onTerminate(entry)}
                    disabled={pendingPid !== undefined}
                    aria-label={`Terminate ${target.processName} on port ${entry.port}`}
                  >
                    {pendingPid === target.pid ? "Stopping…" : "Terminate"}
                  </button>
                ) : <span className="muted">Unavailable</span>}
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
