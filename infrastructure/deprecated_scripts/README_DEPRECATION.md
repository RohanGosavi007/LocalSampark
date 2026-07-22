# Deprecated Build Scripts

The scripts in this directory were previously used to run local mobile builds for Android.
They have been deprecated in favor of a robust CI/CD pipeline built on GitHub Actions (`.github/workflows/build.yml`).

## Why were these deprecated?
These scripts relied heavily on Windows-specific workarounds (like using `subst` to map virtual `Z:` drives) to bypass the Windows 260-character MAX_PATH limit that often crashes Node modules and Gradle builds.
By migrating our builds to `ubuntu-latest` on GitHub Actions, the filesystem path length limits are naturally resolved.

## Usage
**Do not run these scripts.** They are kept here for historical reference only.
To trigger a build, push code to the `main` branch or trigger the GitHub Action manually.
