
## Problem

The exact error is:
```
> error: invalid source release: 21
```
Failing task: `:capacitor-android:compileDebugJavaWithJavac`

**Root cause**: The `capacitor-android` npm package (installed from `node_modules`) contains its own `build.gradle` with `sourceCompatibility = JavaVersion.VERSION_21`. The GitHub Actions workflow is using **Java 17** (`java-version: '17'`), which cannot compile Java 21 source code. This is a mismatch between the JDK version in CI and what Capacitor requires.

**Capacitor Android v7/v8 requires Java 21** — this is a hard requirement.

## Fix

Only **one file** needs to change:

### `.github/workflows/build-apk.yml` — Change Java 17 → Java 21

Line 86: change `java-version: '17'` to `java-version: '21'`

Also update the step name comment from "Setup Java 17" to "Setup Java 21".

That's it. The Gradle versions, SDK versions, and all other settings are correct — the only problem is the JDK version mismatch.

## Files to change
1. `.github/workflows/build-apk.yml` — Line 82–86: change `java-version: '17'` → `'21'`

## After fixing
Push to GitHub (or commit from Lovable) → GitHub automatically detects the push → workflow runs with Java 21 → Capacitor Android compiles successfully → APK is built and attached to a GitHub Release.
