# Architecture

## Scope

PortWatch has one bounded purpose: enumerate occupied local ports and safely release them. React owns presentation; Rust owns all operating-system access. No frontend API accepts a command string or shell fragment.

## Phase 1 flow

```text
React port view
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

## Dependency decisions

### Socket and PID discovery: `netstat2` 0.11.2

Selected after checking the crate documentation, source repository, release activity, and supported implementations on 2026-08-29. Version 0.11.2 was published on 2025-08-14. It uses low-level OS interfaces instead of parsing commands:

- Windows: `GetExtendedTcpTable` and `GetExtendedUdpTable` from IP Helper.
- Linux: `NETLINK_INET_DIAG`, with `/proc` traversal for PID ownership.
- macOS: `proc_pidfdinfo`.

This is the smallest dependable shared API found that provides protocol, local address, port, TCP state, and associated PIDs across all required platforms. Shell-based `lsof`, `ss`, and `netstat` parsing was rejected because availability, localization, output, and permissions differ. A broader packet-monitoring crate was rejected as outside PortWatch's scope.

Sources: [netstat2 API documentation](https://docs.rs/netstat2/0.11.2/netstat2/), [netstat2 repository and platform details](https://github.com/ohadravid/netstat2-rs), [0.11.2 release commit](https://github.com/ohadravid/netstat2-rs/commit/22b77d7d9683a8d88315729c9478750b3cd03f50).

### Process metadata: `sysinfo` 0.39.6

Selected only to resolve each already-discovered PID to a process name and optional executable path. Default features are disabled and only the `system` feature is enabled. This avoids separate ToolHelp, procfs, and libproc process-enrichment implementations while retaining a future replacement seam. Usernames are currently unavailable rather than fabricated.

Source: [sysinfo repository](https://github.com/GuillaumeGomez/sysinfo), [sysinfo API documentation](https://docs.rs/sysinfo/0.39.6/sysinfo/).

## Data rules

- The initial view includes TCP sockets in `LISTEN` and all bound UDP sockets; UDP has no TCP-equivalent listening state.
- One entry is emitted per associated PID. An unowned/hidden socket is emitted once with no PID.
- Deduplication keys include port, protocol, bound address, and PID. This preserves TCP/UDP, IPv4/IPv6, address, and port-sharing distinctions.
- Results sort deterministically by the same fields.
- Process name and executable path are optional because a process may exit during refresh or the OS may hide details.
- Native diagnostic details stay in Rust logs when added; serialized errors use a finite safe enum.

## Trust boundary

The only Phase 1 command is `list_ports`. Its input is a typed options object, and its output is typed port data. The frontend has no shell plugin, filesystem permission, or arbitrary native execution facility. The default Tauri capability grants only core window behavior.

## Known limitations and follow-up

- Cross-platform source paths exist but only the current developer platform can be behavior-tested locally; CI compilation and manual validation remain necessary.
- PID attribution can be incomplete under macOS privacy/system protections, Linux `/proc` restrictions, and Windows protected processes.
- A process can exit between socket enumeration and metadata refresh, producing a valid entry without process metadata.
- Phase 3 must add a separate `ProcessController`; it must not reuse discovery results as sufficient proof of process identity.
