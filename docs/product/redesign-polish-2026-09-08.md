# Redesign-Ergänzungen vom 8. September 2026

Die neun beauftragten Änderungen sind im bestehenden lokalen Arbeitsstand umgesetzt. Der Stand ist uncommitted und nicht veröffentlicht.

| Anforderung | Umsetzung |
| --- | --- |
| Produkttexte | Einstieg produktorientiert, interne Hinweise entfernt oder gekürzt; notwendige Fehler- und Datenschutzinformationen bleiben verständlich. Deutsch und Englisch aktualisiert. |
| Eingaben und Zielregler | Vertikale Textausrichtung vereinheitlicht; Regler rastet in 100er-Schritten bis 30.000 ein. Exakte Zahlen weiterhin über das Zahlenfeld. |
| Staged und Record | Beide Bereiche gleich breit. |
| Fortschrittsring | Leer neutral, Fortschritt grün, erreichtes Ziel gold. Ohne Ziel keine erfundene Zielerreichung. |
| Blessings | Tägliche Rotation; gesonderte Freitagsauswahl. Die Karte zeigt nur Sammlung und Nummer. Der optionale Geräte-Standort liegt bei der Freitags-Erinnerung. |
| Diagramme | Höhe relativ zum historischen Ziel des Zeitabschnitts; erreichtes Ziel voller goldener Balken. Zusätzliche Zielmarker und Legenden entfernt. |
| Historie | Bearbeitung innerhalb der aufgeklappten Eintragskarte; nativer Datumspicker, Speichern klappt zu. Fehlerentwürfe und Revisionskonflikte bleiben erhalten. |
| Gruppenziele | Eigene Ranglistenbeschriftung nur einmal; feste Monats-/30-Tage-Kampagne, Datumsauswahl, anteiliges Wochenziel mit eigener Überschreibung. |
| Inhaberschaft | Goldene Rollenkennzeichnung mit Text und Krone, Aktualisierung nach Transfer. Austritt als letzter Inhaber löscht atomar die Gruppe, persönliche Einträge bleiben erhalten. |

## Standort und Überlieferungen

Die Standortfunktion ist standardmäßig aus. Erst die bewusste Aktivierung kann die Systemabfrage auslösen. Wiederherstellung und Rückkehr in die App lesen bestehende Berechtigungen, ohne ungefragt eine neue Abfrage auszulösen. Gespeichert wird nur die Aktivierung, keine Koordinaten. Koordinaten werden auf zwei Nachkommastellen gerundet und nur im Arbeitsspeicher verwendet. Deaktivierung, App-Hintergrund und überholte Anfragen verwerfen sie. Es gibt keine Hintergrundortung und keine Übertragung an das Backend.

Ohne Standort, bei Fehlern oder ohne berechenbaren Sonnenuntergang gilt der Kalenderfreitag; die Oberfläche erklärt diesen Ersatz. Mit Standort wird die Gerätezeitzone verwendet, andernfalls die Profilzeitzone. Die Sonnenuntergangsberechnung ist eine Näherung, kein externer Gebetszeitenservice.

Die Karten zeigen kurze deutsche/englische Wiedergaben und ausschließlich Sammlung plus Nummer. Einstufungen, Namen von Bewertenden und externe Quellenlinks erscheinen nicht in der App. Es werden keine aus App-Zahlen abgeleiteten spirituellen Belohnungen zugesagt.

## Darkmode-Prüfung

Gold wird nicht als Schrift- oder Symbolfarbe auf der grünen Primärfläche verwendet. Die Blessings-Karte nutzt die kontrastierende Primärflächenfarbe; der aktive goldene Tab verwendet die kontrastierende Goldflächenfarbe. Die übrigen Goldakzente liegen auf dunklen oder neutralen Oberflächen. Token-Tests prüfen die WCAG-AA-Kontraste der Textflächen. Zusätzlich wurden die heutige Ansicht und die Freitags-Erinnerung im iPhone-17-Pro-Simulator mit aktiviertem Darkmode betrachtet.

## Prüfung

Die Entwicklung wurde mit gezielten RED/GREEN-Läufen für Komponenten, Standort-/Freitagslogik und SQL-Verhalten begleitet. Die neuen Tests für die reduzierte Hadith-Quellenzeile, die kontrastierende Darkmode-Karte, den separaten Freitags-Reminder und dessen eigenen Benachrichtigungstext waren zunächst rot und anschließend grün.

```sh
# apps/mobile; gezielter RED/GREEN-Befehl
node node_modules/jest/bin/jest.js --runInBand src/components/blessings-card.ui.test.tsx src/screens/settings/reminder-screen.ui.test.tsx
node node_modules/vitest/vitest.mjs run src/lib/reminder/reminder-controller.test.ts

# Abschließende Gesamtläufe, apps/mobile
node node_modules/jest/bin/jest.js --runInBand
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit

# Repository-Wurzel
node --test scripts/mvp01-smoke.test.mjs
pnpm lint
node apps/mobile/node_modules/typescript/bin/tsc --noEmit -p packages/shared-types/tsconfig.json
node_modules/.bin/supabase test db
git diff --check
```

Ergebnis: 41 UI-Suites / 306 Tests, 50 Unit-Testdateien / 398 Tests, 25 SQL-Testdateien / 587 Tests und vier Smoke-Tests erfolgreich. Typechecks, Lint und Diff-Prüfung erfolgreich. SQL-Prüfungen umfassen negative Autorisierungs-/RLS-Fälle. Die drei neuen Migrationen wurden lokal angewendet und im lokalen Migrationsverlauf registriert; keine entfernte Datenbank wurde geändert.

Der lokale iOS-Development-Build mit expo-location wurde erfolgreich erstellt und im iPhone-17-Pro-Simulator installiert: null Fehler, eine Build-Script-Warnung wegen fehlender Ausgabedatei-Abhängigkeiten. Die heutige Ansicht und die Freitags-Erinnerung wurden im Darkmode betrachtet. Standort-Systemdialog, kleine/große Bildschirmgrößen und Android benötigen noch visuelle Prüfung. Automatisierte Tests ersetzen diese Abnahme nicht.
