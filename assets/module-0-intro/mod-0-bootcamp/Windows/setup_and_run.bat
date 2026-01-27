@echo off
cd /d %~dp0

echo ============================================
echo   EE105 Lab 0 - Complete Setup
echo ============================================
echo.

REM Check if Anaconda is already installed
where conda >nul 2>&1
if %errorlevel%==0 (
    echo Anaconda is already installed!
    echo.
    goto launch
)

REM Check common Anaconda locations (check user install first)
if exist "%USERPROFILE%\anaconda3\Scripts\conda.exe" (
    echo Anaconda found at %USERPROFILE%\anaconda3
    echo.
    goto launch
)

if exist "%USERPROFILE%\Anaconda3\Scripts\conda.exe" (
    echo Anaconda found at %USERPROFILE%\Anaconda3
    echo.
    goto launch
)

if exist "C:\ProgramData\anaconda3\Scripts\conda.exe" (
    echo Anaconda found at C:\ProgramData\anaconda3
    echo.
    goto launch
)

REM Anaconda not found - install it
echo Anaconda not found. Starting installation...
echo.
call install_anaconda.bat

echo.
echo ============================================
echo   Installation complete!
echo ============================================
echo.
echo Please CLOSE this window and double-click
echo setup_and_run.bat again to launch the notebook.
echo.
echo (This is needed so Windows recognizes the new installation)
echo.
pause
exit /b 0

:launch
echo Launching Jupyter Notebook...
echo.

REM Activate Anaconda and launch notebook
call launch_notebook.bat
