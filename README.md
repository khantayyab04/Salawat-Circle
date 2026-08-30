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
