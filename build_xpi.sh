#!/bin/sh

# install dependencies
npm install

# transpile ts modules
npx browserify src/common.ts src/background.ts -p tsify -o dist/background.js
npx browserify src/common.ts src/options.ts -p tsify -o dist/options.js

# Copy html to the correct folder.
cp src/*.html dist

# create thunderbird addon
zip joplin-export.xpi _locales/**/*.json images/*.png dist/* manifest.json
