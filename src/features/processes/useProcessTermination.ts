import { useCallback, useState } from "react";
import { errorCode, terminationErrorMessage } from "../../lib/errors";
import type { PortEntry } from "../../types/ports";
import type { ProcessIdentity } from "../../types/processes";
import { forceTerminateProcess, terminateProcess } from "./api";
import { terminationTarget } from "./target";

export type TerminationDialogState =
  | { step: "confirm"; entry: PortEntry; target: ProcessIdentity }
  | {
      step: "force";
      entry: PortEntry;
      target: ProcessIdentity;
      authorization: string;
    };

export function useProcessTermination(refresh: () => Promise<void> | undefined) {
  const [dialog, setDialog] = useState<TerminationDialogState>();
  const [pendingPid, setPendingPid] = useState<number>();
  const [message, setMessage] = useState<string>();

  const requestTermination = useCallback((entry: PortEntry) => {
    if (pendingPid !== undefined) return;
    const target = terminationTarget(entry);
    if (!target) return;
    setMessage(undefined);
    setDialog({ step: "confirm", entry, target });
  }, [pendingPid]);

  const cancel = useCallback(() => {
    if (pendingPid === undefined) setDialog(undefined);
  }, [pendingPid]);

  const handleFailure = useCallback(
    async (cause: unknown) => {
      const code = errorCode(cause);
      setDialog(undefined);
      setMessage(terminationErrorMessage(cause));
      if (code === "process_no_longer_exists" || code === "process_identity_changed") {
        await refresh();
      }
    },
    [refresh],
  );

  const confirmGraceful = useCallback(async () => {
    if (!dialog || dialog.step !== "confirm" || pendingPid !== undefined) return;
    const request = dialog;
    setPendingPid(dialog.target.pid);
    setDialog(undefined);
    setMessage(undefined);
    try {
      const outcome = await terminateProcess(request.target);
      if (outcome.status === "still_running") {
        setDialog({
          step: "force",
          entry: request.entry,
          target: request.target,
          authorization: outcome.forceAuthorization,
        });
      } else {
        setDialog(undefined);
        if (outcome.status === "already_exited") {
          setMessage("The process had already exited. The port list was refreshed.");
        }
        await refresh();
      }
    } catch (cause) {
      await handleFailure(cause);
    } finally {
      setPendingPid(undefined);
    }
  }, [dialog, handleFailure, pendingPid, refresh]);

  const confirmForce = useCallback(async () => {
    if (!dialog || dialog.step !== "force" || pendingPid !== undefined) return;
    const request = dialog;
    setPendingPid(dialog.target.pid);
    setDialog(undefined);
    setMessage(undefined);
    try {
      const outcome = await forceTerminateProcess(request.target, request.authorization);
      if (outcome.status === "already_exited") {
        setMessage("The process had already exited. The port list was refreshed.");
      }
      await refresh();
    } catch (cause) {
      await handleFailure(cause);
    } finally {
      setPendingPid(undefined);
    }
  }, [dialog, handleFailure, pendingPid, refresh]);

  return {
    dialog,
    pendingPid,
    message,
    requestTermination,
    cancel,
    confirmGraceful,
    confirmForce,
  };
}
