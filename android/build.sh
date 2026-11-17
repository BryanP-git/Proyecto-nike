#!/usr/bin/env bash
# Arma Armario.apk sin Android Studio ni Gradle.
# Necesita:
#   ANDROID_JAR  ruta a android.jar (plataforma 30 o superior)
#   AAPT2        ruta al ejecutable aapt2
#   SMALI_DIR    carpeta con smali 3.x y sus dependencias (smali, smali-dexlib2, smali-util, antlr-runtime, guava, jcommander, stringtemplate)
#   Java 11+ y Python 3 con: pip install repro-apk cryptography
# Uso: ANDROID_JAR=... AAPT2=... SMALI_DIR=... ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_JAR:?falta ANDROID_JAR}" "${AAPT2:?falta AAPT2}" "${SMALI_DIR:?falta SMALI_DIR}"
VERSION_CODE="${VERSION_CODE:-1}"; VERSION_NAME="${VERSION_NAME:-1.0}"
rm -rf build && mkdir -p build

echo "1/5 recursos (aapt2 compile)"
"$AAPT2" compile --dir res -o build/res.zip

echo "2/5 manifiesto + recursos + assets (aapt2 link)"
"$AAPT2" link -o build/base.apk -I "$ANDROID_JAR" --manifest AndroidManifest.xml -A assets \
  --min-sdk-version 24 --target-sdk-version 34 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" build/res.zip

echo "3/5 código (smali -> classes.dex)"
java -cp "$SMALI_DIR/*" com.android.tools.smali.smali.Main assemble --api 24 -o build/classes.dex smali
(cd build && zip -q base.apk classes.dex)

echo "4/5 alineación (zipalign)"
repro-apk zipalign 4 build/base.apk build/aligned.apk

echo "5/5 firma (APK Signature Scheme v2)"
python3 sign.py build/aligned.apk build/Armario.apk firma
ls -lh build/Armario.apk
