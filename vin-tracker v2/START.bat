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
echo [1/6] Verificando PostgreSQL...
pg_isready -U postgres >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] PostgreSQL no esta corriendo.
    echo Intentando iniciar PostgreSQL...
    net start postgresql-x64-16 >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ADVERTENCIA] No se pudo iniciar PostgreSQL automaticamente.
        echo Por favor inicia PostgreSQL manualmente.
    ) else (
        echo [OK] PostgreSQL iniciado correctamente.
        timeout /t 2 /nobreak >nul
    )
)

:: Cerrar procesos previos en puertos 3000 y 3001
echo [2/7] Cerrando procesos previos si existen...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Puertos liberados.
timeout /t 1 /nobreak >nul

:: Abrir pgAdmin 4
echo [3/7] Abriendo pgAdmin 4...
if exist "C:\Program Files\PostgreSQL\16\pgAdmin 4\runtime\pgAdmin4.exe" (
    start "" "C:\Program Files\PostgreSQL\16\pgAdmin 4\runtime\pgAdmin4.exe"
    echo [OK] pgAdmin 4 abierto.
) else if exist "C:\Program Files\PostgreSQL\16\pgAdmin 4\bin\pgAdmin4.exe" (
    start "" "C:\Program Files\PostgreSQL\16\pgAdmin 4\bin\pgAdmin4.exe"
    echo [OK] pgAdmin 4 abierto.
) else if exist "C:\Program Files\pgAdmin 4\v*\runtime\pgAdmin4.exe" (
    start "" "C:\Program Files\pgAdmin 4\v*\runtime\pgAdmin4.exe"
    echo [OK] pgAdmin 4 abierto.
) else if exist "C:\Program Files\PostgreSQL\15\pgAdmin 4\runtime\pgAdmin4.exe" (
    start "" "C:\Program Files\PostgreSQL\15\pgAdmin 4\runtime\pgAdmin4.exe"
    echo [OK] pgAdmin 4 abierto.
) else if exist "C:\Program Files\PostgreSQL\14\pgAdmin 4\runtime\pgAdmin4.exe" (
    start "" "C:\Program Files\PostgreSQL\14\pgAdmin 4\runtime\pgAdmin4.exe"
    echo [OK] pgAdmin 4 abierto.
) else (
    echo [ADVERTENCIA] No se encontro pgAdmin 4. Por favor abrelo manualmente.
)
timeout /t 1 /nobreak >nul

:: Ir al directorio del backend
echo [4/7] Preparando backend...
cd /d "%~dp0backend"
set BACKEND_DIR=%CD%

:: Verificar si node_modules existe, si no, instalar dependencias
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias del backend...
    call npm install
)

:: Iniciar backend en segundo plano
echo [5/7] Iniciando servidor backend...
start "VIN Tracker - Backend" "C:\Program Files\Git\git-bash.exe" -c "cd '%BACKEND_DIR%' && echo '===== BACKEND SERVER =====' && npm run dev; exec bash"

:: Esperar 3 segundos para que el backend inicie
timeout /t 3 /nobreak >nul

:: Ir al directorio del frontend
echo [6/7] Preparando frontend...
cd /d "%~dp0frontend"
set FRONTEND_DIR=%CD%

:: Verificar si node_modules existe, si no, instalar dependencias
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias del frontend...
    call npm install
)

:: Iniciar frontend
echo [7/7] Iniciando aplicacion web...
start "VIN Tracker - Frontend" "C:\Program Files\Git\git-bash.exe" -c "cd '%FRONTEND_DIR%' && echo '===== FRONTEND APP =====' && npm run dev; exec bash"

:: Mensaje final
echo.
echo ========================================
echo   SISTEMA INICIADO CORRECTAMENTE!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo pgAdmin 4: Abierto en segundo plano
echo.
echo La aplicacion se abrira automaticamente en tu navegador.
echo.
echo Cerrando ventana de inicio en 3 segundos...
timeout /t 3 /nobreak >nul
exit
