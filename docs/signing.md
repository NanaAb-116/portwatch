# Signing and notarization

The repository contains no signing identity or credentials. Release builds are unsigned unless maintainers configure platform secrets.

- macOS requires an Apple Developer ID certificate and notarization credentials. Configure Tauri's supported certificate, password, Apple ID/API, team, and signing identity secrets in GitHub Actions.
- Windows code signing requires a certificate or supported remote signing service and associated secrets.
- Linux packages are not repository-signed by this workflow.

Without a Developer ID, macOS bundles are ad-hoc signed (`bundle.macOS.signingIdentity: "-"` in `tauri.conf.json`) so the bundle signature is sealed and Apple Silicon can run the app. An `APPLE_SIGNING_IDENTITY` secret overrides this. Ad-hoc signing does not satisfy Gatekeeper: users must still allow the app under **System Settings → Privacy & Security → Open Anyway** after the first launch attempt.

As of 2026-11-08 the repository has no Actions secrets configured, so release builds are unsigned (macOS ad-hoc).

Use GitHub environment protection for release secrets, pin or regularly review actions, and never commit certificates or passwords. Until signing is configured and verified, release notes must warn that macOS Gatekeeper and Windows SmartScreen may display warnings.
