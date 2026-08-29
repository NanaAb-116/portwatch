# Manual platform test checklist

Record the OS version, CPU, desktop environment where applicable, package type, and tester/date for each run. A checked platform must pass discovery and UI behavior; tray and termination items remain pending until their phases land.

## Common checks

- [ ] Clean installation opens without a terminal.
- [ ] A known TCP listener appears with the correct address and port.
- [ ] A bound UDP socket appears.
- [ ] PID and process name appear for a process owned by the current user.
- [ ] TCP/UDP toggles request and show the correct protocols.
- [ ] Search finds port, PID, and process name.
- [ ] Refresh notices an opened and then closed test listener.
- [ ] Restricted process data is omitted or shown as unavailable, not invented.
- [ ] Permission and provider failures show safe, actionable messages.
- [ ] Idle CPU and memory observations are recorded.

## macOS Apple Silicon

- [ ] Current supported macOS tested.
- [ ] Unsigned-build Gatekeeper behavior documented.
- [ ] System-protected process visibility observed.

## macOS Intel

- [ ] Current available macOS tested by CI or contributor.
- [ ] Artifact launches on Intel hardware.

## Windows

- [ ] Current supported Windows tested.
- [ ] Standard-user and administrator visibility compared without silent elevation.
- [ ] Unsigned-installer SmartScreen behavior documented.

## Linux

- [ ] Current Ubuntu LTS tested.
- [ ] `/proc` visibility restrictions observed.
- [ ] AppImage and `.deb` clean installations tested.
- [ ] GNOME/KDE tray behavior documented when Phase 2 lands.

Linux tray availability depends on the desktop environment and AppIndicator/status-notifier support; some GNOME configurations require an extension.
