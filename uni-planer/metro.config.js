// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// schema.sql und die Beispiel-.ics werden als String importiert.
config.resolver.sourceExts.push('ics', 'sql');
config.transformer.babelTransformerPath = require.resolve('./werkzeuge/text-transformer-metro.js');

// Web: expo-sqlite läuft im Browser als WebAssembly in einem Worker und braucht SharedArrayBuffer,
// also die .wasm-Datei als Asset und die Header für Cross-Origin-Isolation.
config.resolver.assetExts.push('wasm');
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
