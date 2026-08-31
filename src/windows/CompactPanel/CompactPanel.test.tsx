import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortEntry } from "../../types/ports";
import { CompactPanel } from "./CompactPanel";

const { invokeMock, listenMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  listenMock: vi.fn().mockResolvedValue(() => undefined),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/api/event", () => ({ listen: listenMock }));

const entries: PortEntry[] = [
  { port: 3000, protocol: "tcp", address: "127.0.0.1", state: "LISTEN", pid: 42, processName: "vite" },
  { port: 5353, protocol: "udp", address: "0.0.0.0", pid: 99, processName: "mDNSResponder" },
];

function mockPorts(...responses: Array<PortEntry[] | Error | object | Promise<PortEntry[]>>) {
  const queue = [...responses];
  invokeMock.mockImplementation((command: string) => {
    if (command !== "list_ports") return Promise.resolve();
    const response = queue.shift() ?? [];
    if (response instanceof Error || (!Array.isArray(response) && !(response instanceof Promise))) return Promise.reject(response);
    return Promise.resolve(response);
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("compact panel", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockClear();
    mockPorts(entries);
  });

  it("renders compact results, count, and accessible controls", async () => {
    render(<CompactPanel />);
    expect(await screen.findByText("vite")).toBeInTheDocument();
    expect(screen.getByText("mDNSResponder")).toBeInTheDocument();
    expect(screen.getByText("2 results")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search by port, process, or PID" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TCP" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "UDP" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Refresh ports" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("filters by search and both protocol toggles", async () => {
    const user = userEvent.setup();
    render(<CompactPanel />);
    await screen.findByText("vite");
    await user.type(screen.getByRole("searchbox"), "5353");
    expect(screen.queryByText("vite")).not.toBeInTheDocument();
    expect(screen.getByText("mDNSResponder")).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));
    await user.click(screen.getByRole("button", { name: "TCP" }));
    expect(screen.queryByText("vite")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "UDP" }));
    expect(screen.getByText("Enable TCP or UDP to see results.")).toBeInTheDocument();
  });

  it("shows initial loading and then empty state", async () => {
    const request = deferred<PortEntry[]>();
    mockPorts(request.promise);
    render(<CompactPanel />);
    expect(screen.getByText("Inspecting listening ports…")).toBeInTheDocument();
    request.resolve([]);
    expect(await screen.findByText("No occupied ports found")).toBeInTheDocument();
    expect(screen.getByText("0 results")).toBeInTheDocument();
  });

  it("keeps stale results visible and marks a background refresh failure", async () => {
    const user = userEvent.setup();
    mockPorts(entries, new Error("native details must not leak"));
    render(<CompactPanel />);
    await screen.findByText("vite");
    await user.click(screen.getByRole("button", { name: "Refresh ports" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Showing results from the previous refresh");
    expect(screen.getByText("vite")).toBeInTheDocument();
    expect(screen.queryByText(/native details/)).not.toBeInTheDocument();
  });

  it("distinguishes a background refresh while retaining results", async () => {
    const user = userEvent.setup();
    const request = deferred<PortEntry[]>();
    mockPorts(entries, request.promise);
    render(<CompactPanel />);
    await screen.findByText("vite");
    await user.click(screen.getByRole("button", { name: "Refresh ports" }));
    expect(screen.getByText("Refreshing in background…")).toBeInTheDocument();
    expect(screen.getByText("vite")).toBeInTheDocument();
    request.resolve(entries);
    await waitFor(() => expect(screen.queryByText("Refreshing in background…")).not.toBeInTheDocument());
  });

  it("maps permission and general errors safely", async () => {
    mockPorts({ code: "permission_denied", details: { operation: "inspect_ports" } });
    const first = render(<CompactPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not inspect every process");
    first.unmount();
    mockPorts(new Error("private provider error"));
    render(<CompactPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not refresh the port list");
    expect(screen.queryByText(/private provider error/)).not.toBeInTheDocument();
  });

  it("routes refresh, open-full-view, Quit, and Escape interactions", async () => {
    const user = userEvent.setup();
    mockPorts(entries, entries);
    render(<CompactPanel />);
    await screen.findByText("vite");
    await user.click(screen.getByRole("button", { name: "Refresh ports" }));
    await user.click(screen.getByRole("button", { name: /Open full view/ }));
    await user.click(screen.getByRole("button", { name: "Quit" }));
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("open_full_view");
      expect(invokeMock).toHaveBeenCalledWith("quit_app");
      expect(invokeMock).toHaveBeenCalledWith("hide_compact_panel");
    });
    expect(invokeMock.mock.calls.filter(([command]) => command === "list_ports")).toHaveLength(2);
  });

  it("opens focused settings and updates personalization choices", async () => {
    const user = userEvent.setup();
    render(<CompactPanel />);
    await screen.findByText("vite");
    await user.click(screen.getByRole("button", { name: "Open settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close settings" })).toHaveFocus();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    await user.click(screen.getByRole("radio", { name: "10 seconds" }));
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "10 seconds" })).toBeChecked();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();
  });
});
