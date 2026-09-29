#!/usr/bin/env bash
# Pasang LAYAN sebagai service systemd dan buka lewat Cloudflare Tunnel yang sudah ada.
# Jalankan di server:  cd ~/layan && sudo bash deploy/install-server.sh
# Aman diulang: ingress dan DNS yang sudah ada dilewati.
set -euo pipefail
HOST=${LAYAN_HOST:-layan.codewithus.me}
APP_USER=arvamadax
CF=/etc/cloudflared/config.yml
TUNNEL=$(awk '/^tunnel:/{print $2}' "$CF")
cd "$(dirname "$0")/.."

test -x api/target/release/layan-api || { echo "Build API dulu: bash deploy/deploy-api.sh"; exit 1; }
test -f "/home/$APP_USER/layan-web/server.js" || { echo "Kirim web dulu: bash deploy/deploy-web.sh"; exit 1; }

cp deploy/layan-api.service deploy/layan-web.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now layan-api layan-web

# CNAME ke tunnel. Kalau sudah ada, cloudflared menolak dan itu tidak apa-apa.
sudo -H -u "$APP_USER" cloudflared tunnel route dns "$TUNNEL" "$HOST" || true

if ! grep -q "hostname: $HOST" "$CF"; then
  cp "$CF" "$CF.bak-layan"
  sed -i "s|^  - service: http_status:404|  - hostname: $HOST\n    service: http://127.0.0.1:8171\n  - service: http_status:404|" "$CF"
  cloudflared tunnel ingress validate --config "$CF"
  # Restart dijadwalkan SETELAH script selesai. SSH lewat tunnel ini ikut putus, dan semua situs
  # di tunnel ini down sekitar 1-2 menit sampai tersambung lagi.
  systemd-run --on-active=5s --unit="layan-cf-restart-$(date +%s)" systemctl restart cloudflared
  echo "cloudflared di-restart 5 detik lagi. Situs di tunnel ini (dan SSH) putus sekitar 1-2 menit."
fi

systemctl is-active layan-api layan-web
echo "Selesai: https://$HOST"
