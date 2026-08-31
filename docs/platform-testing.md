# Manual platform test checklists

Record OS version, CPU architecture, desktop environment where applicable, package type, tester, and date for each run. Automated tests and compilation are not runtime validation. Keep unchecked items unchecked until a person observes the behavior on that platform.

## Current validation status

| Platform | Automated status | Phase 2 runtime status | Phase 3 runtime status | Phase 4.1 runtime status |
| --- | --- | --- | --- | --- |
| macOS Apple Silicon | Local frontend/Rust tests and production compile pass | Awaiting manual validation | Awaiting manual validation | Awaiting manual validation |
| macOS Intel | CI matrix configured | Awaiting contributor validation | Awaiting contributor validation | Awaiting contributor validation |
| Windows | CI matrix configured | Awaiting contributor validation | Awaiting contributor validation | Awaiting contributor validation |
| Ubuntu Linux | CI matrix configured | Awaiting contributor validation | Awaiting contributor validation | Awaiting contributor validation |

Local nonvisual diagnostics on 2026-08-29 confirmed that `pnpm tauri dev` launches the arm64 binary on the Apple Silicon development host and macOS reports it as application type `UIElement`, consistent with the accessory activation policy. Screen-recording and UI-scripting permissions are unavailable in the development environment, so no visual or interaction checkbox below was marked from those diagnostics.

## Common discovery and interface checks

- [ ] Clean installation opens without a terminal.
- [ ] Tray/menu-bar icon appears and no unintended normal window opens at launch.
- [ ] A known TCP listener appears with the correct address and port.
- [ ] A bound UDP socket appears.
- [ ] PID and process name appear for a process owned by the current user.
- [ ] TCP and UDP filters independently and jointly show the expected protocols.
- [ ] Search finds port, PID, and process name.
- [ ] Refresh notices an opened and then closed test listener.
- [ ] Refresh controls remain responsive and do not start visibly overlapping requests.
- [ ] Existing results remain visible during a background refresh.
- [ ] A failed background refresh explains the error and retains stale results.
- [ ] Restricted process data is unavailable rather than invented.
- [ ] Permission and provider failures show safe, actionable messages.
- [ ] Every control is reachable with the keyboard and has a visible focus indicator.
- [ ] Screen-reader names, result-count announcements, and sortable-header state are sensible.
- [ ] Light and dark system appearances have sufficient contrast.

## macOS Apple Silicon

Environment: _not yet recorded_

Tester/date: Repository owner, 2026-08-29 (partial run)

Pre-fix observations: the compact window became visible but remained behind another application's active window, and it did not join VS Code's full-screen Space. The macOS adapter now applies compact-only full-screen/other-application collection behavior before explicit AppKit activation and ordering. The foreground/Space checks below remain unchecked until the repository owner repeats them; unit tests do not verify AppKit z-order.

- [ ] Launch with `pnpm tauri dev` on Apple Silicon.
- [x] PortWatch icon appears in the menu bar.
- [ ] No unnecessary permanent Dock icon appears during ordinary tray-only use.
- [ ] No visible panel or full window appears before activation.
- [x] Clicking the menu-bar icon opens the compact panel when no other application window obscures it.
- [ ] With another application's normal window active, clicking the menu-bar icon shows the compact panel above that window immediately.
- [x] With another application such as VS Code in macOS full-screen mode, clicking the menu-bar icon shows the compact panel above it without returning to the desktop.
- [ ] From a different macOS Space, clicking the menu-bar icon shows the compact panel on the active Space rather than its previous Space.
- [x] A second click toggles the compact panel closed.
- [x] Repeated activation reuses one compact window with no duplicates.
- [x] The compact panel is positioned near the menu-bar item.
- [ ] The panel remains inside the current screen's visible work area.
- [x] The panel hides when focus moves to another application.
- [x] Escape hides the compact panel.
- [ ] Search, TCP/UDP filters, result count, and refresh work in the panel.
- [ ] Opening the panel fetches current port information every time.
- [ ] **Open full view** hides the panel and opens the normal inspection window.
- [ ] The full view renders every record and all five sort columns work in both directions.
- [ ] The full view remains a normal window: it is not permanently above other applications and does not appear on every Space.
- [ ] Closing the full view keeps the menu-bar application running.
- [ ] Reopening the full view reuses it, preserves practical UI state, focuses it, and refreshes data.
- [ ] Tray **Refresh** refreshes whichever PortWatch view is visible.
- [ ] Explicit **Quit** exits the tray process completely.
- [ ] PortWatch relaunches successfully after explicit quit.
- [ ] Multiple-monitor activation positions and clamps the panel correctly, if multiple displays are available.
- [ ] Light and dark system appearances render correctly.

## Windows

Environment: _awaiting contributor_

Tester/date: _awaiting contributor_

- [ ] System-tray icon appears without an unwanted initial window.
- [ ] Left activation toggles or focuses the compact panel.
- [ ] Right-click tray menu contains **Show PortWatch Panel**, **Open PortWatch**, **Refresh**, and **Quit PortWatch**.
- [ ] Compact panel positioning is visible and clamped on primary and secondary monitors.
- [ ] Compact-panel focus loss and Escape hide the panel.
- [ ] Opening, closing, and reopening the full view reuses one window and keeps the tray process alive.
- [ ] Explicit quit exits cleanly and relaunch succeeds.
- [ ] Standard-user and administrator discovery visibility are compared without silent elevation.
- [ ] Unsigned-installer SmartScreen behavior is documented when bundles are tested.
- [ ] Complete the common interface checks above.

## Linux

Environment/desktop: _awaiting contributor_

Tester/date: _awaiting contributor_

Tauri 2 does not emit tray click events on Linux. Activation is therefore menu-driven. Tray availability and whether left or right click reveals the menu depend on the desktop environment and its AppIndicator/status-notifier host; some GNOME configurations require an extension.

- [ ] Tray icon and menu appear on at least one AppIndicator-compatible GNOME configuration.
- [ ] Tray icon and menu appear on KDE Plasma.
- [ ] **Show PortWatch Panel** opens or focuses the compact panel.
- [ ] **Open PortWatch** opens or focuses the full view.
- [ ] **Refresh** refreshes visible PortWatch views.
- [ ] Compact-panel fallback positioning remains visible and clamped.
- [ ] Closing and reopening either window reuses it and keeps the tray process alive.
- [ ] **Quit PortWatch** exits cleanly and relaunch succeeds.
- [ ] `/proc` visibility restrictions are observed without silent elevation.
- [ ] AppImage and `.deb` clean-install behavior is documented when bundles are tested.
- [ ] Complete the common interface checks above.

## Phase 3 safe-termination checklist

Record every target command, PID, port, and how it was created. Use only disposable processes started specifically for this test. Never select an existing system, session, work, or developer process merely to exercise an error path. Run this checklist independently on macOS, Windows, and Linux; automated coverage is not runtime validation.

### Safe disposable-process test

- [ ] Start a harmless local development or test server on an OS-assigned or otherwise known free port.
- [ ] Verify PortWatch detects the exact port, PID, and process name.
- [ ] Select **Terminate** and verify the initial confirmation names the real process, PID, and port.
- [ ] Verify **Force terminate** is not present in the initial confirmation.
- [ ] Cancel once and verify the process remains alive and the list is unchanged.
- [ ] Repeat the action, confirm graceful termination, and verify the server exits.
- [ ] Verify PortWatch refreshes only after backend verification and the port disappears naturally from discovery.
- [ ] Verify repeated clicks cannot start duplicate termination requests for the same PID while one is pending.

### Self-protection

- [ ] Through a debug test harness or direct typed-command invocation, submit PortWatch's own exact PID/name/start-time/path identity to the backend.
- [ ] Verify the backend returns `self_termination`, the application remains running, and no force option is issued.

The normal UI may not expose this row because PortWatch does not ordinarily listen on a port. Do not weaken the backend check or make PortWatch listen on a port solely for this manual test; the automated native-controller test also covers the policy.

### Already-exited and changed process

- [ ] Discover a disposable process, leave its PortWatch row visible, and stop it externally.
- [ ] If the stale row remains reproducible, select its termination action and verify PortWatch refuses safely, explains that it disappeared, and refreshes the list.
- [ ] In a debug harness, alter one expected identity field for a live disposable child and verify `process_identity_changed` is returned without signaling the child.

### Force termination

Use only a disposable test process designed to ignore or decline the platform's graceful request. On macOS/Linux this can be a test child that handles or ignores `SIGTERM`; on Windows use a disposable GUI test process that deliberately declines `WM_CLOSE`, or a background test child with no top-level window. Ensure the harness owns cleanup if the UI test is interrupted.

- [ ] Verify **Force terminate** is not initially visible.
- [ ] Confirm graceful termination and verify PortWatch waits for a short bounded period while the rest of the window remains usable.
- [ ] Verify the separate **Process is still running** dialog appears only after the graceful attempt fails.
- [ ] Verify the force warning mentions unsaved work/incomplete writes and focuses **Cancel**, not the destructive action.
- [ ] Cancel once and verify the process remains alive.
- [ ] Repeat the full graceful attempt, choose **Force terminate**, and verify the second confirmation is required.
- [ ] Verify the child exits and discovery refresh removes its port.
- [ ] Verify a force request without the one-use authorization, or reuse of a consumed authorization in a debug harness, returns `force_termination_not_authorized`.

### Permission handling

Where account controls make this practical, start a disposable server under a separate test account or elevated test session, then run PortWatch without those privileges. On Windows, compare an administrator-owned disposable child with standard-user PortWatch. On macOS/Linux, use a dedicated secondary account and a disposable child owned by it. Do not use a system process as the permission target.

- [ ] Attempt graceful termination and verify PortWatch shows a concise permission message without raw paths or OS error dumps.
- [ ] Verify PortWatch does not request elevation and does not display force termination after a permission failure.
- [ ] Verify the process remains alive, the current list remains visible, and ordinary discovery/refresh controls still work.

### Platform semantics

- [ ] macOS: verify a disposable GUI or terminal child receives `SIGTERM`; verify `SIGKILL` occurs only through the force flow.
- [ ] Linux: repeat the signal checks and record any `/proc` visibility limitations.
- [ ] Windows: verify a disposable top-level window receives `WM_CLOSE`; verify a background/no-window child naturally reaches the force-available state and `TerminateProcess` occurs only after confirmation.
- [ ] On every platform, confirm invalid PID, protected-process, stale identity, and unexpected failures use distinct safe messages in a debug harness. Do not target a real protected process to prove the protected-policy branch; use the automated policy tests.

## Phase 4.1 settings and personalization checklist

Run this checklist for both the compact panel and full window where applicable. Record settings before restart and after restart. Phase 4.1 launch-at-login is evaluation-only, so it has no runtime toggle to validate.

### Persistence

- [ ] Start PortWatch with no existing Phase 4.1 settings and verify Theme is **System** and Automatic refresh is **Off**.
- [ ] Select **Dark** and **10 seconds**, explicitly quit PortWatch, relaunch it, and verify both choices persist.
- [ ] Change the choices from the other window and verify the first open window updates without restart or reopening its settings dialog.
- [ ] Hide and reopen the compact panel and verify settings do not reset.
- [ ] In a disposable development profile, replace the stored settings value with malformed JSON and verify PortWatch recovers to defaults without crashing.
- [ ] In a disposable development profile, use a partial settings object and verify missing fields receive defaults while valid fields survive.

### Theme

- [ ] Select **System**, **Light**, **Dark**, then **System** and verify every change applies immediately.
- [ ] In System mode, switch macOS appearance between Light and Dark while PortWatch is running and verify the active window updates without restart.
- [ ] Verify the compact panel, full window, settings dialog, search, filters, process rows, protocol badges, termination dialogs, destructive/pending states, and loading/empty/error states remain legible in both effective themes.
- [ ] Verify changing explicit themes does not continue following OS changes until System is selected again.

### Automatic and manual refresh

- [ ] Select **5 seconds**, start and stop a harmless local listener externally, and verify the visible list updates automatically.
- [ ] Exercise **10**, **30**, and **60 seconds** long enough to confirm each approximate cadence once.
- [ ] Change from **5 seconds** to **10 seconds** and verify there is no leftover five-second schedule.
- [ ] Change to **Off**, alter the harmless listener again, and verify no automatic refresh occurs.
- [ ] With Automatic refresh Off, verify the window refresh button and tray **Refresh** still work.
- [ ] Make discovery slow or fail in a safe test harness and verify requests do not visibly overlap, errors do not stop later automatic refreshes, and old results remain visible.
- [ ] Hide the compact panel with automatic refresh enabled, wait longer than the interval, reopen it, and verify it refreshes on show without evidence of hidden periodic work.

### Multi-window and lifecycle regression

- [ ] Keep the full window open, open the compact panel, change a setting in either window, and verify the other reflects it immediately.
- [ ] Repeat compact show/hide activation and verify always-on-top, active-Space/full-screen-Space behavior, positioning, focus, Escape, and one-window reuse remain unchanged.
- [ ] Verify the full window remains a normal window and close/reopen still hides, reuses, focuses, and refreshes it.

### Termination regression

- [ ] With **5 seconds** selected, terminate only a disposable child server and verify the confirmation and pending states remain correct.
- [ ] Verify successful graceful termination refreshes immediately rather than waiting for the interval and removes the port.
- [ ] Repeat with a disposable force-flow target and verify the second confirmation remains required and the eventual refresh is consistent.
- [ ] Verify an automatic refresh during a termination attempt does not duplicate destructive actions or leave conflicting loading state.

### Launch at login evaluation

- [ ] Confirm there is no launch-at-login toggle in Phase 4.1 and PortWatch does not create or modify startup configuration.
- [ ] No packaged startup validation is required until the deferred official-plugin integration is implemented.

## Completion rule

Phase 2 may be called runtime-complete only after every implementation acceptance criterion and automated check passes and the macOS Apple Silicon section above has been manually completed. Phase 3 may be called runtime-validated on a platform only after its safe-termination checklist has been completed there with disposable targets. Phase 4.1 may be called runtime-validated on a platform only after its settings and personalization checklist has been completed there. CI compilation must be recorded as compilation only; it cannot be used to check Windows or Linux runtime boxes.
