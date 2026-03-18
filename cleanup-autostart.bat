@echo off
echo Cleaning up GetUpAI auto-start registry entries...
echo.

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "GetUpAI" /f 2>nul && echo   Removed: GetUpAI || echo   Not found: GetUpAI (already clean)
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ai.getup.desktop" /f 2>nul && echo   Removed: ai.getup.desktop || echo   Not found: ai.getup.desktop (already clean)
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "electron.app.GetUpAI" /f 2>nul && echo   Removed: electron.app.GetUpAI || echo   Not found: electron.app.GetUpAI (already clean)

echo.
echo Done. Restart your computer to verify.
pause
