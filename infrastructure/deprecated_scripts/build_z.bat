@echo off
set NODE_OPTIONS=--max-old-space-size=8192
subst Z: "C:\Users\Abhi Laptop\Downloads\Local 07-7-2026 Office\Local 07-7-2026 Office\localsampark\mobile_build\mobile_build 07-07-2026"
Z:
cd android
call gradlew.bat assembleRelease --no-daemon --console=plain
C:
subst Z: /D
