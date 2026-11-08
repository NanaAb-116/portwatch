# Changelog

All notable changes will be documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and intends to use semantic versioning.

## [Unreleased]

## [0.1.0] - 2026-11-08

### Fixed

- Exclude non-actionable TCP and UDP records whose local port is `0`.
- Include the PortWatch application icon in macOS, Windows, and Linux bundles; installed apps previously showed a generic icon.
- Ad-hoc sign the macOS app bundle when no Developer ID is configured so downloaded Apple Silicon builds have a valid sealed signature.
- Build macOS releases on the supported `macos-15` (Apple Silicon) and `macos-15-intel` runners instead of the retired `macos-14` and `macos-13` runners.
- Add a compact-only macOS AppKit foreground/full-screen-Space fallback for deliberate tray activation, while preserving accessory/UIElement operation.

### Added

- Keyboard shortcuts in both windows: **Cmd+F** / **Ctrl+F** focuses search, **Cmd+R** / **Ctrl+R** refreshes, and **Up**/**Down** move between search and each row's **Terminate** button.
- Accessible names for the port table, protocol filter group, and settings radio groups; termination confirmations are announced as alert dialogs.
- A typed, versioned local settings model with safe defaults, partial-value migration, corrupt-data recovery, write-failure feedback, and live synchronization between compact and full windows.
- System, Light, and Dark appearance choices backed by semantic color tokens; System follows operating-system appearance changes while PortWatch is running.
- Automatic refresh choices for Off, 5, 10, 30, and 60 seconds, with visibility-aware scheduling, overlap prevention, timer cleanup, failure recovery, and a trailing refresh after successful process termination when needed.
- A focused settings dialog available from both the compact panel and full window.
- Tauri 2, React, TypeScript, Vite, and pnpm project foundation.
- Native TCP/UDP socket discovery with owning PID and process metadata when available.
- Filtering, normalization, deterministic sorting, and careful deduplication.
- Minimal searchable interface proving Rust-to-React port data flow.
- Typed backend errors and safe frontend error messages.
- Frontend and Rust tests, repository documentation, CI, and release foundations.
- Tray-first lifecycle with a reusable compact panel and full inspection window.
- Tray actions for showing the panel, opening the full view, refreshing visible views, and quitting explicitly.
- Monitor-aware compact-panel positioning with visible-work-area clamping and a predictable fallback.
- Compact port rows, an accessible sortable full table, last-refreshed metadata, and result counts.
- Shared search, TCP/UDP filtering, deterministic sorting, refresh, and safe stale-result behavior across both views.
- Keyboard focus states, compact-panel Escape handling, live status announcements, system light/dark styling, and reduced-motion support.
- A platform-neutral process-controller boundary with PID/name/start-time/executable identity revalidation before every termination attempt.
- A centralized platform-aware policy that refuses invalid, self, and critical-process targets.
- Accessible graceful-termination confirmation in both views, with per-process pending state and automatic discovery refresh after verified exit.
- A separately confirmed force-termination flow backed by a one-use authorization issued only after graceful termination leaves the process running.
- Native `SIGTERM`/`SIGKILL` process control on macOS and Linux and `WM_CLOSE`/`TerminateProcess` control on Windows.
- Safe process-control integration coverage that spawns, targets, and cleans up its own disposable child.

### Changed

- Focus indicators are solid and meet 3:1 contrast, and secondary text and placeholders meet 4.5:1 contrast in both themes.
- Screen readers announce only result-count changes, not every background refresh.
- After a terminated process disappears from the list, keyboard focus returns to search instead of being lost.
- Native window lifecycle handling now reports visibility to each webview so hidden windows can suspend automatic refresh without changing the established show, focus, workspace, or refresh sequence.
- Window close requests now hide and reuse PortWatch windows so the tray process keeps running.
- macOS runs with the supported accessory activation policy for menu-bar-first operation.
- Frontend capabilities are narrowed from the complete core default set to only core event listening; lifecycle mutations remain behind registered Rust commands.
- Port discovery now includes process start time when available so later termination requests can detect stale or reused PIDs.
