import type { PortProtocol } from "../types/ports";

export function ProtocolBadge({ protocol }: { protocol: PortProtocol }) {
  return <span className={`protocol protocol--${protocol}`}>{protocol.toUpperCase()}</span>;
}
