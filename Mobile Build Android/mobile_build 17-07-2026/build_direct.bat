@echo off
set NODE_OPTIONS=--max-old-space-size=4096
cd android
call gradlew.bat assembleRelease --no-daemon --console=plain
