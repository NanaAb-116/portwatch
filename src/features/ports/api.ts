import { invoke } from "@tauri-apps/api/core";
import type { PortEntry, PortQueryOptions } from "../../types/ports";

export function listPorts(options: PortQueryOptions): Promise<PortEntry[]> {
  return invoke<PortEntry[]>("list_ports", { options });
}
