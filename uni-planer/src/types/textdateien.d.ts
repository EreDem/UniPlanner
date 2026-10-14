// .ics- und .sql-Dateien werden per Text-Transformer (werkzeuge/) als String geladen.
declare module '*.ics' {
  const inhalt: string;
  export default inhalt;
}

declare module '*.sql' {
  const inhalt: string;
  export default inhalt;
}
