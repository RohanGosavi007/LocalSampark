# Android signing keys

## What happened

`android/gradle.properties` is tracked by git, and it carried all four
`MYAPP_UPLOAD_*` values — including `MYAPP_UPLOAD_STORE_PASSWORD` and
`MYAPP_UPLOAD_KEY_PASSWORD`. The keystore binary itself was correctly ignored
(`*.keystore` in the root `.gitignore`), but the passwords protecting it were
committed.

They have been moved to `android/keystore.properties`, which is gitignored.
`app/build.gradle` loads that file and still accepts the same four names as
Gradle project properties, so CI can inject them from a secret store with no
file on disk:

```
./gradlew assembleRelease \
  -PMYAPP_UPLOAD_STORE_FILE=release.keystore \
  -PMYAPP_UPLOAD_STORE_PASSWORD=... \
  -PMYAPP_UPLOAD_KEY_ALIAS=localsampark \
  -PMYAPP_UPLOAD_KEY_PASSWORD=...
```

Removing them from `HEAD` does **not** remove them from history. Anyone with a
clone, or any fork/mirror, can still read them with `git log -p`.

## Current key

| | |
|---|---|
| Keystore | `android/app/release.keystore` |
| Alias | `localsampark` |
| SHA-256 | `C9:E5:78:99:95:F8:0A:25:99:A9:B4:90:B8:75:79:E3:F5:61:7F:E4:E0:C9:3B:0E:A0:F4:76:EE:4C:1C:1E:97` |
| Valid until | 1 January 2054 |

Confirm at any time with:

```
keytool -list -v -keystore android/app/release.keystore -alias localsampark
```

## Deciding whether to rotate

Rotation is only safe in some situations. Work out which one applies **before**
generating anything — an unrecoverable mistake here means you can never ship an
update to installed users.

### 1. Not yet published to Play

Nothing depends on the current key. Rotate freely:

```
keytool -genkeypair -v \
  -keystore android/app/release.keystore \
  -alias localsampark \
  -keyalg RSA -keysize 4096 -validity 10000
```

Then update `android/keystore.properties` with the new passwords and re-run
`./gradlew :app:signingReport` to confirm the release variant picks it up.

### 2. On Play, enrolled in Play App Signing

Google holds the *app signing key*; this keystore is only the *upload key*, and
an upload key can be reset without affecting installed users.

1. Generate a new upload keystore (command above, different filename).
2. Export its certificate:
   `keytool -export -rfc -keystore <new>.keystore -alias <alias> -file upload_certificate.pem`
3. Play Console → your app → **Test and release → Setup → App signing** →
   **Request upload key reset**, and attach that PEM.
4. Google confirms by email, usually within a couple of days. Only then switch
   `keystore.properties` over.

Check enrollment at Play Console → **Setup → App signing**. If that page shows
an "App signing key certificate", you are enrolled.

### 3. On Play, legacy self-signed (not enrolled)

**Do not rotate.** Android identifies an app by its signing certificate. A build
signed with a different key is a different app to the OS: existing users get
`INSTALL_FAILED_UPDATE_INCOMPATIBLE` and the only route forward is a new package
name and a fresh install base.

Mitigate instead:

- Purge the passwords from history (below).
- Change the store and key passwords on the *existing* key — this does not
  change the certificate, so updates keep working:
  ```
  keytool -storepasswd -keystore android/app/release.keystore
  keytool -keypasswd  -keystore android/app/release.keystore -alias localsampark
  ```
  Then update `android/keystore.properties`.
- Review who has had repository access since the password was committed.
- Consider opting in to Play App Signing so future rotation is possible.

## Purging the passwords from git history

Required in every case above. Rewrites history, so coordinate with anyone
holding a clone.

```
# git-filter-repo (recommended; brew/pip install git-filter-repo)
git filter-repo --path apps/mobile/android/gradle.properties --invert-paths
```

That drops the file entirely. To keep the file and strip only the secret lines,
use `--replace-text` with a file of `literal:<password>==>REMOVED` rules.

Afterwards: force-push all branches and tags, have every collaborator re-clone
(a `git pull` will not discard the old objects), and ask GitHub Support to purge
cached views if the repository is or ever was public.

Rotating the passwords is worthwhile **even after** a history purge — assume
anything committed to a shared repository is compromised.
