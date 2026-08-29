import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../../lib/errors";
import type { PortEntry, PortQueryOptions } from "../../types/ports";
import { listPorts } from "./api";

export function usePorts(options: PortQueryOptions) {
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      setPorts(await listPorts(options));
    } catch (cause) {
      setPorts([]);
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [options]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ports, loading, error, refresh };
}
