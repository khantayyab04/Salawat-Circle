# Salawat Circle – Codex-Projektanweisungen

Diese Datei gilt für das gesamte Repository. Lies zusätzlich die verbindliche Produktspezifikation in `salawat_app_produktspezifikation.md` und das aktuelle GitHub Issue, bevor du Verhalten entwirfst oder änderst.

## Aktueller Produktfokus

- Arbeite zuerst auf den GitHub-Milestone **MVP** hin. Er umfasst Frontend, Backend und die Kernfunktionen.
- Behandle den Milestone **Production** als nachgelagert. Admin-Oberfläche, formale Moderationsprozesse, vollständige Datenrechtsautomatisierung, umfassende CI/CD-, Last-, Security- und Store-Arbeit werden nicht beiläufig in den MVP gezogen.
- Die Produktspezifikation beschreibt den vollständigen Produktionszustand. Wenn Spezifikation und MVP-Issue unterschiedlich weit gehen, bestimmt das Issue den aktuellen Lieferumfang; Sicherheits-, Datenschutz- und Datenintegritätsgrenzen der Spezifikation bleiben verbindlich.
- Implementiere nichts aus dem ausdrücklich ausgeschlossenen Scope der Spezifikation.

## Verbindliches Skill-Protokoll

1. Prüfe vor jeder Antwort oder Aktion, welche installierten Skills zur Aufgabe passen. Lade zuerst `$using-superpowers`.
2. Bei jeder Expo-/EAS-Aufgabe lade danach `$expo-overview`. Ermittelt dieser einen Leaf-Skill, lies dessen vollständige `SKILL.md`, bevor du Dateien prüfst oder Code schreibst.
3. Bei Features, Bugfixes, Refactorings oder sonstigen Verhaltensänderungen lade `$test-driven-development` **vor** Produktionscode.
4. Nutze nur die Skills, die zur konkreten Aufgabe passen. Ein Skill-Name in dieser Datei ersetzt nicht das Lesen seiner aktuellen Anleitung.
5. Wenn ein genannter Skill nicht verfügbar ist, melde das kurz und arbeite nach denselben Projektregeln weiter. Erfinde keine Skill-Anweisungen.
6. Nutzeranweisungen und höherrangige Systemregeln haben Vorrang vor dieser Datei und vor Skills.

Erwartete lokale Skill-Pakete sind `expo/skills` (reguläre Expo-/EAS-Skills), `jakubkrehel/make-interfaces-feel-better` sowie aus `obra/superpowers` die Skills `using-superpowers` und `test-driven-development`. Installiere sie nicht bei jedem Lauf neu. Wenn ein Teammitglied oder eine neue Codex-Umgebung sie noch nicht besitzt, richte sie einmalig mit dem Codex Skill-Installer aus den genannten GitHub-Repositories ein.

## Skill-Routing

### Immer bei Expo

- `$expo-overview`: Einstieg und Router für jede Expo-/EAS-Aufgabe; SDK, Managed-/Prebuild-Status und passende Leaf-Skills bestimmen.
- Installiere Expo-Pakete mit `npx expo install`, nicht mit einem rohen Package-Manager-Befehl. Verwende zur installierten SDK-Version passende Dokumentation.

### Projektaufbau und Navigation

- `$expo-project-structure`: nur beim erstmaligen Aufbau der neuen Mobile-App oder bei der Entscheidung, wo eine neue Datei hingehört. Bestehende Struktur nicht nachträglich zwangsmigrieren.
- `$expo-router`: Routen, Tabs, Stacks, Modals, Sheets, Deep Links und Header.
- `$expo-upgrade`: ausschließlich für Expo-SDK-Upgrades und Abhängigkeitskonflikte; SDK-Versionen nie beiläufig erhöhen.
- `$expo-examples`: bei Integration externer Expo-Bibliotheken zuerst ein offizielles, versionskompatibles Beispiel prüfen.

### UI und Interaktion

- `$expo-native-ui`: native, plattformgerechte Screens, semantische Farben, Layout und Bedienelemente.
- `$expo-ui`: vor Picker, Slider, Switch, Menu, Bottom Sheet oder gruppierten Formularen prüfen, ob `@expo/ui` die native Komponente anbietet. Für große Datensätze `FlatList`/`FlashList` statt `@expo/ui List` verwenden.
- `$expo-design-system`: Tokens, Varianten, wiederverwendbare Komponenten und Prüfung auf hart codierte Styles.
- `$make-interfaces-feel-better`: bei jeder visuellen Implementierung und jedem UI-Review. Bestehendes Styling-System beibehalten; ruhige Bewegung, mindestens 44×44 Touch-Flächen, optische Ausrichtung und tabellarische Ziffern für dynamische Salawat-Werte beachten.
- `$expo-animation`: nur wenn Bewegung, Gesten oder Haptik einen erkennbaren Nutzen haben. Die Produktspezifikation verbietet aufdringliche Gamification; häufige Aktionen nicht dekorativ animieren.
- `$expo-tailwind-setup`: nur wenn das Projekt ausdrücklich Tailwind/NativeWind auswählt. Kein zweites Styling-System einführen.

### Daten, Backend und Offline

- `$expo-data-fetching`: bei jeder Netzwerk-, Supabase-, TanStack-Query-, Cache-, Fehler- oder Offline-Sync-Arbeit.
- PostgreSQL/Supabase bleibt die fachliche Quelle der Wahrheit. Client-Code ist nicht vertrauenswürdig für Autorisierung, Ranglisten, Mitgliedschaft oder fremde Summen.
- Neue Tabellen, RPCs und Policies ausschließlich über versionierte Migrationen. RLS und negative Fremdzugriffsfälle zusammen mit dem Verhalten entwickeln.
- E-Mail-Adressen, OTPs, Tokens, Salawat-Einzelwerte und persönliche Summen niemals loggen.

### Native und Web-Sonderfälle

- `$expo-dev-client`: wenn eine native Abhängigkeit einen Development Client oder interne Builds benötigt.
- `$expo-module`: nur für tatsächlich notwendige eigene Swift-/Kotlin-Module.
- `$expo-dom`: nur zum gezielten Einbetten vorhandener Web-Komponenten.
- `$expo-web-to-native`: nur bei einer echten Migration einer bestehenden Web-App; nicht für dieses native Greenfield-Projekt standardmäßig verwenden.
- `$expo-brownfield`: nicht standardmäßig verwenden; nur wenn Expo in eine bestehende native App eingebettet wird.
- `$expo-app-clip`: nicht Teil des MVP; nur bei expliziter Scope-Änderung.

### EAS, Betrieb und Release

- `$eas-workflows`: im Production-Paket für EAS-CI/CD. Vor YAML-Änderungen aktuelle Schemaquellen laden und geänderte Workflows mit EAS CLI validieren.
- `$eas-app-stores`: Produktionsbuilds, TestFlight, Play Store, Versionierung und Store-Metadaten.
- `$eas-hosting`: nur falls die Rechts-/Join-Website oder Expo Router API Routes tatsächlich über EAS Hosting bereitgestellt werden.
- `$eas-simulator`: nur für ausdrücklich gewünschte Cloud-/Remote-Simulatorläufe; auf diesem Mac lokale Simulatoren bevorzugen.
- `$eas-observe`: spätere Produktionsmessung von Start-, Render- und Navigationsleistung, ohne sensible Produktwerte zu erfassen.
- `$eas-update-insights`: Gesundheit und Adoption veröffentlichter OTA-Updates prüfen.
- Kostenpflichtige EAS-Aktionen, Builds, Deployments oder Store-Übermittlungen nie ohne ausdrücklichen Nutzerauftrag ausführen.
- `$expo-skill-feedback`: nur bei konkretem Fehler, fehlender Anleitung oder wiederholtem Scheitern eines Expo-Skills verwenden; keine Telemetrie ungefragt aktivieren.

## TDD: verpflichtender Entwicklungsablauf

Für jedes neue Verhalten, jeden Bugfix und jedes Refactoring gilt Red–Green–Refactor:

1. **RED:** Schreibe genau einen kleinen Test für das gewünschte Verhalten.
2. Führe ihn aus und beobachte, dass er aus dem erwarteten fachlichen Grund fehlschlägt. Ein Fehler wegen Syntax, Setup oder Import zählt nicht.
3. **GREEN:** Schreibe nur den minimal nötigen Produktionscode, damit dieser Test besteht.
4. Führe den Test und anschließend die betroffene Testsuite aus. Behebe Produktionscode, nicht die Erwartung, wenn der Test korrekt ist.
5. **REFACTOR:** Räume erst bei grünem Stand auf; füge dabei kein neues Verhalten hinzu.
6. Wiederhole den Zyklus pro Verhalten.

Zusätzliche Regeln:

- Kein Produktionscode ohne zuvor beobachteten roten Test.
- Jeder Bug beginnt mit einem reproduzierenden Regressionstest.
- Tests prüfen sichtbares/fachliches Verhalten und echte Logik; Mock-Aufrufe nur, wenn die Abhängigkeit anders nicht kontrollierbar ist.
- Für SQL/RLS zuerst einen fehlschlagenden pgTAP-/Integrationstest schreiben.
- Für UI-Verhalten zuerst einen Komponenten- oder Hook-Test schreiben. Rein visuelle Token-/Style-Änderungen, generierter Code und reine Konfiguration dürfen nur nach ausdrücklicher Zustimmung des Nutzers vom TDD-Ablauf ausgenommen werden.
- Beim Erstellen oder Ändern von Tests die Zusatzregeln des TDD-Skills in `writing-good-tests.md` lesen.
- In der Abschlussmeldung die ausgeführten RED- und GREEN-Befehle sowie nicht verifizierte Punkte nennen.

## Repository- und Git-Arbeitsweise

- Ein GitHub Issue ist die Einheit der Planung; ein Branch und Pull Request sind die Einheit der Implementierung.
- Bearbeite ein Work Package beziehungsweise einen klar abgegrenzten Teil davon pro Branch.
- Keine direkten Implementierungs-Pushes auf `main`.
- Ändere keine fremden oder unzusammenhängenden lokalen Änderungen.
- Neue Produktionsabhängigkeiten nur hinzufügen, wenn sie fachlich nötig, Expo-SDK-kompatibel und im PR begründet sind.
- Committe niemals Geheimwerte, lokale `.env`-Dateien, Service-Role-Schlüssel, OTPs oder Signierschlüssel.

## Architekturgrenzen

- Mobile App: `apps/mobile`; Routen ausschließlich unter `src/app`, wiederverwendbare UI unter `src/components`, komplexe Screen-Inhalte unter `src/screens`.
- Admin: `apps/admin`; gehört zur Production-Phase.
- Rechts-/Join-Website: `apps/legal-site`; vollständiger Ausbau gehört zur Production-Phase.
- Gemeinsame Typen, Validierung, Tokens und Lokalisierung unter `packages/*`.
- Datenbankmigrationen, Edge Functions und Backendtests unter `supabase/*`.
- Vermeide neue Funktionen außerhalb des MVP-Issues und vorzeitige Abstraktionen.

## Code-Review-Regeln

- Priorität: fachliche Korrektheit, Datenintegrität, RLS/Autorisierung, Datenschutz, Offline-Idempotenz und Regressionen.
- Prüfe, ob TDD nachweisbar eingehalten wurde: Test existiert, schlug aus dem richtigen Grund fehl und besteht nach minimaler Implementierung.
- Bei UI-Reviews `$make-interfaces-feel-better` im Modus `full` verwenden, sofern der Nutzer nicht `quick` verlangt. Nur tatsächlich geprüfte Kategorien als geprüft ausgeben.
- Findings enthalten konkrete Datei und Zeile, Auswirkung, sichere Korrektur und Schweregrad. Stilpräferenzen ohne Nutzerwirkung sind nicht blockierend.
- Keine Freigabe, wenn relevante Tests nicht liefen, Warnungen verschwiegen werden oder ein sicherheitsrelevanter Fremdzugriff ungeprüft bleibt.

## Definition of Done für MVP-Änderungen

- Das Issue-Verhalten ist vollständig, aber nicht über den vereinbarten MVP-Scope hinaus umgesetzt.
- Red–Green–Refactor wurde für jedes neue Verhalten eingehalten.
- Betroffene Tests, Typecheck und Lint laufen, sobald die entsprechenden Skripte im Projekt existieren.
- Lade-, Leer-, Fehler- und Offlinezustände sind dort berücksichtigt, wo sie zum geänderten Ablauf gehören.
- Deutsche Nutzertexte sind vollständig; keine theologischen Versprechen, Schuldmechaniken oder manipulative Gamification.
- Keine sensiblen Daten in Logs, Screenshots, Fixtures oder Fehlermeldungen.
- Dokumentation und Issue-/PR-Beschreibung nennen relevante Entscheidungen, Tests und verbleibende Production-Arbeit.
