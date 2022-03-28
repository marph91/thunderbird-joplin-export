#!/bin/sh

# install dependencies
npm install

# transpile ts modules
npx tsc

# Copy html to the correct folder.
cp src/*.html dist

# create thunderbird addon
zip joplin-export.xpi _locales/**/*.json images/*.png dist/* manifest.json
