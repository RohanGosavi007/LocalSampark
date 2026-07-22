@echo off
set NODE_ENV=production
set NODE_OPTIONS=--max-old-space-size=8192
C:\Windows\System32\subst.exe X: "c:\localsampark1 17-07-2026\localsampark1 17-07-2026"
X:
cd apps\mobile\android
call gradlew.bat :app:createBundleReleaseJsAndAssets --console=plain
C:
C:\Windows\System32\subst.exe X: /D >nul 2>&1
