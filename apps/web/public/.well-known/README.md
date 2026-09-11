# `.well-known`

## `assetlinks.json` — Android App Links

`apps/mobile/android/app/src/main/AndroidManifest.xml` registers an
`android:autoVerify="true"` intent filter for `https://localsampark.in`. At
install time Android fetches

```
https://localsampark.in/.well-known/assetlinks.json
```

and opens links in the app only if this file lists `in.localsampark.app` with
the SHA-256 fingerprint of the certificate that actually signed the installed
build. If it does not match, links quietly fall back to the browser — nothing
breaks, but nothing opens in the app either, which is exactly the kind of
failure that goes unnoticed.

### The fingerprint currently listed

It is the **upload keystore** at `apps/mobile/android/app/release.keystore`
(alias `localsampark`), which is what signs local `assembleRelease` builds:

```
keytool -list -v -keystore apps/mobile/android/app/release.keystore -alias localsampark
```

### If you enrol in Play App Signing

Google re-signs the app with its own key, so the fingerprint above becomes the
wrong one and verification will fail for every Play install. Replace it with the
**app signing key** fingerprint from

> Play Console → your app → Test and release → Setup → App signing

Keeping both entries in the array is fine and is the usual arrangement: the Play
fingerprint covers store installs, the upload one covers local release builds
and internal sideloads.

### Requirements

- Must be served over HTTPS from the exact host, with no redirect.
- `Content-Type: application/json`.
- Must be publicly reachable — no auth, no geo-blocking.

Next.js serves everything under `public/` as-is, so deploying `apps/web` is
enough. `next-sitemap.config.js` excludes only `/admin` and `/profile`, so this
path is unaffected.

### Verifying

```
curl -s https://localsampark.in/.well-known/assetlinks.json
adb shell pm get-app-links in.localsampark.app     # expects: verified
```

Google's checker:
`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://localsampark.in&relation=delegate_permission/common.handle_all_urls`
