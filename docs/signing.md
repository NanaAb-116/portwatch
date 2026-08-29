# Signing and notarization

The repository contains no signing identity or credentials. Release builds are unsigned unless maintainers configure platform secrets.

- macOS requires an Apple Developer ID certificate and notarization credentials. Configure Tauri's supported certificate, password, Apple ID/API, team, and signing identity secrets in GitHub Actions.
- Windows code signing requires a certificate or supported remote signing service and associated secrets.
- Linux packages are not repository-signed by this workflow.

Use GitHub environment protection for release secrets, pin or regularly review actions, and never commit certificates or passwords. Until signing is configured and verified, release notes must warn that macOS Gatekeeper and Windows SmartScreen may display warnings.
