import type {
  PortEntry,
  PortSort,
  PortSortKey,
  SortDirection,
} from "../../../types/ports";

export type PortFilters = {
  query: string;
  showTcp: boolean;
  showUdp: boolean;
};

export const DEFAULT_SORT: PortSort = { key: "port", direction: "ascending" };

export function filterPorts(ports: PortEntry[], filters: PortFilters): PortEntry[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return ports.filter((entry) => {
    if (entry.protocol === "tcp" && !filters.showTcp) return false;
    if (entry.protocol === "udp" && !filters.showUdp) return false;
    if (!query) return true;
    return [entry.port, entry.pid, entry.processName]
      .filter((value) => value !== undefined)
      .some((value) => String(value).toLocaleLowerCase().includes(query));
  });
}

export function sortPorts(ports: PortEntry[], sort: PortSort): PortEntry[] {
  return [...ports].sort((left, right) => {
    const primary = compareField(left, right, sort.key, sort.direction);
    return primary || compareIdentity(left, right);
  });
}

export function nextSort(current: PortSort, key: PortSortKey): PortSort {
  return current.key === key
    ? {
        key,
        direction: current.direction === "ascending" ? "descending" : "ascending",
      }
    : { key, direction: "ascending" };
}

function compareField(
  left: PortEntry,
  right: PortEntry,
  key: PortSortKey,
  direction: SortDirection,
): number {
  const leftValue = left[key];
  const rightValue = right[key];
  if (leftValue === undefined && rightValue === undefined) return 0;
  if (leftValue === undefined) return 1;
  if (rightValue === undefined) return -1;

  const result = typeof leftValue === "number" && typeof rightValue === "number"
    ? leftValue - rightValue
    : String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: "base",
      });
  return direction === "ascending" ? result : -result;
}

function compareIdentity(left: PortEntry, right: PortEntry): number {
  return left.port - right.port
    || left.protocol.localeCompare(right.protocol)
    || left.address.localeCompare(right.address)
    || (left.pid ?? Number.MAX_SAFE_INTEGER) - (right.pid ?? Number.MAX_SAFE_INTEGER)
    || (left.processName ?? "").localeCompare(right.processName ?? "");
}
