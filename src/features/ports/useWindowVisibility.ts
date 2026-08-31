import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { currentWindowIsVisible } from "../../lib/desktop";

const VISIBILITY_EVENT = "portwatch://window-visibility-changed";

export function useWindowVisibility() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let disposed = false;
    let disposeListener: (() => void) | undefined;

    void listen<boolean>(VISIBILITY_EVENT, (event) => {
      if (!disposed) setVisible(event.payload);
    }).then((dispose) => {
      if (disposed) dispose();
      else disposeListener = dispose;
    });

    void currentWindowIsVisible()
      .then((isVisible) => {
        if (!disposed) setVisible(isVisible);
      })
      .catch(() => {
        if (!disposed) setVisible(false);
      });

    return () => {
      disposed = true;
      disposeListener?.();
    };
  }, []);

  return visible;
}
