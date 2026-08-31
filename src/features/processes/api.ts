import { invoke } from "@tauri-apps/api/core";
import type { ProcessIdentity, TerminationOutcome } from "../../types/processes";

export function terminateProcess(target: ProcessIdentity): Promise<TerminationOutcome> {
  return invoke<TerminationOutcome>("terminate_process", { request: { target } });
}

export function forceTerminateProcess(
  target: ProcessIdentity,
  authorization: string,
): Promise<TerminationOutcome> {
  return invoke<TerminationOutcome>("force_terminate_process", {
    request: { target, authorization },
  });
}

