import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { PortEntry } from "./types/ports";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

const entries: PortEntry[] = [
  { port: 3000, protocol: "tcp", address: "127.0.0.1", state: "LISTEN", pid: 42, processName: "vite" },
  { port: 5353, protocol: "udp", address: "0.0.0.0", pid: 99, processName: "mDNSResponder" },
];

describe("PortWatch", () => {
  beforeEach(() => {
    invokeMock.mockReset().mockResolvedValue(entries);
  });

  it("renders discovered ports and their owners", async () => {
    render(<App />);
    expect(await screen.findByText("3000")).toBeInTheDocument();
    expect(screen.getByText("vite")).toBeInTheDocument();
    expect(screen.getByText("5353")).toBeInTheDocument();
  });

  it("searches by process name, port, and PID", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("vite");
    const search = screen.getByRole("searchbox");

    await user.type(search, "mdns");
    expect(screen.queryByText("vite")).not.toBeInTheDocument();
    expect(screen.getByText("mDNSResponder")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "42");
    expect(screen.getByText("vite")).toBeInTheDocument();
  });

  it("sends protocol filters to the backend", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("vite");
    await user.click(screen.getByLabelText("UDP"));

    await waitFor(() => expect(invokeMock).toHaveBeenLastCalledWith("list_ports", {
      options: { showTcp: true, showUdp: false, listeningOnly: true },
    }));
  });

  it("shows a loading and then empty state", async () => {
    let resolveRequest: (value: PortEntry[]) => void = () => undefined;
    invokeMock.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<App />);
    expect(screen.getByText("Inspecting listening ports…")).toBeInTheDocument();
    resolveRequest([]);
    expect(await screen.findByText("No occupied ports found")).toBeInTheDocument();
  });

  it("shows a safe permission message", async () => {
    invokeMock.mockRejectedValue({
      code: "permission_denied",
      details: { operation: "inspect_ports" },
    });
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not inspect every process");
  });
});
