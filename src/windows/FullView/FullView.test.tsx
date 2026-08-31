import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortEntry } from "../../types/ports";
import { FullView } from "./FullView";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn().mockResolvedValue(() => undefined) }));

const entries: PortEntry[] = [
  { port: 9000, protocol: "udp", address: "::", pid: 90, processName: "worker", processStartTime: 900 },
  { port: 3000, protocol: "tcp", address: "127.0.0.1", state: "LISTEN", pid: 42, processName: "vite", executablePath: "/usr/bin/vite", processStartTime: 420 },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("full view", () => {
  beforeEach(() => {
    invokeMock.mockReset().mockImplementation((command: string) => command === "list_ports" ? Promise.resolve(entries) : Promise.resolve());
  });

  it("renders the complete table and refresh metadata", async () => {
    render(<FullView />);
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByText("worker")).toBeInTheDocument();
    expect(screen.getByText("LISTEN")).toBeInTheDocument();
    expect(screen.getByText("2 results")).toBeInTheDocument();
    expect(screen.getByText(/Last refreshed/)).toBeInTheDocument();
  });

  it("exposes aria-sort and toggles ascending and descending", async () => {
    const user = userEvent.setup();
    render(<FullView />);
    await screen.findByText("vite");
    const portHeader = screen.getByRole("columnheader", { name: /Port/ });
    expect(portHeader).toHaveAttribute("aria-sort", "ascending");
    await user.click(screen.getByRole("button", { name: /Port/ }));
    expect(portHeader).toHaveAttribute("aria-sort", "descending");
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("9000");
  });

  it.each(["Protocol", "Process", "PID", "Address"])("sorts using the %s header", async (label) => {
    const user = userEvent.setup();
    render(<FullView />);
    await screen.findByText("vite");
    await user.click(screen.getByRole("button", { name: new RegExp(label) }));
    expect(screen.getByRole("columnheader", { name: new RegExp(label) })).toHaveAttribute("aria-sort", "ascending");
  });

  it("supports keyboard activation of sortable headers", async () => {
    const user = userEvent.setup();
    render(<FullView />);
    await screen.findByText("vite");
    const processSort = screen.getByRole("button", { name: /Process/ });
    processSort.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("columnheader", { name: /Process/ })).toHaveAttribute("aria-sort", "ascending");
  });

  it("shows a focused, keyboard-dismissible confirmation before terminating", async () => {
    const user = userEvent.setup();
    render(<FullView />);
    await screen.findByText("vite");
    expect(screen.queryByRole("button", { name: "Force terminate" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Terminate vite on port 3000" }));
    expect(screen.getByRole("dialog", { name: "Terminate process?" })).toHaveTextContent("vite (PID 42) is using port 3000");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith("terminate_process", expect.anything());
  });

  it("refreshes only after backend-verified graceful termination", async () => {
    const user = userEvent.setup();
    let listCalls = 0;
    invokeMock.mockImplementation((command: string) => {
      if (command === "list_ports") {
        listCalls += 1;
        return Promise.resolve(listCalls === 1 ? entries : entries.filter((entry) => entry.pid !== 42));
      }
      if (command === "terminate_process") return Promise.resolve({ status: "terminated" });
      return Promise.resolve();
    });
    render(<FullView />);
    await screen.findByText("vite");

    await user.click(screen.getByRole("button", { name: "Terminate vite on port 3000" }));
    await user.click(screen.getByRole("button", { name: "Terminate" }));

    await waitFor(() => expect(screen.queryByText("vite")).not.toBeInTheDocument());
    expect(listCalls).toBe(2);
    expect(invokeMock).toHaveBeenCalledWith("terminate_process", {
      request: {
        target: {
          pid: 42,
          processName: "vite",
          executablePath: "/usr/bin/vite",
          startTime: 420,
        },
      },
    });
  });

  it("keeps non-destructive controls usable while preventing duplicate termination", async () => {
    const user = userEvent.setup();
    const termination = deferred<{ status: "terminated" }>();
    invokeMock.mockImplementation((command: string) => {
      if (command === "list_ports") return Promise.resolve(entries);
      if (command === "terminate_process") return termination.promise;
      return Promise.resolve();
    });
    render(<FullView />);
    await screen.findByText("vite");
    await user.click(screen.getByRole("button", { name: "Terminate vite on port 3000" }));
    await user.click(screen.getByRole("button", { name: "Terminate" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terminate vite on port 3000" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Terminate worker on port 9000" })).toBeDisabled();
    expect(screen.getByRole("searchbox")).toBeEnabled();
    expect(invokeMock.mock.calls.filter(([command]) => command === "terminate_process")).toHaveLength(1);

    termination.resolve({ status: "terminated" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Terminate vite on port 3000" })).toBeEnabled());
  });

  it("offers force termination only after graceful failure and requires a second confirmation", async () => {
    const user = userEvent.setup();
    invokeMock.mockImplementation((command: string) => {
      if (command === "list_ports") return Promise.resolve(entries);
      if (command === "terminate_process") {
        return Promise.resolve({ status: "still_running", forceAuthorization: "ticket-42" });
      }
      if (command === "force_terminate_process") return Promise.resolve({ status: "terminated" });
      return Promise.resolve();
    });
    render(<FullView />);
    await screen.findByText("vite");

    await user.click(screen.getByRole("button", { name: "Terminate vite on port 3000" }));
    expect(screen.queryByRole("button", { name: "Force terminate" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Terminate" }));

    expect(await screen.findByRole("dialog", { name: "Process is still running" })).toHaveTextContent("unsaved work");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Force terminate" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(invokeMock).toHaveBeenCalledWith("force_terminate_process", {
      request: {
        target: {
          pid: 42,
          processName: "vite",
          executablePath: "/usr/bin/vite",
          startTime: 420,
        },
        authorization: "ticket-42",
      },
    });
  });

  it("maps termination errors safely and refreshes a stale process", async () => {
    const user = userEvent.setup();
    let listCalls = 0;
    invokeMock.mockImplementation((command: string) => {
      if (command === "list_ports") {
        listCalls += 1;
        return Promise.resolve(listCalls === 1 ? entries : entries.slice(0, 1));
      }
      if (command === "terminate_process") {
        return Promise.reject({ code: "process_identity_changed", details: { pid: 42 } });
      }
      return Promise.resolve();
    });
    render(<FullView />);
    await screen.findByText("vite");
    await user.click(screen.getByRole("button", { name: "Terminate vite on port 3000" }));
    await user.click(screen.getByRole("button", { name: "Terminate" }));

    expect(await screen.findByRole("status")).toHaveTextContent("changed since it was discovered");
    expect(screen.queryByText("vite")).not.toBeInTheDocument();
    expect(listCalls).toBe(2);
  });

  it("retains results and explains permission failures without leaking details", async () => {
    const user = userEvent.setup();
    invokeMock.mockImplementation((command: string) => {
      if (command === "list_ports") return Promise.resolve(entries);
      if (command === "terminate_process") {
        return Promise.reject({ code: "permission_denied", details: { operation: "/private/native" } });
      }
      return Promise.resolve();
    });
    render(<FullView />);
    await screen.findByText("vite");
    await user.click(screen.getByRole("button", { name: "Terminate vite on port 3000" }));
    await user.click(screen.getByRole("button", { name: "Terminate" }));

    expect(await screen.findByRole("status")).toHaveTextContent("denied permission");
    expect(screen.getByText("vite")).toBeInTheDocument();
    expect(screen.queryByText(/private\/native/)).not.toBeInTheDocument();
  });
});
