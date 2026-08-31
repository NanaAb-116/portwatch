# PortWatch

PortWatch is an open-source desktop utility for one job: finding occupied local ports and, in a later MVP phase, safely releasing them. It uses a Rust backend and a small React interface through Tauri 2—there is no account, cloud service, analytics, advertising, or telemetry.

> Development status: Phase 4.1 implementation. Local settings, selectable themes, and safe automatic refresh are implemented and automated checks pass locally. Runtime behavior remains unclaimed until the manual checklist is completed on each platform.

## Preview

<!-- Replace this placeholder after the Phase 2 interface is stable. -->

_Screenshot coming after the Phase 2 runtime-validation pass._

## Platforms

| Platform | Build status | Behavior validation |
| --- | --- | --- |
| macOS Apple Silicon | CI configured | Phase 2 and Phase 3 manual validation pending |
| macOS Intel | CI configured | Contributor validation needed |
| Windows | CI configured | Contributor validation needed |
| Ubuntu Linux | CI configured | Contributor validation needed |

Linux tray support varies by desktop environment and may require an AppIndicator-compatible host.

## Install

There are no production releases yet. When available, signed or unsigned installers will be published on the repository's GitHub Releases page. Unsigned macOS and Windows builds may trigger operating-system warnings.

## Current usage

Launch PortWatch and use its menu-bar/system-tray icon. A left click opens the compact panel on macOS and Windows; use the tray menu fallback on Linux. The compact panel supports search, protocol filters, refresh, settings, safe process termination, opening the full sortable view, and explicit quit. Closing either window hides it and leaves PortWatch running in the tray.

The **Terminate** action first shows a confirmation and requests graceful shutdown. If the exact same process remains alive after a bounded wait, PortWatch offers a separate force-termination warning. It never escalates automatically.

The full view sorts by port, protocol, process, PID, and address. Both views refresh whenever native lifecycle code shows them, and a failed background refresh retains the previous results. Settings persist locally and stay synchronized between open windows. Theme choices are **System** (the default), **Light**, and **Dark**; System follows live operating-system appearance changes. Automatic refresh choices are **Off** (the default), **5**, **10**, **30**, and **60 seconds**. Hidden windows do not run automatic refresh timers, and manual refresh remains available in every mode.

## Development

Prerequisites:

- Node.js 22 or newer and pnpm 11
- Stable Rust with `rustfmt` and Clippy
- [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system

```sh
pnpm install
pnpm tauri dev
```

Run the checks with:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build --no-bundle
```

## Architecture

React calls only explicitly registered Tauri commands. Port discovery delegates to a `PortProvider`; safe termination delegates to a separate `ProcessController`. A separate Rust desktop layer owns tray creation, window reuse, positioning, focus, close interception, and quit. See [docs/architecture.md](docs/architecture.md).

## Permissions and safety

Port discovery is read-only, but operating-system protections may hide process ownership or executable details. PortWatch preserves unavailable fields instead of guessing and does not silently elevate itself.

Termination requires a verifiable PID, name, and process start time, plus the executable path when discovery provided it. The backend re-resolves that identity before every destructive action, refuses invalid/protected/self PIDs, and reports permission failures without elevating. The protected-process policy is intentionally small and conservative; it cannot guarantee that stopping every ordinary process is safe. Terminating a process can lose unsaved work.

## Known differences

- macOS can withhold ownership details for processes protected by system policy.
- Linux PID lookup traverses `/proc`; visibility depends on mount and user permissions.
- Windows relies on IP Helper tables and can omit details for protected processes.
- macOS and Linux request graceful termination with `SIGTERM`; force termination uses `SIGKILL` only after a second confirmation.
- Windows graceful termination posts `WM_CLOSE` to top-level windows. Console and background processes may remain alive and require the separately authorized native `TerminateProcess` fallback.
- UDP has no TCP-style listening state, so bound UDP sockets are shown in the listening view.
- Tauri does not emit tray-click events on Linux. PortWatch therefore exposes **Show PortWatch Panel**, **Open PortWatch**, **Refresh**, and **Quit PortWatch** through the tray menu; exact menu and icon behavior depends on the desktop environment and AppIndicator/status-notifier host.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Platform validation, accessibility review, and small focused fixes are especially welcome.

## License

MIT. See [LICENSE](LICENSE).
