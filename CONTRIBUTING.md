# Contributing to PortWatch

Thanks for helping keep port inspection small, safe, and cross-platform.

## Before opening a change

Discuss broad features in an issue first. PortWatch is intentionally not a task manager, traffic monitor, firewall, or security suite. Bug fixes, tests, accessibility improvements, and platform validation can go directly to a pull request.

## Setup and checks

Follow the development setup in `README.md`. Before submitting, run frontend type checking, linting, tests, and build, plus Rust formatting, Clippy, and tests. Destructive process tests must spawn and identify their own harmless child; never target an arbitrary PID.

Keep user-visible changes in `CHANGELOG.md` and update the relevant `ROADMAP.md` checkbox only when the work is complete.

## Pull requests

- Keep changes focused and explain platform-specific behavior.
- Add tests for behavior, not implementation details alone.
- Never expose raw system errors, command output, or sensitive paths in UI messages.
- Do not add telemetry or network requests.
- Confirm that unavailable OS data remains optional rather than fabricated.

By participating, you agree to follow `CODE_OF_CONDUCT.md`.
