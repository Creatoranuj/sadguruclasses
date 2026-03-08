
## Root Cause Analysis

The build fails in **15 seconds** — which means it's failing at the very first step: `npm ci`. The actual Gradle build (which takes minutes) is never even reached.

**Why `npm ci` fails in 15s:**
- The repo has BOTH `bun.lock` AND `package-lock.json` — this causes `npm ci` to potentially fail if `package-lock.json` is out of sync
- More likely: `package-lock.json` doesn't exist in the GitHub repo (it may be in `.gitignore`)
- `npm ci` requires a valid `package-lock.json` — if missing, it fails immediately with exit code 1

**The fix:** Change `npm ci` → `npm install` in the workflow, AND change `cache: 'npm'` to handle this gracefully. Also need to ensure `package-lock.json` is committed.

**Secondary issue spotted:**
- The workflow uses `softprops/action-gh-release@v2` but when triggered via `workflow_dispatch` (manual), `github.ref_name` is `main` (not a version tag). This means the APK rename step creates `SadguruCoachingClasses-main.apk` and the release step tries to create a release for `main` branch — which fails because you can't create a release on a branch ref without a tag.

## Plan

### Fix 1 — `npm ci` → `npm install` (fixes 15s failure)
In `.github/workflows/build-apk.yml`, change:
```
npm ci
```
to:
```
npm install --legacy-peer-deps
```
And remove `cache: 'npm'` from setup-node (or change to npm with package.json).

### Fix 2 — Handle `workflow_dispatch` version name
When triggered manually (no tag), `github.ref_name` = `main`. Fix the release step to use a timestamp-based version if no tag:
```yaml
- name: 🏷️ Set version name
  run: |
    if [[ "${{ github.ref_name }}" == "main" || "${{ github.ref_name }}" == "master" ]]; then
      echo "VERSION=v1.0-$(date +%Y%m%d-%H%M)" >> $GITHUB_ENV
    else
      echo "VERSION=${{ github.ref_name }}" >> $GITHUB_ENV
    fi
```

Then use `${{ env.VERSION }}` everywhere instead of `${{ github.ref_name }}`.

### Fix 3 — Release step needs a tag (not branch)
The `softprops/action-gh-release@v2` action needs a git tag. For manual triggers, we need to either:
- Create a tag in the workflow before the release step, OR
- Use `actions/upload-artifact` only (skip the release step for manual triggers)

Best approach: Auto-create a tag in the workflow for manual runs.

## Changes to make

**File: `.github/workflows/build-apk.yml`**

1. Step 2 (setup-node): Remove `cache: 'npm'` line OR keep it — npm cache is fine
2. Step 3 (install): `npm ci` → `npm install`  
3. Add new step after checkout: Set VERSION env variable
4. Replace all `${{ github.ref_name }}` with `${{ env.VERSION }}`
5. Add step to create git tag for manual dispatch runs (so release step works)

This is a **single file change** to the workflow YAML.
