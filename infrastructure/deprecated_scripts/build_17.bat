@echo off
set SRC="C:\localsampark1 17-07-2026\localsampark1 17-07-2026\apps\mobile"
set DST="C:\localsampark1 17-07-2026\localsampark1 17-07-2026\Mobile Build Android\mobile_build 17-07-2026"

echo "Copying files to Mobile Build Android\mobile_build 17-07-2026..."
robocopy %SRC% %DST% /MIR /XD .gradle .idea .git node_modules dist /R:1 /W:1 /NDL /NFL /NP

echo "Running npm install to ensure dependencies are intact..."
cd /d %DST%
call npm install --legacy-peer-deps

echo "Mapping virtual drive Z: to keep path lengths short for Gradle..."
C:\Windows\System32\subst.exe Z: /D >nul 2>&1
C:\Windows\System32\subst.exe Z: %DST%

echo "Building APK on drive Z:..."
Z:
cd android
set NODE_OPTIONS=--max-old-space-size=4096
call gradlew.bat assembleRelease --no-daemon --console=plain

echo "Cleaning up virtual drive Z:..."
C:
C:\Windows\System32\subst.exe Z: /D >nul 2>&1

echo "Build Process Completed!"
