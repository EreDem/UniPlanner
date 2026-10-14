// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// schema.sql und die Beispiel-.ics werden als String importiert.
config.resolver.sourceExts.push('ics', 'sql');
config.transformer.babelTransformerPath = require.resolve('./werkzeuge/text-transformer-metro.js');

module.exports = config;
