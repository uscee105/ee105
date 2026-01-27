@echo off
cd /d %~dp0..
call %UserProfile%\anaconda3\Scripts\activate.bat
jupyter notebook
pause
