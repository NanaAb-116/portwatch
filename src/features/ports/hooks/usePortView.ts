import { useMemo, useState } from "react";
import type { PortSort } from "../../../types/ports";
import { usePorts } from "../usePorts";
import { useProcessTermination } from "../../processes/useProcessTermination";
import { DEFAULT_SORT, filterPorts, sortPorts } from "../utilities/ports";
import { refreshIntervalMilliseconds } from "../../settings/model";
import { useSettings } from "../../settings/useSettings";
import { useWindowVisibility } from "../useWindowVisibility";

export function usePortView({ sortable = false }: { sortable?: boolean } = {}) {
  const { settings } = useSettings();
  const windowVisible = useWindowVisibility();
  const queryState = usePorts({
    automaticRefreshMilliseconds: refreshIntervalMilliseconds(settings.refreshInterval),
    automaticRefreshActive: windowVisible,
  });
  const termination = useProcessTermination(queryState.refreshAfterChange);
  const [query, setQuery] = useState("");
  const [showTcp, setShowTcp] = useState(true);
  const [showUdp, setShowUdp] = useState(true);
  const [sort, setSort] = useState<PortSort>(DEFAULT_SORT);

  const visiblePorts = useMemo(() => {
    const filtered = filterPorts(queryState.ports, { query, showTcp, showUdp });
    return sortable ? sortPorts(filtered, sort) : filtered;
  }, [queryState.ports, query, showTcp, showUdp, sortable, sort]);

  return {
    ...queryState,
    termination,
    visiblePorts,
    query,
    setQuery,
    showTcp,
    setShowTcp,
    showUdp,
    setShowUdp,
    sort,
    setSort,
  };
}
