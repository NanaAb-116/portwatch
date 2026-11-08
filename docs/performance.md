# Idle resource usage

## Method (macOS)

1. Build the release binary: `pnpm tauri build --no-bundle`.
2. Record existing WebKit helper PIDs (`pgrep -f com.apple.WebKit`), launch `src-tauri/target/release/portwatch`, wait 15 seconds, and treat the new WebKit helper PIDs as PortWatch's.
3. With both windows hidden and automatic refresh **Off** (the default), record cumulative CPU time (`ps -o time=`) and physical footprint (`footprint -p <pid>`, the value Activity Monitor shows as Memory) for the app and its helpers. Repeat after 120 seconds.

## Results

2026-11-08, macOS 26.6.2, Apple Silicon, release build of `main` plus pending changes:

| Process | CPU time gained over 120 s | Physical footprint |
| --- | --- | --- |
| `portwatch` (Rust/Tauri) | 0.00 s | 27 MB |
| WebKit WebContent (window 1) | 0.00 s | 65 MB |
| WebKit WebContent (window 2) | 0.00 s | 34 MB |
| WebKit GPU | 0.00 s | 14 MB |
| WebKit Networking | 0.00 s | 6 MB |
| **Total** | **< 0.01% CPU** | **≈ 146 MB** |

Footprints were unchanged between the two samples, so no idle growth was observed in that window.

## Notes

- Idle CPU is effectively zero because hidden windows suspend automatic refresh and nothing polls in the background.
- Most memory is the two WebKit content processes: both the compact panel and the full window are created hidden at launch. Creating the full window on first use would likely save roughly 35–65 MB; that is a possible later optimization, not a requirement.
- Not yet measured: memory after hours of uptime, CPU with a window visible and 5-second automatic refresh, Windows (WebView2), and Linux (WebKitGTK).
