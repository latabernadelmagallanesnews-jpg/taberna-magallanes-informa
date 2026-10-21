@echo off
rem ===========================================================================
rem  PUBLICAR LA TABERNA DEL MAGALLANES NEWS  -  un solo clic
rem ===========================================================================
rem  1. Enciende el servidor local (asi el boton "Publicar ahora" del CMS
rem     funciona siempre, incluso desde el sitio publicado).
rem  2. Busca el index.html que usted descargo del CMS (boton
rem     "Descargar HTML publicado") y lo instala en la carpeta publicar/.
rem  3. Compila y verifica que todo este bien.
rem  4. Sube el cambio a GitHub.
rem  5. ESPERA y COMPRUEBA que el contenido ya este en el sitio publico
rem     (asi no se queda con la duda de si salio o no).
rem
rem  NO tiene que subir ningun archivo a ningun sitio a mano.
rem ===========================================================================

setlocal
cd /d "C:\Users\F4NT45M4\Documents\Proyecto predeterminado"

rem --- 1 · encender el servidor local si no esta corriendo -----------------
tasklist /FI "IMAGENAME eq node.exe" /NH 2>nul | find /I "node.exe" >nul
if not "%errorlevel%"=="0" goto encender

:comprobar
for /f "tokens=5" %%p in ('netstat -ano ^| find /I ":8099" ^| find /I "LISTENING"') do set PUERTO_OCUPADO=%%p
if defined PUERTO_OCUPADO goto ya_esta

:encender
echo.
echo  Encendiendo el servidor local del diario...
start "" /min "C:\Program Files\nodejs\node.exe" scripts\servidor-local.js
timeout /t 4 /nobreak >nul

:ya_esta
echo  · Servidor local listo.

rem --- 2 a 5 · instalar, compilar, subir y comprobar ------------------------
call "C:\Program Files\nodejs\node.exe" scripts\publicar-y-verificar.js
if errorlevel 1 goto error

echo.
echo  Si todo salio bien, el sitio ya esta en internet y se puede ver
echo  desde cualquier telefono o computadora.
echo.
start "" "https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/"
echo.
pause
exit /b 0

:error
echo.
echo  ------------------------------------------------------------
echo   NO SE PUDO PUBLICAR. Lea el mensaje de arriba.
echo.
echo   Si dice que no encontro el HTML descargado, abra el CMS y
echo   pulse "Descargar HTML publicado" otra vez.
echo  ------------------------------------------------------------
echo.
pause
exit /b 1
