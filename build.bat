@echo off
title vhs Flowchart-Editor - Build Erstellen
cd /d "%~dp0"
cd vhs-flowchart-editor
echo.
echo Erstelle Produktions-Dateien (Build)...
echo Bitte warten, dies kann einen Moment dauern.
echo.
call npm run build
echo.
if %errorlevel% neq 0 (
    echo [FEHLER] Der Build konnte nicht erstellt werden.
    pause
    exit /b %errorlevel%
)
echo [ERFOLG] Der Build wurde erstellt! 
echo Du findest die Webserver-Dateien jetzt im Ordner: 
echo vhs-flowchart-editor\dist
echo.
pause
