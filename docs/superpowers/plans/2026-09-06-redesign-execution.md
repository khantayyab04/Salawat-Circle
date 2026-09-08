# Redesign PR #40 – Implementierung und Prüfstand

Stand: 7. September 2026. Branch `codex/frontend-redesign`, Ausgangscommit `0dd7546`. Änderungen liegen lokal; kein Commit, Push, Merge oder Deployment. Die schon vorhandenen unversionierten Verzeichnisse `.agents/` und `apps/mobile/ios/` bleiben unverändert außerhalb des Arbeitspakets.

Grundlage: `2026-09-05-redesign-finalization.md`, Produktspezifikation, MVP-Issues #4–#11 und das Figma-Make-Archiv des Nutzers. Produktionsbetrieb, Store-Auslieferung, SMTP und vollständige Rechts-/Datenrechtsprozesse bleiben außerhalb dieses MVP-Pakets.

## Umgesetzt

- Eigene Werte von 1 bis 10.000.000; ungültige Rohtexte werden nicht in andere Zahlen umgewandelt. Laden und Fehler mit Retry erscheinen vor Summen und Erfassung. Während des Speicherns bleiben Vormerkung und Eingaben geschützt; fehlgeschlagene Werte bleiben erhalten.
- Erreichbarer Einzelverlauf unter `/progress/history`, echte Cursor-Paginierung, Bearbeiten, bestätigtes Löschen, Fehler-/Offlinezustände und Konfliktauflösung. Bearbeitungsentwürfe überleben neue Serverrevisionen; Übernahme neuer Werte oder Fortsetzen des Entwurfs verlangt eine ausdrückliche Entscheidung.
- Fortschrittsdiagramme mit passenden Zeiträumen, lokalisierten Achsen und exakten Summen. Alte oder falsch zugeordnete Antworten werden verworfen. Änderungen, Fokus und Synchronisierung invalidieren bzw. aktualisieren Diagramme. Bei ausstehenden Änderungen erklärt ein vollständiger Zustand, warum das Diagramm auf Synchronisierung wartet.
- Keine Streak-Karten und keine Streak-Berechnung im aktuellen RPC. Zielstatus ist zusätzlich über Symbole, Legende und zugängliche Beschriftungen erkennbar.
- Tagesziel mit exakter Eingabe und nativem Schnellregler, bewahrtem Entwurf, gesperrtem Formular während des Speicherns und ausdrücklich beschrifteter Deaktivierung. Ein bisher nicht vorhandenes Ziel kann nicht scheinbar deaktiviert werden.
- Monatsrangliste wird vom Runtime-Parser akzeptiert. Gruppen-Insights werden nach Gruppe und Zeitraum gespeichert. Monotone Request-IDs verhindern alte Ergebnisse nach Austritt/Wiederbeitritt; alte Requests und Mitgliedschaftsdaten werden entfernt.
- Gruppenmetadaten und Revisionen aktualisieren sich nach Umbenennung, Alias- und Zieländerungen. Inhaber können Zeitraumziele setzen, ändern und entfernen. Verwaltung und Einladungscodes sind als Sheets mit Bestätigung, Kopieren/Teilen und sichtbaren Fehlern nutzbar.
- Erstellen-/Codebeitritt-Aktionen verwenden auf schmalen Displays oder bei großer Schrift die volle Breite; der deutsche Text bricht nicht mehr mitten in „Einladungscode“ um. Listen und Aktionen berücksichtigen die schwebende Tab-Leiste.
- Anmeldung/Onboarding mit gemeinsamen Karten und Schrittanzeigen; synchrone Guards verhindern doppelte OTP-, Resend-, Profil- und Consent-Anfragen. Konto lädt Profiländerungen beim Fokus nach. Profil-Ladefehler haben einen Retry statt eines leeren Formulars.
- Tägliche Reminder-Mutationen und Initialisierung sind serialisiert; Fehler werden im Provider abgefangen. Neue Trigger werden vor Entfernung des bisherigen Triggers geplant und gespeichert. Auch Sprachänderungen erhalten den bisherigen Trigger bei fehlgeschlagener Neuplanung und erlauben einen erneuten Versuch.
- Hilfe verlinkt reale App-Abläufe; Datenschutz und rechtliche Hinweise beschreiben ehrlich den vorhandenen MVP-Umfang.
- Gemeinsame Buttons behalten ihren zugänglichen Namen während des Ladens und erlauben lange Übersetzungen. Sheets scrollen mit Formular und Aktionen, berücksichtigen die Tastatur und schützen laufende Änderungen. Bewegungsreduktion wird beachtet; wiederholte Erfassung wird nicht dekorativ animiert.

## Review und Regressionen

Die sieben ursprünglichen PR-Kommentare wurden technisch geprüft und bearbeitet. Ein zusätzlicher unabhängiger Review prüfte Entries, Progress, Shared UI und die Streak-Migration. Seine sechs Befunde wurden anschließend umgesetzt:

| Befund | Korrektur / Nachweis |
| --- | --- |
| Unbenannter nativer Zielregler | Native SwiftUI-Modifier für Name, Hinweis und Wert. Android erhält einen benannten `adjustable`-Knoten mit Inkrement-/Dekrement-Aktionen; der unbenannte native Unterbaum ist für TalkBack verborgen. iOS-Semantik tatsächlich im Simulator gelesen; Android-Aktionen im Komponententest geprüft. |
| Ungültige Zahlen wurden umgeschrieben | Rohtext bleibt erhalten; Dezimal-, Minus- und Exponentialschreibweise sperren Übernehmen/Speichern. Führende Nullen bleiben zulässig. |
| Unklare Zieldeaktivierung | Explizites „Ziel deaktivieren“ bei bestehendem ausgeschaltetem Ziel; kein nutzloser Deaktivierungsbutton ohne vorhandenes Ziel. |
| Wiederholte „Synchronisiert“-Labels | Nur ausstehende, fehlgeschlagene oder konfliktbehaftete Einträge zeigen einen Status. |
| Irreführende Offline-Diagrammbeschreibung | Separater Zustand „Diagramm wartet auf Synchronisierung“, ohne Behauptung eines sichtbaren Diagramms. |
| Nur farblich unterscheidbarer Zielstatus | Zeichen und Legende für erreicht, unter Ziel, erfasst und zukünftig sowie vollständige Accessibility-Labels. |

Die erneute unabhängige Abschlussprüfung konnte nach dem Nutzungslimit nicht vollständig stattfinden. Der Hauptagent prüfte und korrigierte die gemeldeten Befunde und führte die automatisierten Prüfungen aus. Das ersetzt keinen behaupteten zweiten unabhängigen Freigabelauf.

## RED–GREEN-Befehle

Arbeitsverzeichnis für mobile Befehle: `apps/mobile`. Die jeweils gleiche Zeile wurde zuerst mit einem fachlich fehlschlagenden Regressionstest und nach der Korrektur erneut ausgeführt. Die Rohlogs liegen vorübergehend unter `/private/tmp/salawat-*.log`.

| Verhalten | RED- und GREEN-Befehl |
| --- | --- |
| Alte/falsch zugeordnete Diagrammantworten, Invalidation | `./node_modules/.bin/vitest run src/lib/entries/entries-store.test.ts src/lib/progress-series.test.ts` |
| Initialer Heute-Fehler und Retry | `./node_modules/.bin/jest --runInBand src/screens/today/index.ui.test.tsx` |
| Vormerkung während Speichern, genaue Rohtexte und Fehlerrückmeldung | `./node_modules/.bin/jest --runInBand src/screens/today/recording.ui.test.tsx` |
| Erreichbarer Verlauf | `./node_modules/.bin/jest --runInBand src/screens/progress/history-screen.ui.test.tsx` |
| Dashboardzustände, Verlauf-Navigation, ausstehende Synchronisierung | `./node_modules/.bin/jest --runInBand src/screens/progress/progress-screen.ui.test.tsx` |
| Entwurf und neuere Serverrevision | `./node_modules/.bin/jest --runInBand src/screens/entry/index.ui.test.tsx` |
| Zielentwurf, Busy, Reglersemantik, Rohtexte, Deaktivierung | `./node_modules/.bin/jest --runInBand src/components/goal-sheet.ui.test.tsx` |
| Nur außergewöhnliche Sync-Zustände | `./node_modules/.bin/jest --runInBand src/components/entry-row.ui.test.tsx` |
| Nicht nur farbliche Diagramminformation | `./node_modules/.bin/jest --runInBand src/components/activity-chart.ui.test.tsx` |
| Gruppenparser, Cache und Mitgliedschaftswechsel | `./node_modules/.bin/vitest run src/lib/groups/groups-gateway.test.ts src/lib/groups/groups-store.test.ts` |
| Gruppenansichten, Ziele und Metadaten | `./node_modules/.bin/jest --runInBand src/screens/groups/group-detail.ui.test.tsx src/screens/groups/group-detail.provider.ui.test.tsx` |
| Einladungsaktionen | `./node_modules/.bin/jest --runInBand src/screens/groups/group-invites.ui.test.tsx` |
| Kompakte / große Schrift bei Gruppenaktionen | `./node_modules/.bin/jest --runInBand src/screens/groups/groups-list.ui.test.tsx` |
| OTP-/Onboarding-Doppelaktionen | `./node_modules/.bin/jest --runInBand src/screens/auth/index.ui.test.tsx` |
| Profil-Retry, Konto-Refresh und Hilfe | `./node_modules/.bin/jest --runInBand src/screens/settings/index.ui.test.tsx src/screens/settings/profile-screen.ui.test.tsx` |
| Reminder-Serialisierung und Sprachwechsel bei Planungsfehler | `./node_modules/.bin/vitest run src/lib/reminder/reminder-controller.test.ts` |
| Reminder-Fehler / Initialisierungsfehler | `./node_modules/.bin/jest --runInBand src/lib/reminder/provider.ui.test.tsx src/screens/settings/reminder-screen.ui.test.tsx` |
| Buttons, Eingaben und Sheet-Schutz | `./node_modules/.bin/jest --runInBand src/components/primitives.ui.test.tsx src/components/app-sheet.ui.test.tsx` |
| Entfernen eines Gruppenziels (Repo-Wurzel) | `./node_modules/.bin/supabase test db supabase/tests/group_goal_clear.test.sql` – RED 6/8 fehlgeschlagen, GREEN 8/8 |
| Streaks entfernen (Repo-Wurzel) | `./node_modules/.bin/supabase test db supabase/tests/mvp12_progress_series.test.sql` – RED 2/13 fehlgeschlagen, GREEN 13/13 |

## Gesamtprüfung

`pnpm verify` an der Repo-Wurzel mit dem bereits installierten pnpm-11.19.0-Binärpfad in `PATH`: erfolgreich. 4 Smoke-Tests, 382 Unit-Tests (49 Dateien), 272 UI-Tests (37 Suites), Expo Lint sowie Typechecks für Shared Types und Mobile. Anschließend: Ziel-Suite mit den ergänzten Android-Regler-/Wertebereichsprüfungen **18/18 bestanden**, erneuter Mobile-Typecheck und gezielter Lint bestanden. Die zwei ergänzten Tests sind in der Zahl 272 noch nicht enthalten.

`./node_modules/.bin/supabase test db`: **556 Prüfungen in 23 Dateien bestanden**. Beide neuen Migrationen wurden nur auf der lokalen Datenbank angewendet, ohne Reset:

- `20260906010000_group_goal_clear.sql`
- `20260906020000_progress_without_streaks.sql`

`node --test --test-concurrency=1 scripts/*.integration.test.mjs` mit installiertem pnpm im `PATH`: **8 Tests bestanden**, mit echten lokalen Auth-/RPC-/Datenbankpfaden für Anmeldung, Einträge, Ziele, Offline, Gruppen, Verwaltung und Profil. Synthetische lokale Konten; keine produktiven Datenänderungen.

Jest meldet weiterhin den bekannten Expo-Go-Hinweis zu Android-Remote-Push aus einem importierten Benachrichtigungsmodul. Die App verwendet hier einen nativen Development Build und lokale Erinnerungen. Der Hinweis wurde nicht pauschal unterdrückt.

## Tatsächlich im iPhone-Simulator geprüft

Lokales iPhone 17 Pro, iOS 26.5, vorhandener Development Build. Separater Metro auf Port 8084 mit `EXPO_PUBLIC_LOCAL_DEMO=false`; der vorher vorhandene Preview-Server auf 8083 blieb erhalten.

- Deutsche Welcome-, E-Mail-, Code-, Profil- und Consent-Ansichten mit echtem lokalem OTP-Onboarding bis zur angemeldeten App.
- Eigener Wert 333, Speichern, Fortschrittsanzeige, erreichbarer Einzelverlauf, Bearbeiten auf 334, bestätigtes Löschen und korrekter Leerzustand.
- Deutsche Gruppenliste, erfolgreiche Erstellung einer privaten Testgruppe, Monatsrangliste ohne Parserfehler und Speichern eines Monatsziels.
- Einladung erzeugen, sichtbare Kopierbestätigung, Codeeingabe und Vorschau einschließlich Freigabehinweis, Bestätigung als bereits aktives Mitglied, anschließend Widerruf der Testeinladung.
- Deutsch → Englisch → Deutsch; englisches Konto und Heute-Ansicht. Deutsche Today-, Dashboard- und Gruppenlayouts visuell kontrolliert.
- Tageszielsheet mit Tastatur und sichtbarer Speicheraktion; Tagesziel über exakte Eingabe gespeichert. Der iOS-Zielregler liefert in der nativen Accessibility-Struktur den lokalisierten Namen, Hinweis und Wert.

## Verbleibende Nachweise und Grenzen

- Maximal vergrößerte **Systemschrift im Simulator**: Die automatische Freigabeprüfung lehnte die vorübergehende Änderung ab, weil keine ausdrückliche Nutzerfreigabe dafür vorliegt. Es wurde keine Systemeinstellung geändert und keine Umgehung verwendet. Die responsive Gruppenlogik wurde im Komponententest bei schmaler Breite und doppelter Schriftgröße geprüft.
- Kein vollständiger nativer Android-/TalkBack-Durchlauf und kein physisches Gerät verfügbar. Die Android-Regleraktionen sind Komponententests, kein nativer TalkBack-Nachweis.
- Die komplette VoiceOver-Gestenprüfung und direkte Touch-Bedienung des Reglers konnten über die Simulator-Fernsteuerung nicht zuverlässig nachgewiesen werden. Native Semantik und Ereignisverarbeitung sind getrennt geprüft; ein vollständiger Gestennachweis bleibt offen.
- Zusätzliche Simulatoraktionen endeten später mit `noWindowsAvailable` / `timeoutReached`. Der ergänzende Profiländerungs-/Rückkehrdurchlauf wurde deshalb nicht als erfolgreich verbucht; der echte Profil-API-Pfad und die Komponenten sind geprüft.
- Kein Store-/Release-Build, Production-Deployment oder Remote-Anwenden der Migrationen. Rechtlich freigegebene Dokumente, produktiver Support und Datenrechtsautomatisierung bleiben Production-Arbeit.
