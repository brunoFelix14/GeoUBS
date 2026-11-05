@echo off
chcp 65001 >nul
cd /d "%~dp0"
title GeoUBS - Servidor local

if not exist ".env" (
    echo O arquivo .env nao existe. Execute primeiro 1_CONFIGURAR_BANCO.bat.
    pause
    exit /b 1
)
if not exist "venv\Scripts\python.exe" (
    echo O ambiente Python nao foi configurado. Execute primeiro 1_CONFIGURAR_BANCO.bat.
    pause
    exit /b 1
)

call "venv\Scripts\activate.bat"
echo Iniciando GeoUBS...
echo Deixe esta janela aberta enquanto usa o site.
echo Acesse http://127.0.0.1:5000
python app.py
pause
