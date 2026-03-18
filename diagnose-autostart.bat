@echo off
chcp 65001 >nul 2>&1
echo ============================================
echo   GetUpAI Auto-Start Diagnostic
echo   Checking ALL possible startup locations
echo ============================================
echo.

echo [1/5] HKCU\...\Run (current user registry)
echo ----------------------------------------
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" 2>nul | findstr /i "getup ai.getup"
if %errorlevel% neq 0 echo   (clean - no GetUpAI entries found)
echo.

echo [2/5] HKLM\...\Run (machine-wide registry)
echo ----------------------------------------
reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" 2>nul | findstr /i "getup ai.getup"
if %errorlevel% neq 0 echo   (clean - no GetUpAI entries found)
echo.

echo [3/5] RunOnce keys
echo ----------------------------------------
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce" 2>nul | findstr /i "getup ai.getup"
if %errorlevel% neq 0 echo   (clean)
reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce" 2>nul | findstr /i "getup ai.getup"
if %errorlevel% neq 0 echo   (clean)
echo.

echo [4/5] Startup folder
echo ----------------------------------------
dir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\*getup*" 2>nul
if %errorlevel% neq 0 echo   (clean - no GetUpAI shortcuts found)
dir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\Startup\*getup*" 2>nul
if %errorlevel% neq 0 echo   (clean)
echo.

echo [5/5] Task Scheduler
echo ----------------------------------------
schtasks /query /fo list 2>nul | findstr /i "getup"
if %errorlevel% neq 0 echo   (clean - no GetUpAI tasks found)
echo.

echo ============================================
echo   Full dump of HKCU\...\Run (ALL entries)
echo   Look for ANYTHING related to GetUpAI
echo ============================================
echo.
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" 2>nul
echo.

echo ============================================
echo   Checking Approved\Run (Task Manager list)
echo ============================================
echo.
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" 2>nul | findstr /i "getup ai.getup"
if %errorlevel% neq 0 echo   (clean)
echo.

echo ============================================
echo   Done. Copy the output above and share it.
echo ============================================
pause
