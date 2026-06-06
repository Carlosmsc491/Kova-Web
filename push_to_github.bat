@echo off
echo =============================
echo  KOVA Web - Push to GitHub
echo =============================
cd /d C:\Kona\kova-web
git init
git add .
git commit -m "Initial commit - KOVA Web mobile app"
git branch -M main
git remote add origin https://github.com/Carlosmsc491/Kova-Web.git
git push -u origin main
echo.
echo Done! Check https://github.com/Carlosmsc491/Kova-Web
pause
