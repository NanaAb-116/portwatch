import type { PortWatchError } from "../types/ports";

const messages: Record<string, string> = {
  permission_denied:
    "PortWatch could not inspect every process. Try again with the permissions appropriate for your operating system.",
  port_information_unavailable: "Port information is unavailable on this system.",
  unsupported_platform_operation: "Port discovery is not supported on this platform.",
  port_refresh_failed: "PortWatch could not refresh the port list. Please try again.",
};

export function errorMessage(error: unknown): string {
  if (isPortWatchError(error)) {
    return messages[error.code] ?? "PortWatch encountered an unexpected error.";
  }

  return "PortWatch could not refresh the port list. Please try again.";
}

function isPortWatchError(value: unknown): value is PortWatchError {
  return typeof value === "object" && value !== null && "code" in value;
}
