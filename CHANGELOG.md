# Changelog

All notable changes will be documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and intends to use semantic versioning.

## [Unreleased]

### Fixed

- Exclude non-actionable TCP and UDP records whose local port is `0`.

### Added

- Tauri 2, React, TypeScript, Vite, and pnpm project foundation.
- Native TCP/UDP socket discovery with owning PID and process metadata when available.
- Filtering, normalization, deterministic sorting, and careful deduplication.
- Minimal searchable interface proving Rust-to-React port data flow.
- Typed backend errors and safe frontend error messages.
- Frontend and Rust tests, repository documentation, CI, and release foundations.
