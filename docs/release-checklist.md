# Release checklist

Copy this list into the release tracking note for each version. Do not tag until every "Before tagging" item is checked or explicitly deferred in the release notes.

## Before tagging

- [ ] `main` is clean and up to date with `origin/main`.
- [ ] All checks in `README.md` pass locally.
- [ ] CI is green on the release commit for macOS, Windows, and Linux.
- [ ] The macOS Apple Silicon checklist and the Phase 3 safe-termination checklist in `docs/platform-testing.md` pass on the release commit. Platforms without a completed checklist are listed as untested in the release notes.
- [ ] A clean installation from the locally built bundle (`pnpm tauri build --bundles dmg` on macOS) opens from Finder and shows the menu-bar icon on an account that has never run PortWatch.
- [ ] The version matches in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.lock` is updated.
- [ ] `CHANGELOG.md`: move `[Unreleased]` entries under `## [X.Y.Z] - YYYY-MM-DD` and leave an empty `[Unreleased]` section.
- [ ] Signing decision recorded (see `docs/signing.md`). Without Apple and Windows secrets, builds are unsigned and the release notes must say so.
- [ ] Runner labels in `.github/workflows/release.yml` are still supported by GitHub-hosted runners.

## Tagging

- [ ] Commit the version and changelog changes.
- [ ] Create and push an annotated tag: `git tag -a vX.Y.Z -m "PortWatch vX.Y.Z"` then `git push origin vX.Y.Z`.
- [ ] The **Release** workflow finishes for all four targets and creates a draft pre-release.

## Before publishing the draft

- [ ] The draft contains the Apple Silicon and Intel `.dmg`, Windows NSIS `.exe`, and Linux AppImage, `.deb`, and `.rpm` files.
- [ ] Download the `.dmg` for this machine from the draft, install it, and confirm it launches and lists ports. For unsigned builds, record the exact Gatekeeper steps needed to open it.
- [ ] Release notes summarize the changelog, list validated and untested platforms, and include the unsigned-build warning and opening steps when applicable.
- [ ] Publish the draft. Keep the pre-release flag until Windows and Linux have completed validation.

## After publishing

- [ ] Check the boxes for completed release work in `ROADMAP.md`.
- [ ] Open the next `[Unreleased]` changelog section if it was not already present.
