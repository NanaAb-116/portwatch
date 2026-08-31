import { describe, expect, it } from "vitest";
import type { PortEntry, PortSortKey } from "../../../types/ports";
import { filterPorts, nextSort, sortPorts } from "./ports";

const entries: PortEntry[] = [
  { port: 8080, protocol: "tcp", address: "::", state: "LISTEN", pid: 70, processName: "Zebra" },
  { port: 3000, protocol: "tcp", address: "127.0.0.1", state: "LISTEN", pid: 42, processName: "vite" },
  { port: 5353, protocol: "udp", address: "0.0.0.0", pid: 99, processName: "mDNSResponder" },
  { port: 4000, protocol: "udp", address: "::1" },
];

describe("port filtering", () => {
  it.each([
    ["3000", 3000],
    ["vite", 3000],
    ["42", 3000],
  ])("searches by %s", (query, expectedPort) => {
    expect(filterPorts(entries, { query, showTcp: true, showUdp: true }).map((entry) => entry.port)).toEqual([expectedPort]);
  });

  it("filters TCP, UDP, and both protocols together", () => {
    expect(filterPorts(entries, { query: "", showTcp: true, showUdp: false })).toHaveLength(2);
    expect(filterPorts(entries, { query: "", showTcp: false, showUdp: true })).toHaveLength(2);
    expect(filterPorts(entries, { query: "", showTcp: false, showUdp: false })).toEqual([]);
    expect(filterPorts(entries, { query: "", showTcp: true, showUdp: true })).toHaveLength(4);
  });
});

describe("port sorting", () => {
  it.each<[PortSortKey, Array<number | string>]>([
    ["port", [3000, 4000, 5353, 8080]],
    ["protocol", ["tcp", "tcp", "udp", "udp"]],
    ["processName", ["mDNSResponder", "vite", "Zebra", "missing"]],
    ["pid", [42, 70, 99, "missing"]],
    ["address", ["::", "::1", "0.0.0.0", "127.0.0.1"]],
  ])("sorts %s ascending deterministically", (key, expected) => {
    const sorted = sortPorts(entries, { key, direction: "ascending" });
    const values = sorted.map((entry) => entry[key] ?? "missing");
    expect(values).toEqual(expected);
  });

  it("toggles the active column and starts a new column ascending", () => {
    expect(nextSort({ key: "port", direction: "ascending" }, "port")).toEqual({ key: "port", direction: "descending" });
    expect(nextSort({ key: "port", direction: "descending" }, "pid")).toEqual({ key: "pid", direction: "ascending" });
  });

  it("keeps missing values last in both directions", () => {
    expect(sortPorts(entries, { key: "pid", direction: "ascending" }).at(-1)?.pid).toBeUndefined();
    expect(sortPorts(entries, { key: "pid", direction: "descending" }).at(-1)?.pid).toBeUndefined();
  });

  it("does not mutate provider results", () => {
    const original = [...entries];
    sortPorts(entries, { key: "port", direction: "ascending" });
    expect(entries).toEqual(original);
  });
});
