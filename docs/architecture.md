# Architecture

## Scope

PortWatch has one bounded purpose: enumerate occupied local ports and safely release them. React owns presentation; Rust owns all operating-system access. No frontend API accepts a command string or shell fragment.

## Discovery flow

```text
Shared React port-query hook
    -> invoke("list_ports", PortQueryOptions)
        -> Tauri command adapter
            -> PortProvider trait
                -> NativePortProvider
                    -> netstat2 native socket APIs
                    -> sysinfo process metadata
            -> normalized Vec<PortEntry>
    <- typed result or safe PortWatchError
```

The provider trait is the replacement seam if a dependency becomes unreliable on one platform. `src-tauri/src/platform` records explicit compilation targets and is reserved for platform-specific providers without changing command or UI contracts.

## Safe termination flow

```text
Port row action
    -> accessible confirmation dialog
        -> invoke("terminate_process", expected process identity)
            -> ProcessController
                -> re-resolve PID/name/start time/path
                -> self + critical-process safety policy
                -> platform graceful request
                -> bounded exit verification
            <- terminated | already exited | still running + one-use authorization
        -> refresh existing port-query hook after verified exit

Only after `still running` and a second warning:
    -> invoke("force_terminate_process", identity + authorization)
        -> consume authorization
        -> repeat identity and safety validation
        -> platform force termination
        -> bounded exit verification
        -> refresh existing port-query hook after verified exit
```

`ProcessController` is separate from `PortProvider`: discovery data is an expected identity, never authority to signal a PID. The expected identity includes PID, process name, start time, and executable path when the OS supplied one. Missing name/start time makes a row non-actionable; a previously known executable that becomes unavailable causes a safe refusal. Start time plus metadata is the strongest portable identity exposed by the selected process library. There is still an unavoidable, very small time-of-check/time-of-use interval on PID-based operating-system APIs.

The centralized safety policy always rejects PID 0 and the PortWatch PID. It conservatively protects bootstrap/kernel PIDs and a short documented set of core platform session/service processes. The list intentionally remains small: PortWatch cannot infer whether an otherwise ordinary process contains unsaved work or is important to a user's environment, which is why confirmation remains mandatory.

On macOS and Linux, graceful termination sends `SIGTERM` and force termination sends `SIGKILL`. On Windows, the graceful adapter posts `WM_CLOSE` to top-level windows owned by the PID; a console or background process may therefore remain alive. The force adapter calls `OpenProcess` with only termination rights and then `TerminateProcess`. PortWatch does not invoke `kill`, `taskkill`, or any other shell command. All waits run off the Tauri command thread, poll briefly, and stop after 1.5 seconds.

Force termination cannot be invoked as a raw PID primitive. A one-use backend authorization bound to the complete expected identity is created only after a real graceful attempt returns `still_running`. The force command consumes it before repeating validation, so a frontend call cannot skip directly to force termination. Permission, disappeared/stale identity, self, protected, graceful, force, unsupported, and unexpected failures remain distinct serialized error codes; raw OS diagnostics are not user-facing.

Unit tests cover identity comparison, safety policy, authorization state, and frontend transitions. The native integration test launches a second copy of the Rust test executable in a dedicated sleeping test, targets only that recorded child identity, and owns a cleanup guard. Platform runtime behavior remains a manual-validation item.

## Phase 4.1 settings and personalization

```text
Typed AppSettings schema + defaults
    -> LocalSettingsRepository (one versioned PortWatch key)
        -> reactive SettingsStore in each webview
            -> browser storage event synchronization
                -> compact settings UI + full settings UI
                -> effective theme controller
                -> existing port-query refresh coordinator
```

`AppSettings` is the only persisted settings shape. It currently contains `theme` (`system`, `light`, or `dark`) and a named refresh interval (`off`, `5s`, `10s`, `30s`, or `60s`). Consumers use the model's interval conversion rather than embedding milliseconds. Defaults are System and Off. Loading normalizes individual fields and merges partial or older objects with current defaults. Malformed JSON is repaired to defaults; inaccessible storage falls back safely. A failed write leaves the previous active value in place and surfaces a safe settings error rather than pretending the change persisted.

Persistence uses the webview's origin-scoped `localStorage` under `dev.portwatch.desktop.settings.v1`. This is durable across application restarts, scoped to PortWatch's stable Tauri application origin, and requires no filesystem capability or database. Components never access the key directly. Each renderer owns a reactive instance of the same store/repository abstraction; updates notify same-window subscribers immediately, while the standard same-origin `storage` event reloads the authoritative serialized value in the other open window without polling.

The theme controller resolves System with `matchMedia("(prefers-color-scheme: dark)")`, registers one change listener, and removes it on unmount. The resolved `light` or `dark` value is applied to the root element before the React tree mounts and whenever either the setting or OS appearance changes. All surfaces use semantic CSS variables for backgrounds, text, borders, interaction states, protocol badges, destructive states, inputs, dialogs, and focus styling.

Automatic refresh remains part of `usePorts`; it does not create another discovery path. A recursive timeout waits for the current request to finish before scheduling the next interval, so slow or failed discovery cannot overlap or accumulate work. Settings changes and unmounting cancel the previous timeout. Manual, native lifecycle, and automatic requests share the same in-flight coordinator. Successful termination uses a `refreshAfterChange` path: it refreshes immediately when idle or coalesces exactly one trailing request behind an already-running discovery, ensuring pre-termination results do not become the final state.

Native lifecycle code emits `portwatch://window-visibility-changed` after the existing show or hide operation, and the narrow `current_window_is_visible` command establishes initial state. Automatic timers run only while their window is visible. The established compact presentation sequence—always-on-top, workspace policy, unminimize, show, focus, native macOS foregrounding, and lifecycle refresh—remains otherwise unchanged.

### Launch at login evaluation

The official [Tauri 2 autostart plugin](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/autostart) supports macOS, Windows, and Linux, requires the project's existing Rust 1.77.2 floor, and exposes enable, disable, and current-state queries. Its default macOS mechanism is a LaunchAgent, and its registration is built from the running executable path. If adopted, PortWatch should wrap those operations in narrow Rust commands, keep the default off, re-query actual OS state after every mutation, and add only the required plugin permissions.

Implementation is deferred in Phase 4.1 because PortWatch does not yet have runtime-validated packaged artifacts. Registering a `tauri dev` or `--no-bundle` executable would create an unreliable startup entry, and supported Linux packaging must account for package-specific launch paths; the upstream project also records a current [Flatpak path limitation](https://github.com/tauri-apps/plugins-workspace/issues/3166). Adding a toggle before packaged macOS, Windows, AppImage/`.deb`, and any future Flatpak behavior can be tested would violate the requirement that the displayed state reflect a reliable system registration. No launch-at-login setting, dependency, permission, or UI control is included yet.

## Dependency decisions

### Socket and PID discovery: `netstat2` 0.11.2

Selected after checking the crate documentation, source repository, release activity, and supported implementations on 2026-08-29. Version 0.11.2 was published on 2025-08-14. It uses low-level OS interfaces instead of parsing commands:

- Windows: `GetExtendedTcpTable` and `GetExtendedUdpTable` from IP Helper.
- Linux: `NETLINK_INET_DIAG`, with `/proc` traversal for PID ownership.
- macOS: `proc_pidfdinfo`.

This is the smallest dependable shared API found that provides protocol, local address, port, TCP state, and associated PIDs across all required platforms. Shell-based `lsof`, `ss`, and `netstat` parsing was rejected because availability, localization, output, and permissions differ. A broader packet-monitoring crate was rejected as outside PortWatch's scope.

Sources: [netstat2 API documentation](https://docs.rs/netstat2/0.11.2/netstat2/), [netstat2 repository and platform details](https://github.com/ohadravid/netstat2-rs), [0.11.2 release commit](https://github.com/ohadravid/netstat2-rs/commit/22b77d7d9683a8d88315729c9478750b3cd03f50).

### Process metadata: `sysinfo` 0.39.6

Selected to resolve each already-discovered PID to a process name, start time, and optional executable path, and to re-resolve those fields before process control. It is not used to send signals or terminate processes. Default features are disabled and only the `system` feature is enabled. This avoids separate ToolHelp, procfs, and libproc metadata implementations while retaining a future replacement seam. Usernames are currently unavailable rather than fabricated.

Source: [sysinfo repository](https://github.com/GuillaumeGomez/sysinfo), [sysinfo API documentation](https://docs.rs/sysinfo/0.39.6/sysinfo/).

## Data rules

- The initial view includes TCP sockets in `LISTEN` and all bound UDP sockets; UDP has no TCP-equivalent listening state.
- One entry is emitted per associated PID. An unowned/hidden socket is emitted once with no PID.
- Records with local port `0` are discarded at the final normalization boundary because they do not identify an actionable occupied service port.
- Deduplication keys include port, protocol, bound address, and PID. This preserves TCP/UDP, IPv4/IPv6, address, and port-sharing distinctions.
- Results sort deterministically by the same fields.
- Process name and executable path are optional because a process may exit during refresh or the OS may hide details.
- Native diagnostic details stay in Rust logs when added; serialized errors use a finite safe enum.

## Trust boundary

`list_ports` accepts a typed options object and returns typed port data. The lifecycle API contains only `hide_compact_panel`, `open_full_view`, `quit_app`, and the read-only `current_window_is_visible` query. Phase 3 adds the narrow validated `terminate_process` and authorization-gated `force_terminate_process` commands. The frontend has no shell plugin, filesystem permission, remote-content permission, or arbitrary native execution facility.

The `default` capability applies only to the `compact` and `full` windows and grants `core:event:default`, which is required to listen for the native refresh-request event. Window show/hide/focus/position and application exit remain in Rust rather than being broadly exposed to webview code.

## Phase 2 desktop lifecycle

```text
TrayIconBuilder (one native tray icon)
    -> left activation on macOS/Windows
        -> toggle existing "compact" window
        -> position from tray rectangle + monitor work area
        -> apply window level/workspace policy
        -> unminimize, show, focus, request refresh
    -> tray menu
        -> show panel / open existing "full" / refresh visible views / quit

Native window events
    -> compact loses focus: hide compact
    -> compact or full close requested: prevent close, then hide

React window router
    -> ?view=compact -> CompactPanel
    -> ?view=full    -> FullView
        -> shared usePorts/usePortView state and utilities
```

Both windows are declared once in `tauri.conf.json`, start hidden, and are retrieved by stable labels. No user action creates another instance. Native show operations emit `portwatch://refresh-requested` and report the window visible; hide operations report it hidden. The shared hook also performs an initial fetch, rejects overlapping fetches, retains existing results during background refreshes, and keeps stale results visible with an error if a refresh fails.

The compact panel is undecorated, fixed-size, always on top, and omitted from the taskbar. Its position is calculated in physical pixels from the tray rectangle when available, placed above or below based on available room, and clamped to the selected monitor's work area. Without a reliable tray rectangle it uses the current or primary monitor's top-right work area; centering is the last fallback when monitor discovery fails.

Every compact-panel show reapplies its presentation policy before display: always-on-top is enabled, visibility on all workspaces is enabled, the window is unminimized, then it is shown, focused, and asked to refresh. Reapplying the policy is necessary on macOS so an accessory-style panel hidden on another Space does not reopen behind the currently active application. The full window follows the same restore/show/focus ordering but explicitly disables always-on-top and all-workspace visibility, preserving normal application-window behavior.

Tauri documents workspace visibility as unsupported on Windows, so PortWatch skips that setter there. Linux requests the workspace policy where Tauri exposes it but treats window-manager rejection as non-fatal. macOS requires the setter to succeed before showing the compact panel. Tao implements that setter on macOS by adding only `NSWindowCollectionBehaviorCanJoinAllSpaces`; that covers ordinary Spaces but is not the AppKit policy for joining another application's full-screen Space.

### macOS foreground adapter

Tauri 2.11.5 delegates `set_focus()` to Tao. Tao's macOS path calls `makeKeyAndOrderFront` and then `activateIgnoringOtherApps`, but it does not call `orderFrontRegardless`, and application activation occurs after the initial window ordering. Runtime testing showed that this sequence can mark an accessory/UIElement application's compact window visible while leaving it ordered behind another application's active window. Generic always-on-top, all-workspace, restore, show, and focus calls therefore did not reliably cross that application-ordering boundary.

After the cross-platform compact show/focus sequence, `desktop/macos.rs` requests one compact-only native foreground operation. It uses Tauri's documented `WebviewWindow::run_on_main_thread` and `WebviewWindow::ns_window` APIs, then:

1. preserves existing collection behavior while adding `CanJoinAllSpaces`, `FullScreenAuxiliary`, and `CanJoinAllApplications`, removing only mutually exclusive primary/full-screen-primary flags;
2. sets the compact `NSWindow` to `NSFloatingWindowLevel`;
3. activates `NSApplication` with `activateIgnoringOtherApps(true)`;
4. calls `makeKeyAndOrderFront(nil)`;
5. calls `orderFrontRegardless()` to cross the inactive-application ordering boundary.

The collection policy is intentional rather than a generic visibility workaround. Apple documents `FullScreenAuxiliary` as allowing a window on the same Space as a full-screen window and `CanJoinAllApplications` as the current behavior for floating windows and system overlays that may join other applications' full-screen spaces. `CanJoinAllSpaces` remains necessary for ordinary Spaces. These flags and the floating level apply only to the compact overlay; the full window never enters the native adapter. See [Apple's window collection behavior documentation](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct).

Apple deprecates `activateIgnoringOtherApps` in favor of cooperative `activate()`. The replacement does not guarantee activation while another application is active, which is the failure being addressed, and it is not safe to assume on every older macOS version PortWatch can run on. The deprecated call is therefore isolated to a deliberate user tray action and allowed only on that line; PortWatch never uses it for background refreshes or the full window. See [Apple's activation documentation](https://developer.apple.com/documentation/appkit/nsapplication/activate%28ignoringotherapps%3A%29) and [`orderFrontRegardless`](https://developer.apple.com/documentation/appkit/nswindow/orderfrontregardless%28%29).

The only unsafe operation is converting the pointer returned by Tauri's documented `ns_window()` method into a retained `NSWindow`. The adapter checks for a missing/null handle, runs on the AppKit main thread, keeps the owning Tauri window alive, retains the native object for the calls, and contains the conversion in one function with its safety invariant documented. Dispatch and handle failures return or log a safe desktop-operation error instead of panicking.

Direct bindings are target-specific: `objc2` 0.6.4 with only `std`, and `objc2-app-kit` 0.3.2 with only `NSApplication`, `NSWindow`, and `std`. Windows and Linux do not compile or execute the adapter. The accessory activation policy is never changed, so foregrounding the compact panel does not request a permanent Dock icon.

On macOS, PortWatch uses Tauri's supported `ActivationPolicy::Accessory` and no private AppKit APIs. On Linux, Tauri 2 does not emit tray-click events, so the tray menu is the supported activation fallback. Desktop-environment tray hosting remains a runtime concern.

The lifecycle decision and positioning calculations are isolated from Tauri integration calls and unit tested. The discovery provider and normalization contract are unchanged.

Official APIs verified for Phase 2: [Tauri system tray](https://v2.tauri.app/learn/system-tray/), [Tauri `TrayIconEvent`](https://docs.rs/tauri/latest/tauri/tray/enum.TrayIconEvent.html), [Tauri `WebviewWindow`](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html), [Tauri `WindowEvent`](https://docs.rs/tauri/latest/tauri/enum.WindowEvent.html), and [Tauri core permissions](https://v2.tauri.app/reference/acl/core-permissions/).

## Known limitations and follow-up

- Cross-platform source paths exist but only the current developer platform can be behavior-tested locally; CI compilation and manual validation remain necessary.
- Linux tray activation is menu-driven because Tauri tray click events are unsupported on Linux; status-notifier/AppIndicator behavior varies by desktop environment.
- PID attribution can be incomplete under macOS privacy/system protections, Linux `/proc` restrictions, and Windows protected processes.
- A process can exit between socket enumeration and metadata refresh, producing a valid entry without process metadata.
- The protected-process list is a safety floor, not a promise that every unlisted process is harmless to stop.
