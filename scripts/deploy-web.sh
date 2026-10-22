#!/usr/bin/env bash
# Publica a versao web do app (PWA, para quem usa iPhone) na VPS.
#
# Gera o export com a API na mesma origem (`/api`, que o Caddy repassa ao gateway) e atualiza
# ~/edu/app-web, a pasta que o Caddy serve em APP_DOMAIN (ver deploy/Caddyfile no repositorio do
# backend). A pasta e atualizada no lugar, e nao trocada por outra: o container monta a pasta, e
# um `mv` deixaria o Caddy servindo a antiga. O bundle novo chega antes do index.html que aponta
# para ele, e o antigo so sai no fim.
#
# Uso: npm run deploy:web        (EDU_VPS=outro-host para outro alias de SSH)
set -euo pipefail

ALVO="${EDU_VPS:-edu-vps}"
SAIDA="dist-web"

cd "$(dirname "$0")/.."

rm -rf "$SAIDA"
# MSYS_NO_PATHCONV: no Git Bash do Windows, um valor que comeca com "/" vira caminho do Windows
# ao passar para o node ("/api" chegava como "C:/Program Files/Git/api" e o login dava 403). A
# variavel explicita tambem vence o .env de desenvolvimento.
MSYS_NO_PATHCONV=1 EXPO_PUBLIC_API_URL=/api npx expo export --platform web --clear --output-dir "$SAIDA"

BUNDLE=$(ls "$SAIDA"/_expo/static/js/web/*.js)
if grep -q "Program Files" "$BUNDLE" || ! grep -q '"/api"' "$BUNDLE"; then
  echo "O bundle nao saiu com a API em /api; nada foi publicado." >&2
  exit 1
fi

tar -czf - -C "$SAIDA" . | ssh "$ALVO" '
  set -e
  cd ~/edu
  rm -rf app-web.novo && mkdir -p app-web.novo app-web
  tar -xzf - -C app-web.novo
  rsync -a --delete-after app-web.novo/ app-web/
  rm -rf app-web.novo
'

echo "Versao web publicada em $ALVO:~/edu/app-web"
