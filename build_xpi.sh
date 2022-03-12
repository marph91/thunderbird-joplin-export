#!/bin/sh

# install dependencies
npm install

# bundle js modules
npx browserify scripts/common.js scripts/background.js -o static/background.js
npx browserify scripts/common.js scripts/options.js -o static/options.js

# create thunderbird addon
zip joplin-export.xpi _locales images/*.png static manifest.json
