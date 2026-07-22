@echo off
set NODE_ENV=production
set NODE_OPTIONS=--max-old-space-size=8192
cd apps\mobile\android
call gradlew.bat clean --console=plain
call gradlew.bat assembleRelease --console=plain
