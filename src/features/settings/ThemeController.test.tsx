import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { settingsStore } from "./store";
import { ThemeController } from "./ThemeController";

describe("theme controller", () => {
  let dark = false;
  let changeListener: ((event: { matches: boolean }) => void) | undefined;
  const removeEventListener = vi.fn();

  beforeEach(() => {
    dark = false;
    changeListener = undefined;
    removeEventListener.mockReset();
    vi.mocked(window.matchMedia).mockClear();
    vi.mocked(window.matchMedia).mockImplementation(() => ({
      matches: dark,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: vi.fn((_type, listener) => { changeListener = listener as typeof changeListener; }),
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("defaults to System and responds to live OS changes", () => {
    const view = render(<ThemeController />);
    expect(document.documentElement.dataset.theme).toBe("light");

    act(() => changeListener?.({ matches: true }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    view.unmount();
    expect(removeEventListener).toHaveBeenCalledOnce();
  });

  it("switches explicit Light, Dark, and back to System without extra listeners", () => {
    render(<ThemeController />);
    act(() => { expect(settingsStore.update({ theme: "dark" })).toBe(true); });
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => { expect(settingsStore.update({ theme: "light" })).toBe(true); });
    expect(document.documentElement.dataset.theme).toBe("light");

    dark = true;
    act(() => { expect(settingsStore.update({ theme: "system" })).toBe(true); });
    act(() => changeListener?.({ matches: true }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.matchMedia).toHaveBeenCalledTimes(2);
  });
});
