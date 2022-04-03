#!/bin/sh

set -e # exit on error

# install dependencies
npm install

# transpile ts modules
npx browserify src/common.ts src/background.ts -p tsify -o dist/background.js
npx browserify src/common.ts src/options.ts -p tsify -o dist/options.js

# Copy the needed files to the dist folder.
cp src/*.html src/*.js* dist

# create thunderbird addon
rm -f joplin-export.xpi
zip joplin-export.xpi _locales/**/*.json images/*.png dist/* manifest.json
