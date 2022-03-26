#!/bin/sh

# install dependencies
npm install

# bundle js modules
npx browserify src/common.js src/background.js -o dist/background.js
npx browserify src/common.js src/options.js -o dist/options.js

# Copy html to the correct folder.
cp src/*.html dist

# create thunderbird addon
zip joplin-export.xpi _locales/**/*.json images/*.png dist/* manifest.json
