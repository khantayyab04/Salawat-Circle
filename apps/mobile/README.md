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

Der Einstieg `/` leitet auf `/welcome` weiter. Nach Anmeldung, Profil und
Einwilligung ist die Heute-Ansicht nutzbar: Einträge werden über die geschützten
RPCs erstellt, im Verlauf cursorbasiert geladen, bearbeitet und nach Bestätigung
gelöscht. Die Anzeige nutzt die gespeicherte IANA-Zeitzone; nur wenn sie lokal
nicht verfügbar ist, wird automatisch die Gerätezeitzone verwendet.

`src/lib/entries` kapselt Betrags- und Kalenderlogik, exakte BigInt-Summen,
den Supabase-Gateway, den optimistischen Store und dessen React-Provider.
`src/lib/offline` ergänzt verschlüsselte SQLite-Persistenz, Mutation-Queue,
Backoff und Konfliktauflösung. `src/screens/today` und `src/screens/entry`
enthalten die jeweiligen Oberflächen.

## Tagesziel und Dashboard

Unter den Kennzahlen der Heute-Ansicht steht der Zielbereich. Der `@expo/ui`
Slider ermöglicht Werte in 100er-Schritten bis 10.000; das gekoppelte
Zahlenfeld erlaubt zusätzlich jeden ganzen Wert bis 10.000.000. Ein Ziel gilt
ab heute, kann deaktiviert werden und zeigt den serverseitig berechneten
Wochenfortschritt als erreichte/relevante Tage. Ohne relevante Zieltage zeigt
die App `Noch kein Zieltag`, niemals `0/0`.

Der E2E-Vertrag für Setzen, tagesgleiches Ändern und Deaktivieren läuft mit:

```sh
pnpm test:goals-integration
```

Zielmutationen werden seit MVP07 wie Eintragsmutationen zuerst lokal gespeichert
und bei verfügbarer Verbindung synchronisiert.

## Offlinebetrieb

Die App schreibt gültige Eintrags- und Zielmutationen vor der UI-Bestätigung in
den verschlüsselten lokalen Kontozustand. Die UI kennzeichnet ausstehende,
fehlgeschlagene und konfliktbehaftete Einträge; dauerhafte Fehler können manuell
erneut versucht werden. Netzrückkehr, App-Foreground und ein Backoff-Timer stoßen
die Queue erneut an.

Lokale Nutzdaten werden mit AES-256-GCM verschlüsselt. Ein zufälliger Schlüssel
pro Konto und Installation liegt in SecureStore, niemals in SQLite. Die Queue
enthält keine Sitzungstoken. Abmeldung und Kontowechsel löschen sowohl den
verschlüsselten Zustand als auch den zugehörigen Schlüssel.

Konflikte überschreiben keine neuere Serverrevision. Der Bearbeiten-Screen zeigt
Serverstand und lokale Absicht und bietet ausschließlich die expliziten Aktionen
**Serverstand behalten** oder **Meine Änderung erneut anwenden**.

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
pnpm test:entries-integration
pnpm test:offline-integration
pnpm exec expo install --check
pnpm exec expo-doctor
```

Für die Geräteabnahme werden Expo Go auf iOS und Android, beide Sprachen,
Light/Dark Mode, Hoch-/Querformat, maximale Accessibility-Schrift, Reduce Motion,
VoiceOver und TalkBack geprüft.
