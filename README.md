# Salawat Circle

Salawat Circle ist eine datensparsame mobile App zum persönlichen Erfassen von Salawat und zum freiwilligen Teilen aggregierter Werte in privaten Gruppen.

Die verbindliche Produkt- und Umsetzungsspezifikation liegt in [`salawat_app_produktspezifikation.md`](./salawat_app_produktspezifikation.md).

## Geplanter Stack

- React Native mit Expo und TypeScript
- Expo Router
- Supabase in einer EU-Region mit PostgreSQL und Row Level Security
- Verschlüsselte lokale SQLite-Datenbank für Offlinebetrieb
- GitHub Actions beziehungsweise EAS Workflows für CI und Release

## Repository-Struktur

```text
apps/
  mobile/       Mobile App für iOS und Android
  admin/        Interne Moderationsoberfläche
  legal-site/   Datenschutz-, Rechts-, Support- und Einladungsseiten
packages/
  shared-types/
  validation/
  design-tokens/
  localization/
supabase/
  migrations/
  functions/
  tests/
e2e/
  maestro/
docs/
  architecture/
  threat-model/
  privacy/
  runbooks/
```

## Arbeitsweise

Die Umsetzung wird in GitHub Issues geplant. Für jedes Work Package wird ein eigener Branch erstellt und über einen Pull Request nach `main` integriert. Direkte Implementierungsänderungen auf `main` sind nach Einrichtung des Branch-Schutzes nicht vorgesehen.

## Lokale Entwicklung

### Voraussetzungen

- Node.js ab `22.13.0`
- pnpm `11.19.0` (im Feld `packageManager` festgeschrieben)
- Docker Desktop oder eine kompatible laufende Docker Engine
- Für iOS: macOS mit Xcode und einem iOS-Simulator
- Für Android: Android Studio mit einem gestarteten Emulator

Der lokale Rechner verwendet keine Staging- oder Produktionsdaten. Alle lokalen Daten müssen
synthetisch sein.

### Installation

```bash
corepack enable
corepack install
pnpm install --frozen-lockfile
```

### Lokales Backend

```bash
pnpm supabase:start
pnpm supabase:status
```

Danach `apps/mobile/.env.example` nach `apps/mobile/.env` kopieren und den dortigen
Platzhalter durch den von `pnpm supabase:status` ausgegebenen lokalen
`publishable key` beziehungsweise `anon key` ersetzen. Der `service_role key` gehört niemals
in eine `EXPO_PUBLIC_*`-Variable. Lokale `.env`-Dateien sind ignoriert und werden nicht
versioniert.

Für ein physisches Gerät muss statt der Simulator-Adressen die LAN-Adresse des
Entwicklungsrechners verwendet werden. Gerät und Rechner müssen sich dafür im selben
vertrauenswürdigen Netz befinden.

### Mobile App

```bash
pnpm dev:ios
pnpm dev:android
```

Der Foundation-Screen zeigt den Zustand der lokalen REST-Verbindung. Die App verwendet Expo Go;
native `ios/`- und `android/`-Projekte werden in MVP01 nicht erzeugt oder eingecheckt.

Der lokale E-Mail-OTP wird von Supabase an Mailpit zugestellt. Mailpit ist unter
`http://127.0.0.1:54324` erreichbar; es werden ausschließlich synthetische Adressen verwendet.
Der lokale Code ist sechs Stellen lang, zehn Minuten gültig und kann frühestens nach 60
Sekunden erneut angefordert werden. Eigener SMTP und Bot-Schutz sind Voraussetzungen für die
spätere Produktionsumgebung und nicht Teil von MVP03.

Migration, RLS-Tests und der lokale OTP-Vertrag lassen sich reproduzierbar prüfen:

```bash
pnpm supabase:reset
pnpm supabase:test
pnpm supabase:types
pnpm test:auth-integration
```

### MVP04-Datenmodell und API

MVP04 ergänzt die versionierte Datenbankmigration für Einträge, tägliche Zielversionen,
Gruppen, Mitgliedschaftsperioden sowie private Einladungshashes. Fachliche Mutationen und
Gruppenaggregate sind ausschließlich über die schlanken, authentifizierten RPCs erreichbar:
`get_home_summary`, `list_entries`, `create_entry`, `update_entry`, `delete_entry`,
`set_daily_goal`, `list_my_groups`, `create_group`, `update_group_name` und
`get_group_leaderboard`.

RLS ist auf allen neuen `public`-Tabellen aktiviert und erzwungen. Direkte Schreibzugriffe
sind entzogen; private Einladungsdaten sind nicht Teil des Data-API-Schemas. Die MVP04-RPCs
setzen ein aktives MVP03-Profil und die `core_processing`-Einwilligung voraus.

Die TypeScript-Datenbanktypen werden ausschließlich aus dem lokalen migrierten Schema nach
`packages/shared-types/src/database.types.ts` generiert. Nach einer Schemaänderung ausführen:

```bash
pnpm supabase:reset
pnpm supabase:test
pnpm supabase:types
pnpm typecheck
```

Einladungsannahme, Offline-Queue, Tracking-UI, Gruppenverwaltung und produktive
Einladungs-Edge-Functions gehören ausdrücklich nicht zu MVP04.

### MVP05 – Einträge, Heute-Ansicht und Verlauf

Die Heute-Ansicht speichert eigene Salawat-Einträge über die authentifizierten
MVP04-RPCs optimistisch im Speicher. Sie zeigt die heutige Summe sowie Gesamt-
und Wochenwert, lädt den Verlauf cursorbasiert nach und erlaubt das Bearbeiten
und bestätigte Löschen eigener Einträge. Beträge werden zwischen 1 und
10.000.000 validiert; Summen werden als Dezimalstrings mit `BigInt` verarbeitet.
Die für neue Einträge maßgebliche Zeitzone wird aus den eigenen Einstellungen
gelesen und fällt nur bei fehlendem lokalem Zugriff auf die Gerätezeitzone zurück.

Der lokale End-to-End-Vertrag lässt sich zusätzlich ausführen:

```bash
pnpm test:entries-integration
```

Die persistente, verschlüsselte Offline-Queue folgt erst mit MVP07. Tagesziel
und Zielerfolg bleiben Teil von MVP06.

### Qualitätsprüfung

```bash
pnpm verify
```

Der Befehl führt die Workspace-Smoke-Tests, Unit- und Komponententests, ESLint und den
TypeScript-Typecheck aus.

### Backend beenden

```bash
pnpm supabase:stop
```
