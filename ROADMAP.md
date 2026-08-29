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

## Phase 2 — Core interface

The Phase 1 proof interface exercises rendering, search, filters, refresh, and states, but these remain unchecked until the tray-first Phase 2 interface is complete.

- [ ] Create tray icon
- [ ] Create compact tray panel
- [ ] Create full window
- [ ] Render occupied ports
- [ ] Add search
- [ ] Add TCP/UDP filters
- [ ] Add sorting
- [ ] Add manual refresh
- [ ] Add loading, empty, and error states
- [ ] Add frontend tests

## Phase 3 — Safe termination

- [ ] Add process-controller abstraction
- [ ] Validate process identity
- [ ] Protect critical processes
- [ ] Prevent self-termination
- [ ] Add confirmation dialog
- [ ] Add graceful termination
- [ ] Add optional force termination after failure
- [ ] Handle permission errors
- [ ] Refresh after termination
- [ ] Add safe integration tests

## Phase 4 — Desktop polish

- [ ] Add local settings
- [ ] Add refresh intervals
- [ ] Add system/light/dark themes
- [ ] Evaluate launch at login
- [ ] Improve keyboard navigation
- [ ] Add accessible labels and focus management
- [ ] Measure idle CPU and memory usage
- [ ] Add icons and application metadata

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
