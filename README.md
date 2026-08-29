# PortWatch

PortWatch is an open-source desktop utility for one job: finding occupied local ports and, in a later MVP phase, safely releasing them. It uses a Rust backend and a small React interface through Tauri 2—there is no account, cloud service, analytics, advertising, or telemetry.

> Development status: Phase 1. Real listening-port discovery is implemented, but tray behavior and safe process termination are not yet available. No platform is claimed as fully supported until clean-install and behavior testing is complete.

## Preview

<!-- Replace this placeholder after the Phase 2 interface is stable. -->

_Screenshot coming with the compact tray panel._

## Platforms

| Platform | Build status | Behavior validation |
| --- | --- | --- |
| macOS Apple Silicon | CI configured | Phase 1 tested locally |
| macOS Intel | CI configured | Contributor validation needed |
| Windows | CI configured | Contributor validation needed |
| Ubuntu Linux | CI configured | Contributor validation needed |

Linux tray support varies by desktop environment and may require an AppIndicator-compatible host.

## Install

There are no production releases yet. When available, signed or unsigned installers will be published on the repository's GitHub Releases page. Unsigned macOS and Windows builds may trigger operating-system warnings.

## Current usage

Launch the development app to view listening TCP and bound UDP sockets. Search by port, process name, or PID, toggle either protocol, and refresh manually. Process termination arrives in Phase 3.

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
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

## Architecture

React calls only explicitly registered Tauri commands. The command delegates to a `PortProvider`; the initial native provider uses `netstat2` for sockets/PIDs and `sysinfo` for process metadata. Filtering, normalization, and deduplication live in Rust. See [docs/architecture.md](docs/architecture.md).

## Permissions and safety

Port discovery is read-only, but operating-system protections may hide process ownership or executable details. PortWatch preserves unavailable fields instead of guessing and does not silently elevate itself.

Future termination actions will always require confirmation, revalidate process identity, refuse invalid/protected/self PIDs, and explain permission failures. Terminating a process can lose unsaved work.

## Known differences

- macOS can withhold ownership details for processes protected by system policy.
- Linux PID lookup traverses `/proc`; visibility depends on mount and user permissions.
- Windows relies on IP Helper tables and can omit details for protected processes.
- UDP has no TCP-style listening state, so bound UDP sockets are shown in the listening view.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Platform validation, accessibility review, and small focused fixes are especially welcome.

## License

MIT. See [LICENSE](LICENSE).
