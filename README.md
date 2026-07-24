# Friend Memory Book — Android project

A private friend-group app: photo uploads, funny moments, birthday reminders,
and a friendship timeline. This is a native Android app — a small Kotlin
shell (`MainActivity.kt`) hosts the UI, which lives as a self-contained
HTML/CSS/JS file at `app/src/main/assets/index.html` and stores everything
**on-device**, offline, in IndexedDB (no server, no account, no internet
required after install).

## Why you're getting a project, not a raw APK/AAB from me

Compiling and signing an Android app requires the Android SDK, build-tools,
and Gradle downloading dependencies from Google's Maven repo — none of which
exist in the sandbox that generated this project, and it has no internet
access. So the actual `.apk`/`.aab` bytes have to be produced on a machine
that has Android Studio (or the command-line SDK) and internet. That said,
everything is wired up so this is a single command / a few clicks, no coding
required.

## What's included

- Full Gradle project (`build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`)
- `AndroidManifest.xml` with the permissions the app needs (reading photos
  from the gallery, optional camera)
- Adaptive + legacy launcher icons (already generated, all densities)
- `MainActivity.kt` — a WebView shell with photo-picker wiring
- `app/src/main/assets/index.html` — the entire app UI and logic
- **A real release keystore is already generated** at
  `app/release-key.jks` (alias `friendmemorybook`, password
  `friendmemorybook`) so `assembleRelease`/`bundleRelease` will produce a
  *signed* APK/AAB immediately. Replace it with your own before publishing
  to Google Play — see below.

## Step-by-step: build and install

### Option A — Android Studio (easiest)

1. Install [Android Studio](https://developer.android.com/studio) if you
   don't have it.
2. Open Android Studio → **Open** → select the `FriendMemoryBook` folder
   (the one with `settings.gradle.kts` in it).
3. Let Gradle sync (first time will download the SDK/Gradle — needs
   internet, a few minutes).
4. Plug in your Android phone via USB with **USB debugging** enabled
   (Settings → About phone → tap "Build number" 7 times → Settings →
   Developer options → USB debugging), or use an emulator.
5. Click the green ▶ **Run** button. The app installs and launches
   automatically. That's your debug APK, installed.
6. To get the actual APK file: **Build → Build App Bundle(s)/APK(s) → Build
   APK(s)**. Studio will show a notification with a **locate** link to the
   `.apk` (in `app/build/outputs/apk/debug/`).
7. To get the AAB for Play Store: **Build → Build App Bundle(s)/APK(s) →
   Build Bundle(s)**. Output lands in
   `app/build/outputs/bundle/release/app-release.aab`.

### Option B — Command line (if you have the Android SDK + JDK 17 installed)

From inside the `FriendMemoryBook` folder:

```bash
# First time only — creates the Gradle wrapper jar (needs internet)
gradle wrapper --gradle-version 8.7

# Debug APK, signed with the Android debug key (installable immediately)
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk

# Release APK, signed with the included release-key.jks
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk

# Android App Bundle for Play Store, signed with the same key
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

Install the APK on a connected phone:

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

Or just copy the `.apk` file to your phone (email, USB, Drive) and tap it —
you'll need to allow "install from unknown sources" for that app the first
time.

## Create your own release keystore (recommended before publishing)

The included keystore is fine for testing and even for your own sideloaded
installs, but for a real Play Store listing you should generate your own and
**keep it private and backed up** — losing it means you can never update
your published app again.

```bash
keytool -genkeypair -v -keystore my-release-key.jks -alias mykey \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then in `app/build.gradle.kts`, update the `signingConfigs { create("release") }`
block with your new file path, alias, and passwords (better: read them from
environment variables or `gradle.properties` that you don't commit).

## Customizing

- **App name**: `app/src/main/res/values/strings.xml`
- **Colors / icon**: `app/src/main/res/values/colors.xml` and the
  `ic_launcher_*` files under `res/drawable` and `res/mipmap-*`
- **The app itself**: `app/src/main/assets/index.html` — plain HTML/CSS/JS,
  no build step, edit and re-run
- **Package name**: currently `com.friendmemorybook.app` — change
  `namespace`/`applicationId` in `app/build.gradle.kts` and the folder
  structure under `app/src/main/java/` to match if you rename it

## Notes on data & privacy

- All data (photos, captions, friends, birthdays) is stored **only on the
  device it's entered on**, via IndexedDB inside the WebView. There's no
  sync between phones — each install has its own local memory book.
- If you want the group to actually share one memory book across phones,
  that needs a backend (e.g. Firebase) — let me know if you'd like that
  added; it's a bigger change since it introduces accounts/sync.
