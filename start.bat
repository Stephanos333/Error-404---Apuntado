@echo off
rem Levanta el Sistema Apuntado completo (MongoDB replica set + backend + frontend) con un solo comando.
rem Uso: start.bat         (equivale a: docker compose up --build)
rem      start.bat -d      (en segundo plano; cualquier argumento se pasa a docker compose up)
setlocal
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo Error: Docker no esta instalado. Instale Docker Desktop: https://docs.docker.com/get-docker/
  exit /b 1
)
docker compose version >nul 2>nul
if errorlevel 1 (
  echo Error: se requiere Docker Compose v2 ^(comando "docker compose"^).
  exit /b 1
)

if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$g = { $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { $_.ToString('x2') }) }; (Get-Content '.env') -replace '^JWT_SECRET=.*', ('JWT_SECRET=' + (& $g)) -replace '^JWT_REFRESH_SECRET=.*', ('JWT_REFRESH_SECRET=' + (& $g)) | Set-Content -Encoding ascii '.env'"
  if errorlevel 1 (
    echo Error: no se pudieron generar los secretos JWT. Edite .env manualmente.
    exit /b 1
  )
  echo Se creo .env a partir de .env.example con secretos JWT aleatorios.
)

echo Frontend:  http://localhost:5173
echo Backend:   http://localhost:3000/api   (Swagger: http://localhost:3000/docs)
docker compose up --build %*
