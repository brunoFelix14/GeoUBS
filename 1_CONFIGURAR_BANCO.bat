@echo off
chcp 65001 >nul
cd /d "%~dp0"
title GeoUBS - Configurar banco

echo ====================================================
echo   GeoUBS - instalacao e configuracao do banco
echo ====================================================
echo.

if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo Foi criado o arquivo .env a partir do .env.example.
    echo Agora informe a senha correta do PostgreSQL no .env.
    echo O banco geoubs precisa existir no PostgreSQL.
    echo.
    notepad .env
    echo.
)

if not exist "venv\Scripts\python.exe" (
    echo Criando ambiente virtual do Python...
    where py >nul 2>nul
    if %errorlevel%==0 (
        py -m venv venv
    ) else (
        python -m venv venv
    )
    if errorlevel 1 goto erro
)

call "venv\Scripts\activate.bat"
echo Instalando dependencias...
python -m pip install --upgrade pip
if errorlevel 1 goto erro
python -m pip install -r requirements.txt
if errorlevel 1 goto erro

echo.
echo Criando/atualizando as tabelas e carregando as UBS...
python setup_database.py
if errorlevel 1 goto erro

echo.
echo Configuracao finalizada. Execute agora 2_INICIAR_GEoubs.bat.
echo.
pause
exit /b 0

:erro
echo.
echo Ocorreu um erro. Leia a mensagem acima, confira o arquivo .env e tente novamente.
echo Se o banco nao existir, crie no pgAdmin um banco chamado geoubs ou ajuste DATABASE_URL.
pause
exit /b 1
