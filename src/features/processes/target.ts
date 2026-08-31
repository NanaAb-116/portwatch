import type { PortEntry } from "../../types/ports";
import type { ProcessIdentity } from "../../types/processes";

export function terminationTarget(entry: PortEntry): ProcessIdentity | undefined {
  if (
    entry.pid === undefined ||
    entry.pid <= 0 ||
    !entry.processName ||
    entry.processStartTime === undefined ||
    entry.processStartTime <= 0
  ) {
    return undefined;
  }

  return {
    pid: entry.pid,
    processName: entry.processName,
    executablePath: entry.executablePath,
    startTime: entry.processStartTime,
  };
}

