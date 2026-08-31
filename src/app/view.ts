export type PortWatchView = "compact" | "full";

export function viewFromSearch(search: string): PortWatchView {
  return new URLSearchParams(search).get("view") === "compact" ? "compact" : "full";
}
