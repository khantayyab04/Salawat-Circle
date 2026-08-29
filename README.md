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

Der aktuelle Stand ist das initiale Repository-Gerüst. Toolchain, Abhängigkeiten und ausführbare Anwendungen werden im Work Package **WP01** reproduzierbar eingerichtet.
