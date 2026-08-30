# Mobile App

Die Expo-App für iOS und Android läuft als Managed-Expo-Projekt mit Expo Router.
Lokale Einrichtung und allgemeine Startbefehle stehen in der
[Entwickleranleitung](../../README.md#lokale-entwicklung).

## App-Hülle und Navigation

`src/app` enthält ausschließlich Routendateien und Layouts. Die eigentlichen
Oberflächen liegen unter `src/screens`, gemeinsam genutzte Bausteine unter
`src/components`. Die drei nativen Tabs sind:

- `/today` – Heute
- `/groups` – Gruppen
- `/settings` – Einstellungen

Der Einstieg `/` leitet in MVP02 auf `/welcome` weiter. Authentifizierung,
Onboarding und fachliche Aktionen sind bewusst nur navigierbare Shells und führen
keine Backend-Mutation aus.

## Theme

Farben, Abstände, Radien, Bewegung und Typografie liegen unter `src/theme`.
Komponenten verwenden ausschließlich `useAppTheme()` und die vorhandenen Tokens,
damit Light/Dark Mode und Navigation dasselbe Farbschema nutzen.

## Übersetzungen und Sprachwahl

Die Kataloge `src/localization/de.ts` und `src/localization/en.ts` sind getrennt.
Die App rendert immer genau einen Katalog. Die Auswahl `system`, `de` oder `en`
wird unter `preferences.language.v1` lokal gespeichert und niemals an Supabase
übertragen.

Neue sichtbare Texte werden so ergänzt:

1. Schlüssel und deutschen Text in `de.ts` hinzufügen.
2. Denselben Schlüssel gleichzeitig in `en.ts` ergänzen.
3. Im Screen ausschließlich `t("schluessel")` verwenden.
4. Unit- und UI-Tests ausführen; TypeScript und der Katalogtest verhindern
   abweichende Schlüssel.

## Prüfung

```sh
pnpm --filter @salawat-circle/mobile test
pnpm --filter @salawat-circle/mobile lint
pnpm --filter @salawat-circle/mobile typecheck
pnpm verify
pnpm exec expo install --check
pnpm exec expo-doctor
```

Für die Geräteabnahme werden Expo Go auf iOS und Android, beide Sprachen,
Light/Dark Mode, Hoch-/Querformat, maximale Accessibility-Schrift, Reduce Motion,
VoiceOver und TalkBack geprüft.
