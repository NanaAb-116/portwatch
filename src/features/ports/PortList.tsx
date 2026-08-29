import { ProtocolBadge } from "../../components/ProtocolBadge";
import type { PortEntry } from "../../types/ports";

export function PortList({ ports }: { ports: PortEntry[] }) {
  return (
    <div className="port-table-wrap">
      <table className="port-table">
        <thead>
          <tr>
            <th>Port</th>
            <th>Protocol</th>
            <th>Process</th>
            <th>PID</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
          {ports.map((entry) => (
            <tr key={`${entry.protocol}-${entry.address}-${entry.port}-${entry.pid ?? "unknown"}`}>
              <td className="port-number">{entry.port}</td>
              <td><ProtocolBadge protocol={entry.protocol} /></td>
              <td>{entry.processName ?? <span className="muted">Unavailable</span>}</td>
              <td>{entry.pid ?? <span className="muted">—</span>}</td>
              <td className="address">{entry.address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
