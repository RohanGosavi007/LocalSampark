@echo off
set NODE_OPTIONS=--max-old-space-size=4096
C:\Windows\System32\subst.exe X: .
X:
cd android
call gradlew.bat assembleRelease --no-daemon --console=plain
C:
C:\Windows\System32\subst.exe X: /D >nul 2>&1
