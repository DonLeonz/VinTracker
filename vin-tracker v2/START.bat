@echo off
title VIN Tracker - Iniciando Sistema
color 0A

echo ========================================
echo   VIN TRACKER V2 - INICIO AUTOMATICO
echo ========================================
echo.

:: Verificar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado!
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

:: Verificar si PostgreSQL está corriendo
echo [1/5] Verificando PostgreSQL...
pg_isready -U postgres >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] PostgreSQL no esta corriendo.
    echo Por favor inicia PostgreSQL manualmente o desde servicios de Windows.
    echo.
    echo Presiona cualquier tecla para continuar de todas formas...
    pause >nul
)

:: Ir al directorio del backend
echo [2/5] Preparando backend...
cd /d "%~dp0backend"

:: Verificar si node_modules existe, si no, instalar dependencias
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias del backend...
    call npm install
)

:: Iniciar backend en segundo plano
echo [3/5] Iniciando servidor backend...
start "VIN Tracker - Backend" cmd /k "color 0E && echo ===== BACKEND SERVER ===== && npm run dev"

:: Esperar 3 segundos para que el backend inicie
timeout /t 3 /nobreak >nul

:: Ir al directorio del frontend
echo [4/5] Preparando frontend...
cd /d "%~dp0frontend"

:: Verificar si node_modules existe, si no, instalar dependencias
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias del frontend...
    call npm install
)

:: Iniciar frontend
echo [5/5] Iniciando aplicacion web...
start "VIN Tracker - Frontend" cmd /k "color 0B && echo ===== FRONTEND APP ===== && npm run dev"

:: Mensaje final
echo.
echo ========================================
echo   SISTEMA INICIADO CORRECTAMENTE!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo La aplicacion se abrira automaticamente en tu navegador.
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
