import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PortEntry } from "../../types/ports";
import { usePorts } from "./usePorts";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn().mockResolvedValue(() => undefined) }));

const entries: PortEntry[] = [
  { port: 3000, protocol: "tcp", address: "127.0.0.1", pid: 42, processName: "vite" },
];

function Harness({ interval, active = true }: { interval?: number; active?: boolean }) {
  const ports = usePorts({
    automaticRefreshMilliseconds: interval,
    automaticRefreshActive: active,
  });
  return (
    <div>
      <span>{ports.ports.length}</span>
      <button type="button" onClick={() => void ports.refresh()}>Manual refresh</button>
      <button type="button" onClick={() => void ports.refreshAfterChange()}>Refresh latest state</button>
    </div>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("automatic port refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invokeMock.mockReset().mockResolvedValue(entries);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates no automatic refresh when Off", async () => {
    render(<Harness />);
    await settle();
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes after five seconds and changes schedules cleanly", async () => {
    const view = render(<Harness interval={5_000} />);
    await settle();
    await act(async () => vi.advanceTimersByTimeAsync(4_999));
    expect(invokeMock).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(invokeMock).toHaveBeenCalledTimes(2);

    view.rerender(<Harness interval={10_000} />);
    await act(async () => vi.advanceTimersByTimeAsync(9_999));
    expect(invokeMock).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });

  it("disables and cleans up timers without accumulation", async () => {
    const view = render(<Harness interval={5_000} />);
    await settle();
    view.rerender(<Harness interval={10_000} />);
    view.rerender(<Harness active={false} interval={10_000} />);
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(invokeMock).toHaveBeenCalledTimes(1);

    view.rerender(<Harness interval={5_000} />);
    view.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("does not overlap slow requests and resumes after completion", async () => {
    const slow = deferred<PortEntry[]>();
    invokeMock
      .mockResolvedValueOnce(entries)
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValue(entries);
    render(<Harness interval={5_000} />);
    await settle();
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(invokeMock).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(invokeMock).toHaveBeenCalledTimes(2);

    await act(async () => slow.resolve(entries));
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });

  it("coalesces a change-triggered refresh behind an in-flight discovery", async () => {
    const slow = deferred<PortEntry[]>();
    invokeMock
      .mockResolvedValueOnce(entries)
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValue(entries);
    render(<Harness interval={5_000} />);
    await settle();
    await act(async () => vi.advanceTimersByTimeAsync(5_000));

    fireEvent.click(screen.getByRole("button", { name: "Refresh latest state" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh latest state" }));
    expect(invokeMock).toHaveBeenCalledTimes(2);
    await act(async () => slow.resolve(entries));
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });

  it("recovers after failure and keeps manual refresh available", async () => {
    invokeMock
      .mockResolvedValueOnce(entries)
      .mockRejectedValueOnce(new Error("provider failed"))
      .mockResolvedValue(entries);
    render(<Harness interval={5_000} />);
    await settle();
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(invokeMock).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(invokeMock).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
    await userEvent.setup().click(screen.getByRole("button", { name: "Manual refresh" }));
    expect(invokeMock).toHaveBeenCalledTimes(4);
  });
});
