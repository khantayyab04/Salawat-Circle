# Architektur

Architekturentscheidungen und technische Verantwortungsgrenzen werden hier versioniert dokumentiert.

## Mobile App-Hülle (MVP02)

### Provider-Reihenfolge

Die Root-Navigation ist in folgender Reihenfolge eingebettet:

1. `I18nProvider` löst `system | de | en` auf und stellt Übersetzungen sowie
   lokalisierte Formatierung bereit.
2. `AppThemeProvider` verbindet das Systemfarbschema mit den App- und
   React-Navigation-Tokens.
3. Der Root-Stack rendert Auth-/Onboarding-Shells, Tabs, dynamische Routen und die
   lokalisierte Not-found-Seite.
4. `StatusBar` folgt dem aktiven Farbschema.

Diese Reihenfolge sorgt dafür, dass Tabtitel, Header, Screens und
Accessibility-Texte bei einem Sprachwechsel im selben Renderzyklus aktualisiert
werden und Navigation beim Themewechsel nicht weiß beziehungsweise schwarz
aufblitzt.

### Routenstruktur

`src/app` ist der Navigationsvertrag und enthält keine Screen-UI. `(tabs)` stellt
statische Native Tabs bereit; `today`, `groups` und `settings` besitzen jeweils
einen eigenen Stack. Authentifizierung, Onboarding, Eintragsbearbeitung und
Einladungsprüfung liegen außerhalb der Tabs. Dynamische Gruppen-IDs und
Einladungstokens dienen nur der Navigation und werden nicht sichtbar ausgegeben.

### Sprachmodell

`AppLocale`, `LanguagePreference`, `TranslationKey`, `useTranslation()` und die
`Intl`-Formatierungsfunktionen bilden die öffentliche Sprachschnittstelle.
Deutsch ist der Fallback. `LanguagePreferenceStore` validiert und beobachtet die
geräteweite, nicht sensible Präferenz in `expo-sqlite/localStorage` unter dem
versionierten Schlüssel `preferences.language.v1`. Ungültige Werte werden auf
`system` repariert. Die Präferenz ist weder kontoabhängig noch Teil der
Supabase-Synchronisation.

### Theme und Zustände

`AppTheme`, `ColorTokens`, `TextVariant` und `useAppTheme()` sind die öffentliche
Theme-Schnittstelle. Screens verwenden die gemeinsamen Primitives und kein
paralleles Styling-System.

`ViewState` ist der verbindliche Vertrag für datenabhängige Screens. Die Zustände
`offlineWithData`, `pending` und `partialError` ergänzen vorhandene Inhalte um ein
Banner. `loading`, `empty`, `offlineEmpty`, `error`, `forbidden`,
`sessionExpired`, `maintenance` und `upgradeRequired` ersetzen Inhalte durch eine
vollständige Statusansicht. `content` zeigt Inhalte ohne Status-Chrome.

### MVP02-Grenzen

MVP02 verändert keine Supabase-Schemas, RLS-Regeln, RPCs, Authentifizierung,
Offline-Queues oder fachliche Persistenz. Eingaben dürfen lokal im React-State
existieren; fachliche Aktionen bleiben deaktiviert und als solche für
Assistenztechnologien gekennzeichnet. Persönliche Daten werden nicht in der
unverschlüsselten Präferenzablage gespeichert.
