import type { PortWatchError } from "../types/ports";

const messages: Record<string, string> = {
  permission_denied:
    "PortWatch could not inspect every process. Try again with the permissions appropriate for your operating system.",
  port_information_unavailable: "Port information is unavailable on this system.",
  unsupported_platform_operation: "Port discovery is not supported on this platform.",
  port_refresh_failed: "PortWatch could not refresh the port list. Please try again.",
  desktop_operation_failed: "PortWatch could not complete that window action. Please try again.",
};

const terminationMessages: Record<string, string> = {
  process_no_longer_exists: "That process has already exited. The port list was refreshed.",
  process_identity_changed:
    "The process changed since it was discovered, so PortWatch refused to terminate it and refreshed the list.",
  process_identity_unverifiable:
    "PortWatch could not verify that this is still the same process, so it was not terminated.",
  invalid_pid: "PortWatch refused an invalid process identifier.",
  self_termination: "PortWatch cannot terminate itself.",
  protected_process: "PortWatch will not terminate this protected system process.",
  permission_denied:
    "The operating system denied permission to terminate this process. PortWatch did not elevate privileges.",
  process_still_running: "The process is still running after a graceful termination request.",
  termination_failed: "PortWatch could not request graceful termination for this process.",
  force_termination_failed: "PortWatch could not force terminate this process.",
  force_termination_not_authorized:
    "The force-termination confirmation expired. Try graceful termination again.",
  unsupported_platform_operation: "Process termination is not supported on this platform.",
  unexpected_system_error: "The operating system could not complete the termination request.",
};

export function errorMessage(error: unknown): string {
  if (isPortWatchError(error)) {
    return messages[error.code] ?? "PortWatch encountered an unexpected error.";
  }

  return "PortWatch could not refresh the port list. Please try again.";
}

export function terminationErrorMessage(error: unknown): string {
  const code = errorCode(error);
  return code
    ? (terminationMessages[code] ?? "PortWatch could not terminate this process safely.")
    : "PortWatch could not terminate this process safely.";
}

export function errorCode(error: unknown): string | undefined {
  return isPortWatchError(error) ? error.code : undefined;
}

function isPortWatchError(value: unknown): value is PortWatchError {
  return typeof value === "object" && value !== null && "code" in value;
}
