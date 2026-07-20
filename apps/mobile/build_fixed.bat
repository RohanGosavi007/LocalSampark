@echo off
set NODE_ENV=production
set NODE_OPTIONS=--max-old-space-size=8192
set GRADLE_OPTS=-Xmx2048m -XX:MaxMetaspaceSize=512m
C:\Windows\System32\subst.exe X: "c:\localsampark1 17-07-2026\localsampark1 17-07-2026"
X:
cd apps\mobile
set NODE_OPTIONS=--max-old-space-size=8192
cd android && gradlew.bat assembleRelease --no-daemon --console=plain --max-workers=2
C:
C:\Windows\System32\subst.exe X: /D >nul 2>&1
