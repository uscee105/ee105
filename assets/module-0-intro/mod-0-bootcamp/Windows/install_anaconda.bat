@echo off
echo ============================================
echo  Anaconda Installer for Windows
echo ============================================
echo.

REM Detect architecture
echo Checking system architecture...
echo PROCESSOR_ARCHITECTURE = %PROCESSOR_ARCHITECTURE%

if /i "%PROCESSOR_ARCHITECTURE%"=="AMD64" goto :arch_64bit
if /i "%PROCESSOR_ARCHITECTURE%"=="x86" goto :check_wow64
if /i "%PROCESSOR_ARCHITECTURE%"=="EM64T" goto :arch_64bit
if /i "%PROCESSOR_ARCHITECTURE%"=="IA64" goto :arch_64bit
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" goto :arch_64bit

echo ERROR: Unknown architecture: %PROCESSOR_ARCHITECTURE%
pause
exit /b 1

:check_wow64
REM Running 32-bit cmd on 64-bit Windows?
if defined PROCESSOR_ARCHITEW6432 goto :arch_64bit
REM Genuine 32-bit Windows - use last available 32-bit version
echo Detected: Windows x86 (32-bit)
set DOWNLOAD_URL=https://repo.anaconda.com/archive/Anaconda3-2022.05-Windows-x86.exe
set INSTALLER_NAME=Anaconda3-2022.05-Windows-x86.exe
goto :download

:arch_64bit
echo Detected: Windows x86_64 (64-bit)
set DOWNLOAD_URL=https://repo.anaconda.com/archive/Anaconda3-2025.12-1-Windows-x86_64.exe
set INSTALLER_NAME=Anaconda3-2025.12-1-Windows-x86_64.exe

:download
echo.
echo Downloading Anaconda from:
echo %DOWNLOAD_URL%
echo.
echo This may take several minutes...
echo.

REM Try curl first (built into Windows 10+), fallback to PowerShell
where curl >nul 2>&1
if %errorlevel%==0 goto :use_curl
goto :use_powershell

:use_curl
echo Using curl...
curl -L -o "%INSTALLER_NAME%" --progress-bar "%DOWNLOAD_URL%"
goto :check_download

:use_powershell
echo Using PowerShell...
powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%INSTALLER_NAME%'"
goto :check_download

:check_download
if not exist "%INSTALLER_NAME%" goto :download_failed

echo.
echo ============================================
echo  Download complete!
echo ============================================
echo.
echo Starting silent installation...
echo This may take 10-15 minutes. Please wait...
echo.
start /wait "" "%INSTALLER_NAME%" /InstallationType=JustMe /AddToPath=1 /RegisterPython=1 /S /D=%UserProfile%\anaconda3
echo.
echo Installation complete!
goto :end

:download_failed
echo.
echo ERROR: Download failed.
echo Please download manually from: https://www.anaconda.com/download
goto :end

:end
pause
