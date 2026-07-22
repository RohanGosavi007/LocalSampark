@echo off
set SRC="C:\Users\Abhi Laptop\Downloads\Local 07-7-2026 Office\Local 07-7-2026 Office\localsampark\mobile_build\mobile_build 07-07-2026"
set DST="C:\Users\Abhi Laptop\Downloads\mobile_build\mobile_build 08-07-2026"

echo "Copying files to short path..."
robocopy %SRC% %DST% /MIR /XD .gradle .idea .git /R:1 /W:1 /NDL /NFL /NP

cd /d %DST%
echo "Running npm install to ensure dependencies are intact..."
call npm install --legacy-peer-deps

echo "Building APK..."
set NODE_OPTIONS=--max-old-space-size=8192
cd android
call gradlew.bat assembleRelease --no-daemon --console=plain
echo "Build Finished with code %ERRORLEVEL%"
