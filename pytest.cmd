@echo off
setlocal
set PYTEST_DISABLE_PLUGIN_AUTOLOAD=1
"%~dp0.venv\Scripts\python.exe" -m pytest %*
