@echo off
set NODE_OPTIONS=--max-old-space-size=4096
subst Z: /D
subst Z: "C:\Users\Abhi Laptop\Downloads\mobile_build\mobile_build 08-07-2026"
Z:
cd android
call gradlew.bat assembleRelease --no-daemon --console=plain
C:
subst Z: /D
