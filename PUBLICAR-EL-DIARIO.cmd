@echo off
rem ===========================================================================
rem  PUBLICAR LA TABERNA DEL MAGALLANES NEWS  -  un solo clic
rem ===========================================================================
rem  Que hace esto:
rem    1. Busca el index.html que usted descargo del CMS (el boton
rem       "Descargar HTML publicado") y lo instala en la carpeta publicar/.
rem    2. Compila y verifica que todo este bien.
rem    3. Sube el cambio a GitHub, que publica el portal en 2-4 minutos.
rem
rem  NO tiene que subir ningun archivo a ningun sitio a mano.
rem ===========================================================================

setlocal
cd /d "C:\Users\F4NT45M4\Documents\Proyecto predeterminado"

echo.
echo  ==============================================================
echo    PUBLICAR LA TABERNA DEL MAGALLANES NEWS
echo  ==============================================================
echo.

echo  [1 de 3] Buscando el HTML que descargaste del CMS...
echo.
call npm.cmd run instalar
if errorlevel 1 goto error

echo.
echo  [2 de 3] Subiendo a GitHub...
echo.
"C:\Program Files\Git\cmd\git.exe" push origin main
if errorlevel 1 goto error

echo.
echo  [3 de 3] Listo. GitHub publica en 2-4 minutos.
echo.
echo     https://latabernadelmagallanesnews-jpg.github.io/taberna-magallanes-informa/
echo.
echo     (tambien en la puerta de redaccion: /redaccion-cms.html)
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
