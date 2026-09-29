#!/usr/bin/env bash
# Tarik kode terbaru dan build API LAYAN di server (Rust terpasang di ~/.cargo).
# Pakai: bash deploy/deploy-api.sh   (dari laptop)
set -euo pipefail
HOST=${HOST:-home-server-cf}
ssh "$HOST" 'cd ~/layan && git pull -q && cd api && ~/.cargo/bin/cargo build --release 2>&1 | tail -2'
echo "Selesai build. Di server: sudo systemctl restart layan-api"
