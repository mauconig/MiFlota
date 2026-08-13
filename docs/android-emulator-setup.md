# Local Android emulator setup (Windows, no Android Studio)

This is how the MiFlota Android emulator was set up on this machine — a
portable, no-installer setup using just the Android command-line tools. No
Android Studio, no system-wide installs, no admin rights needed except for
the one firewall step at the end. Everything lives under two folders you can
delete later if you want it gone.

Total download size: ~500 MB. Takes 15-20 minutes depending on your
connection.

## Layout

Two folders, both under `E:\` here but any drive works:

- `E:\android-tools\` — scratch space for the downloaded zips (JDK,
  cmdline-tools, the Expo Go APK). Can be deleted after setup.
- `E:\android-sdk\` — the actual persistent SDK: JDK, platform-tools,
  emulator, system images. This is what you keep.

## 1. Get a JDK (required by the SDK command-line tools)

The Android `sdkmanager`/`avdmanager` tools need a JDK 17+ on `PATH` or
pointed to via `JAVA_HOME`. Download a portable (zip, no installer) build —
Eclipse Temurin works well:

```powershell
# download from https://adoptium.net (Temurin 17, Windows x64, .zip — NOT the .msi installer)
# then extract so the java binaries end up at E:\android-sdk\jdk-17\bin\java.exe
Expand-Archive E:\android-tools\jdk17.zip -DestinationPath E:\android-tools\extracted
# the zip contains one top-level folder like jdk-17.0.x+y — rename/move it:
Move-Item "E:\android-tools\extracted\jdk-17*" E:\android-sdk\jdk-17
```

## 2. Get the Android command-line tools

Download the "Command line tools only" zip for Windows from
https://developer.android.com/studio#command-tools (scroll past the full
Android Studio download — you don't need that).

```powershell
Expand-Archive E:\android-tools\cmdline-tools.zip -DestinationPath E:\android-tools\extracted
# IMPORTANT: sdkmanager expects a specific nested folder name — cmdline-tools\latest
New-Item -ItemType Directory -Force E:\android-sdk\cmdline-tools
Move-Item E:\android-tools\extracted\cmdline-tools E:\android-sdk\cmdline-tools\latest
```

You should end up with `E:\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat`.

## 3. Set env vars for the session and install the SDK components

```powershell
$env:JAVA_HOME = "E:\android-sdk\jdk-17"
$env:ANDROID_HOME = "E:\android-sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

# accept licenses non-interactively
cmd /c "yes | sdkmanager --licenses" 2>$null

# install: platform-tools (adb), a platform, an emulator system image, and the emulator itself
sdkmanager --sdk_root=E:\android-sdk `
  "platform-tools" `
  "platforms;android-34" `
  "system-images;android-34;google_apis;x86_64" `
  "emulator"
```

Notes on the choice of image: `google_apis` (not `google_apis_playstore`)
because Expo Go is sideloaded directly as an APK — you don't need the Play
Store inside the emulator. `x86_64` because it uses hardware acceleration
(Hyper-V/WHPX on Windows) instead of slow ARM translation — this matters a
lot for boot and runtime speed on a normal laptop.

## 4. Create the virtual device (AVD)

```powershell
avdmanager create avd -n MiFlota -k "system-images;android-34;google_apis;x86_64"
```

This creates `%USERPROFILE%\.android\avd\MiFlota.avd`. If it prompts "Do you
wish to create a custom hardware profile", answer `no` — the default is
fine.

If you want a bigger/more realistic screen than the bare default (this
setup used the default profile, which is a small low-density screen good
enough for testing but not representative), add `-d pixel_6` or run
`avdmanager list device` to see other options.

## 5. Boot it

```powershell
E:\android-sdk\emulator\emulator.exe -avd MiFlota
```

First boot takes a minute or two. Subsequent boots are much faster (it
snapshots). If it fails to start, check `E:\android-sdk\emulator.log` —
the most common failure on Windows is virtualization not being available
(Hyper-V/WHPX disabled in BIOS, or conflicting with VirtualBox/VMware).

Leave this running in its own window/background process — everything below
talks to it via `adb`, which auto-detects the running emulator.

## 6. Sideload Expo Go

Expo Go isn't on this emulator's Play Store (there isn't one), so install
the APK directly. **Get the exact SDK version that matches this project**
(admin-mobile is on Expo SDK 54) — Expo Go versions are tied to SDK
versions, and a mismatch is the "incompatible SDK version" error. Download
from https://expo.dev/go (pick the SDK 54 build) or from the Expo Go GitHub
releases.

```powershell
adb install E:\android-tools\expo-go-54.0.8.apk
```

## 7. Point the app at your machine's LAN IP

React Native has no browser "page origin" — on a physical phone,
`localhost` in the app resolves to the phone itself, not your dev machine.
The emulator is more forgiving (it can often reach your host via NAT), but
using your real LAN IP everywhere keeps emulator and physical-phone testing
consistent.

```powershell
ipconfig   # find your IPv4 address, e.g. 192.168.100.34
```

Set it in `apps/admin-mobile/.env` (copy from `.env.example` if it doesn't
exist yet):

```
EXPO_PUBLIC_API_URL=http://192.168.100.34:3000
```

Re-check this every time you switch networks (different Wi-Fi = different
IP).

## 8. Start the dev servers and open the app

```powershell
npm --prefix apps/api run dev            # backend, port 3000
npm --prefix apps/admin-mobile run dev   # Metro/Expo, port 8081
```

Then launch Expo Go pointed at your Metro server, either via adb:

```powershell
adb shell am start -a android.intent.action.VIEW -d exp://192.168.100.34:8081
```

or manually inside the emulator: open Expo Go → "Enter URL manually" →
`exp://192.168.100.34:8081`.

## 9. If you're testing on a physical phone too: open the firewall

This is the one step needing an elevated (admin) PowerShell, and it's the
most common "why can't my phone reach the database" cause on Windows — the
dev servers bind to `0.0.0.0` but Windows Firewall blocks unsolicited
inbound connections from other LAN devices by default. Same-machine traffic
(curl, the emulator) isn't affected, which is why it can look like it's
"only broken on the phone".

```powershell
# run as Administrator
New-NetFirewallRule -DisplayName "MiFlota API (dev)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "MiFlota Metro (dev)" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
```

## Useful commands once it's all running

```powershell
adb devices                                  # confirm emulator is attached
adb shell am force-stop host.exp.exponent    # kill Expo Go (for a clean reload)
adb exec-out screencap -p > screenshot.png   # screenshot the emulator
adb shell input text "hello"                 # type into a focused field
adb shell input keyevent 4                   # Android back button
```

## Why not just install Android Studio?

Android Studio bundles all of this (JDK, SDK, AVD manager, a GUI) in one
installer, and is the easier path if you don't mind a ~1 GB+ install and
having a full IDE you may not use. This command-line-only route was chosen
here to keep the footprint small and scriptable/reproducible — but if you'd
rather point-and-click, grabbing Android Studio and using its built-in
"Device Manager" to create a Pixel AVD achieves the same end state (steps
1-5 above are effectively what its installer + wizard do for you), and
you'd then resume at step 6 (sideload Expo Go, since Studio's default
emulator has no Play Store either unless you specifically pick a
Playstore-flavored system image).
