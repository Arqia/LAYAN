#!/usr/bin/env bash
# Build web LAYAN (standalone) di laptop lalu kirim ke server. Server cukup punya Node, tanpa npm.
# Pakai: bash deploy/deploy-web.sh   (dari root repo)
set -euo pipefail
HOST=${HOST:-home-server-cf}
cd "$(dirname "$0")/../web"
rm -rf .next/standalone
NEXT_PUBLIC_BUILD_ID=$(git rev-parse --short HEAD) API_URL=http://127.0.0.1:8170 npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
tar -czf /tmp/layan-web.tgz -C .next/standalone .
scp /tmp/layan-web.tgz "$HOST":/tmp/layan-web.tgz
ssh "$HOST" 'mkdir -p ~/layan-web.new && tar -xzf /tmp/layan-web.tgz -C ~/layan-web.new \
  && rm -rf ~/layan-web.old && { [ -d ~/layan-web ] && mv ~/layan-web ~/layan-web.old || true; } \
  && mv ~/layan-web.new ~/layan-web && rm /tmp/layan-web.tgz'
echo "Terkirim. Di server: sudo systemctl restart layan-web"
