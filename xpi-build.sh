#!/bin/bash

# Firefox Android needs a new .xpi file every time to actually update the extension.
FIREFOX_XPI="firefox-$(date +%s).xpi"
CHROME_XPI="chrome-$(date +%s).xpi"

rm *.xpi

# Build and .xpi for Chrome first.
zip -1r ${CHROME_XPI} lib res *.json

# Firefox is a special snowflake and needs additional tags in manifest.json.
FF_TAG='"browser_specific_settings":{"gecko":{"id":"hn-buddy@firefox.org"}}'
FF_TMP_DIR=/tmp/${FIREFOX_XPI}

mkdir -p ${FF_TMP_DIR}
cp -r lib res *.json ${FF_TMP_DIR}
sed -i -e "s/^{/{${FF_TAG},/g" ${FF_TMP_DIR}/manifest.json
(cd ${FF_TMP_DIR} && zip -1r tmp.xpi *)
cp ${FF_TMP_DIR}/*.xpi ${FIREFOX_XPI}
