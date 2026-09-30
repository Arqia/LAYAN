#!/usr/bin/env bash
# Build APK rilis lalu terbitkan ke server; App Android yang terpasang akan menawarkan pembaruan.
# Pakai (dari root repo, setelah menaikkan versionCode di android/app/build.gradle.kts):
#   NOTES="Perbaikan upload lampiran" bash deploy/release-android.sh
# MIN_VERSION_CODE=N memaksa pengguna di bawah versi N untuk memperbarui.
# Butuh android/keystore.properties + keystore rilis (tidak di-commit, lihat CONTRIBUTING.md).
set -euo pipefail
HOST=${HOST:-home-server-cf}
REMOTE_DIR=${REMOTE_DIR:-layan/api/releases}   # = APP_DIR API, relatif ke home di server
cd "$(dirname "$0")/../android"
[ -f keystore.properties ] || { echo "android/keystore.properties belum ada: APK akan bertanda tangan debug. Batal."; exit 1; }
# Gradle butuh JDK 17+; java di PATH laptop ini Java 8, jadi pakai JDK bawaan Android Studio
export JAVA_HOME=${JAVA_HOME:-"/c/Program Files/Android/Android Studio/jbr"}
export PATH="$JAVA_HOME/bin:$PATH"

./gradlew -q assembleRelease
APK=app/build/outputs/apk/release/app-release.apk
CODE=$(sed -n 's/^ *versionCode = \([0-9]*\).*/\1/p' app/build.gradle.kts)
NAME=$(sed -n 's/^ *versionName = "\(.*\)".*/\1/p' app/build.gradle.kts)
SHA=$(sha256sum "$APK" | cut -d' ' -f1)

# node untuk escape JSON catatan rilis (sudah terpasang untuk web)
CODE=$CODE NAME=$NAME SHA=$SHA node -e '
const e = process.env
console.log(JSON.stringify({
  versionCode: +e.CODE, versionName: e.NAME, notes: e.NOTES || "", sha256: e.SHA,
  minVersionCode: +(e.MIN_VERSION_CODE || 0),
  url: `/api/app/layan.apk?v=${e.CODE}`, // query per versi supaya cache lama tidak terpakai
}, null, 2))' > /tmp/latest.json

# APK dulu, latest.json terakhir: app tidak pernah melihat versi yang file-nya belum ada
ssh "$HOST" "mkdir -p ~/$REMOTE_DIR"
scp "$APK" "$HOST:$REMOTE_DIR/layan.apk.new"
scp /tmp/latest.json "$HOST:$REMOTE_DIR/latest.json.new"
ssh "$HOST" "cd ~/$REMOTE_DIR && mv layan.apk.new layan.apk && mv latest.json.new latest.json"
echo "Rilis $NAME (versionCode $CODE) terbit. Cek: curl https://layan.codewithus.me/api/app/latest"
