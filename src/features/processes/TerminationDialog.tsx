import { useEffect, useRef, type KeyboardEvent } from "react";
import type { TerminationDialogState } from "./useProcessTermination";

export function TerminationDialog({
  state,
  pending,
  onCancel,
  onConfirmGraceful,
  onConfirmForce,
}: {
  state: TerminationDialogState;
  pending: boolean;
  onCancel: () => void;
  onConfirmGraceful: () => void;
  onConfirmForce: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const destructiveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previousFocus?.focus();
  }, [state.step]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !pending) {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === cancelRef.current) {
      event.preventDefault();
      destructiveRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === destructiveRef.current) {
      event.preventDefault();
      cancelRef.current?.focus();
    }
  };

  const name = state.target.processName;
  const force = state.step === "force";
  const titleId = "termination-dialog-title";
  const descriptionId = "termination-dialog-description";

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
      >
        <div className="dialog-icon" aria-hidden="true">!</div>
        <h2 id={titleId}>{force ? "Process is still running" : "Terminate process?"}</h2>
        <div id={descriptionId} className="dialog-copy">
          {force ? (
            <>
              <p>PortWatch could not stop <strong>{name}</strong> gracefully.</p>
              <p>Force terminating it may cause unsaved work, incomplete writes, or corrupted state.</p>
            </>
          ) : (
            <>
              <p><strong>{name}</strong> (PID {state.target.pid}) is using port <strong>{state.entry.port}</strong>.</p>
              <p>Terminating it may stop a running application, development server, or background service.</p>
            </>
          )}
        </div>
        <div className="dialog-actions">
          <button ref={cancelRef} className="button" type="button" onClick={onCancel} disabled={pending}>Cancel</button>
          <button
            ref={destructiveRef}
            className="button button--danger"
            type="button"
            onClick={force ? onConfirmForce : onConfirmGraceful}
            disabled={pending}
          >
            {pending ? (force ? "Force terminating…" : "Terminating…") : (force ? "Force terminate" : "Terminate")}
          </button>
        </div>
      </div>
    </div>
  );
}

