import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../../lib/errors";
import type { PortEntry } from "../../types/ports";
import { ALL_PORTS_OPTIONS, listPorts } from "./api";

const REFRESH_EVENT = "portwatch://refresh-requested";

export function usePorts({
  automaticRefreshMilliseconds,
  automaticRefreshActive = false,
}: {
  automaticRefreshMilliseconds?: number;
  automaticRefreshActive?: boolean;
} = {}) {
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [lastRefreshed, setLastRefreshed] = useState<Date>();
  const portsRef = useRef<PortEntry[]>([]);
  const inFlightRef = useRef<Promise<void> | undefined>(undefined);
  const refreshAfterChangeRef = useRef<Promise<void> | undefined>(undefined);

  const refresh = useCallback(() => {
    if (inFlightRef.current) return inFlightRef.current;

    const hasResults = portsRef.current.length > 0;
    setError(undefined);
    setInitialLoading(!hasResults);
    setRefreshing(hasResults);

    const request = (async () => {
      try {
        const nextPorts = await listPorts(ALL_PORTS_OPTIONS);
        portsRef.current = nextPorts;
        setPorts(nextPorts);
        setLastRefreshed(new Date());
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    })();

    inFlightRef.current = request;
    void request.finally(() => {
      if (inFlightRef.current === request) inFlightRef.current = undefined;
    });
    return request;
  }, []);

  const refreshAfterChange = useCallback(() => {
    if (refreshAfterChangeRef.current) return refreshAfterChangeRef.current;
    const currentRequest = inFlightRef.current;
    if (!currentRequest) return refresh();

    const request = currentRequest.then(() => refresh());
    refreshAfterChangeRef.current = request;
    void request.finally(() => {
      if (refreshAfterChangeRef.current === request) refreshAfterChangeRef.current = undefined;
    });
    return request;
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unlisten = listen(REFRESH_EVENT, () => void refresh());
    return () => void unlisten.then((dispose) => dispose());
  }, [refresh]);

  useEffect(() => {
    if (!automaticRefreshActive || automaticRefreshMilliseconds === undefined) return;

    let cancelled = false;
    let timer = window.setTimeout(run, automaticRefreshMilliseconds);

    async function run() {
      await refresh();
      if (!cancelled) timer = window.setTimeout(run, automaticRefreshMilliseconds);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [automaticRefreshActive, automaticRefreshMilliseconds, refresh]);

  return {
    ports,
    initialLoading,
    refreshing,
    error,
    lastRefreshed,
    refresh,
    refreshAfterChange,
  };
}
