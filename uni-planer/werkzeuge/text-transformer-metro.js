// Metro: .ics- und .sql-Dateien als String-Modul laden, alles andere an den Expo-Transformer weiterreichen.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Projektwurzel ist der Ordner über werkzeuge/ (dort liegt die package.json).
const standard = require(getDefaultConfig(path.join(__dirname, '..')).transformer.babelTransformerPath);

module.exports.transform = (parameter) => {
  if (/\.(ics|sql)$/.test(parameter.filename)) {
    return standard.transform({
      ...parameter,
      src: `module.exports = ${JSON.stringify(parameter.src)};`,
    });
  }
  return standard.transform(parameter);
};
