# Working on PortWatch

Keep the application focused on finding and safely releasing occupied ports. Do not add telemetry, accounts, cloud dependencies, arbitrary shell execution, or general task/network/security features.

Frontend code may call only narrowly registered Tauri commands. Keep port discovery, process information, process termination, command adapters, and presentation separate. Unavailable operating-system fields stay optional.

For every change:

1. Preserve cross-platform behavior or explicitly gate and document it.
2. Add proportionate frontend and/or Rust tests.
3. Run the checks documented in `README.md`.
4. Update `ROADMAP.md` only for completed work and update `CHANGELOG.md` for user-visible changes.

Process termination code requires confirmation, identity revalidation, invalid/protected/self-process checks, safe permission errors, and isolated tests that only terminate a child spawned by the test.
