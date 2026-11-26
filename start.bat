@echo off
rem Starts the whole Apuntado system (MongoDB replica set + backend + frontend) with a single command.
rem Usage: start.bat       (same as: docker compose up --build)
rem        start.bat -d    (in the background; any argument is passed to docker compose up)
setlocal
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo Error: Docker is not installed. Install Docker Desktop: https://docs.docker.com/get-docker/
  exit /b 1
)
docker compose version >nul 2>nul
if errorlevel 1 (
  echo Error: Docker Compose v2 is required ^("docker compose" command^).
  exit /b 1
)

if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$g = { $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { $_.ToString('x2') }) }; (Get-Content '.env') -replace '^JWT_SECRET=.*', ('JWT_SECRET=' + (& $g)) -replace '^JWT_REFRESH_SECRET=.*', ('JWT_REFRESH_SECRET=' + (& $g)) | Set-Content -Encoding ascii '.env'"
  if errorlevel 1 (
    echo Error: the JWT secrets could not be generated. Edit .env manually.
    exit /b 1
  )
  echo Created .env from .env.example with random JWT secrets.
)

echo Frontend:  http://localhost:5173
echo Backend:   http://localhost:3000/api   (Swagger: http://localhost:3000/docs)
docker compose up --build %*
