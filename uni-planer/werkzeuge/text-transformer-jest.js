// Jest: .ics- und .sql-Dateien als String-Modul laden (Gegenstück zu text-transformer-metro.js).
module.exports = {
  process(quelltext) {
    return { code: `module.exports = ${JSON.stringify(quelltext)};` };
  },
};
