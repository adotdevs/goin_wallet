Windows installer is NOT stored in Git (100MB+ limit).

After building on the VPS:
  npm run electron:pack:win

Publish once (or after each new build):
  mkdir -p /var/www/goininvest/downloads
  cp "/var/www/goininvest/FE/dist-electron/Goininvest Setup 0.1.0.exe" \
     /var/www/goininvest/downloads/Goininvest-Setup.exe

Every deploy.sh run copies that file into FE/build/downloads/ for the website.
Download URL: https://www.goininvest.com/downloads/Goininvest-Setup.exe
