#!/bin/sh
# ELAGENCYLER — oyun sunucusu + internet tüneli başlatıcı
# Kullanım: sh baslat.sh
cd "$(dirname "$0")"

if lsof -i :8000 >/dev/null 2>&1; then
  echo "Port 8000 dolu — oyun sunucusu zaten çalışıyor."
else
  ruby server.rb >> server.log 2>&1 &
  echo "Oyun sunucusu başladı: http://localhost:8000"
fi

if pgrep -f "cloudflared tunnel" >/dev/null 2>&1; then
  echo "Tünel zaten açık."
else
  cloudflared tunnel --url http://localhost:8000 > cloudflared.log 2>&1 &
  echo "Tünel başlatılıyor..."
  sleep 8
fi

URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" cloudflared.log | head -1)
if [ -n "$URL" ]; then
  echo ""
  echo "Sehir disindan bu adresle giriliyor: $URL"
  echo "Arkadaslarin bu adresi acip oda koduyla katilir."
else
  echo "Tunel adresi bulunamadi — cloudflared.log dosyasina bak."
fi
