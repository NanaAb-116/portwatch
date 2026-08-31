# PortWatch roadmap

Checkboxes indicate implemented work, not cross-platform validation. See `docs/platform-testing.md` for validation status.

## Phase 0 — Foundation

- [x] Initialize Tauri 2, React, TypeScript, Vite, and pnpm
- [x] Establish formatting and linting
- [x] Add test frameworks
- [x] Add repository documentation
- [x] Add shared frontend/Rust types
- [x] Add typed error model
- [x] Add CI foundation

## Phase 1 — Port discovery

- [x] Define the port-provider interface
- [x] Implement macOS discovery
- [x] Implement Windows discovery
- [x] Implement Linux discovery
- [x] Resolve PIDs and process names
- [x] Normalize platform results
- [x] Add filtering and deduplication
- [x] Add Rust tests
- [x] Document platform differences

## Phase 2 — Tray-first interface

The Phase 1 proof interface exercises rendering, search, filters, refresh, and states, but these remain unchecked until the tray-first Phase 2 interface is complete.

- [x] Create tray icon
- [x] Create compact tray panel
- [x] Create full window
- [x] Render occupied ports
- [x] Add search
- [x] Add TCP/UDP filters
- [x] Add sorting
- [x] Add manual refresh
- [x] Add loading, empty, and error states
- [x] Add frontend tests

The implementation checklist is complete. Phase 2 is not considered runtime-validated until the Apple Silicon manual checklist passes; Windows and Linux still require contributor runtime validation.

## Phase 3 — Safe termination

- [x] Add process-controller abstraction
- [x] Validate process identity
- [x] Protect critical processes
- [x] Prevent self-termination
- [x] Add confirmation dialog
- [x] Add graceful termination
- [x] Add optional force termination after failure
- [x] Handle permission errors
- [x] Refresh after termination
- [x] Add safe integration tests

The implementation checklist is complete. Phase 3 remains runtime-unvalidated until the platform checklist is completed; automated tests terminate only a child process spawned and owned by the test.

## Phase 4 — Desktop polish

- [x] Add local settings
- [x] Add refresh intervals
- [x] Add system/light/dark themes
- [x] Evaluate launch at login
- [ ] Improve keyboard navigation
- [ ] Add accessible labels and focus management
- [ ] Measure idle CPU and memory usage
- [ ] Add icons and application metadata

Phase 4.1 is implemented and ready for manual validation. Launch at login was evaluated against the official Tauri 2 autostart plugin and deferred until packaged application paths and startup behavior can be validated on macOS, Windows, and the supported Linux package formats. The unchecked work above remains scoped to later Phase 4.2 and 4.3 slices.

## Phase 5 — Distribution

- [x] Add cross-platform build matrix foundation
- [ ] Produce GitHub Release artifacts
- [x] Document code signing and notarization
- [ ] Test clean installations
- [ ] Add release checklist
- [ ] Publish `v0.1.0`

## Later possibilities

- [ ] Homebrew formula
- [ ] Winget or Scoop package
- [ ] Automatic updates
- [ ] Port change notifications
- [ ] Favorites
- [ ] Recently released ports
- [ ] Command-line companion
- [ ] Localization
