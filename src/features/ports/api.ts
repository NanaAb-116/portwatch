import { invoke } from "@tauri-apps/api/core";
import type { PortEntry, PortQueryOptions } from "../../types/ports";

export const ALL_PORTS_OPTIONS: PortQueryOptions = {
  showTcp: true,
  showUdp: true,
  listeningOnly: true,
};

export function listPorts(options: PortQueryOptions): Promise<PortEntry[]> {
  return invoke<PortEntry[]>("list_ports", { options });
}
