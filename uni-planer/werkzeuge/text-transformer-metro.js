// Metro: .ics- und .sql-Dateien als String-Modul laden, alles andere an den Expo-Transformer weiterreichen.
const { getDefaultConfig } = require('expo/metro-config');

const standard = require(getDefaultConfig(__dirname).transformer.babelTransformerPath);

module.exports.transform = (parameter) => {
  if (/\.(ics|sql)$/.test(parameter.filename)) {
    return standard.transform({
      ...parameter,
      src: `module.exports = ${JSON.stringify(parameter.src)};`,
    });
  }
  return standard.transform(parameter);
};
