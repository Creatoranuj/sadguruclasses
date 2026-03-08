
## Problem Analysis

**Build #3 ran for 2m 47s** — this confirms npm install + npm run build succeeded. The failure is in the **Gradle/Android build step**.

**Root causes identified:**

1. **compileSdkVersion = 36**: GitHub Actions `ubuntu-latest` pre-installs Android SDK up to API 34/35. SDK 36 is not available by default — Gradle fails trying to compile against it.

2. **Android Gradle Plugin (AGP) 8.13.0** + **Gradle 8.14.3**: These are very new versions (cutting edge). They require SDK 36 and may have compatibility bugs in CI environments. Well-tested CI builds use AGP 8.7.x + Gradle 8.11.x.

3. **Missing `sdkmanager` install step** in the workflow: Even if we keep SDK 36, there's no step to download it — GitHub Actions has SDK up to 34/35 pre-installed only.

## Plan

### Fix 1 — Downgrade Android Gradle Plugin (build.gradle)
Change `com.android.tools.build:gradle:8.13.0` → `8.7.3`

### Fix 2 — Downgrade compileSdk/targetSdk (variables.gradle)  
Change `compileSdkVersion = 36` → `35`  
Change `targetSdkVersion = 36` → `35`

Also update dependency versions that require SDK 36:
- `androidxActivityVersion = '1.11.0'` → `'1.9.3'`
- `androidxAppCompatVersion = '1.7.1'` → `'1.7.0'`
- `androidxCoreVersion = '1.17.0'` → `'1.15.0'`
- `androidxFragmentVersion = '1.8.9'` → `'1.8.5'`
- `androidxWebkitVersion = '1.14.0'` → `'1.12.1'`

### Fix 3 — Downgrade Gradle wrapper (gradle-wrapper.properties)
Change `gradle-8.14.3-all.zip` → `gradle-8.11.1-all.zip`

### Fix 4 — Add SDK 35 installation step in workflow
Before the Gradle build step, add:
```yaml
- name: 📲 Install Android SDK 35
  run: |
    echo "y" | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platforms;android-35" "build-tools;35.0.0" || true
```

## Files to change
1. `android/variables.gradle` — compileSdk/targetSdk 36 → 35, library versions
2. `android/build.gradle` — AGP 8.13.0 → 8.7.3
3. `android/gradle/wrapper/gradle-wrapper.properties` — 8.14.3 → 8.11.1
4. `.github/workflows/build-apk.yml` — add SDK install step before Gradle build
