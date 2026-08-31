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

## Offline-Datenfluss (MVP07)

`EntriesStore` bleibt der UI-Vertrag. Für ein angemeldetes Konto besitzt er einen
`OfflineController`, der einen verschlüsselten `OfflineAccountState` verwaltet.
Die fachliche Reihenfolge ist:

1. Eingabe validieren.
2. Optimistische Projektion und Mutation-Queue gemeinsam lokal speichern.
3. UI mit `pending_*` aktualisieren.
4. Queue bei Verbindung, App-Foreground oder fälligem Retry abarbeiten.
5. Serverantwort und kanonische Summary lokal persistieren.

Der SQLite-Adapter speichert pro Konto genau einen AES-256-GCM-Envelope. Dadurch
ist die komplette fachliche Transaktion einschließlich Queue atomar und weder
Einzelwerte noch Summen oder Payloads liegen im Klartext. Der 256-Bit-Schlüssel
liegt kontogebunden in SecureStore. `EncryptedAccountStorage`,
`mutation-queue`, `retry-policy` und `SyncEngine` sind unabhängig vom
Expo-Adapter testbar.

Create verwendet die vorab erzeugte UUID. Update und Delete senden die zuletzt
bestätigte Serverrevision. `get_entry` liefert bei einem Konflikt ausschließlich
den eigenen aktuellen Serverstand. Unbestätigte Änderungen derselben Entity
werden zusammengeführt; Create gefolgt von Delete erzeugt keinen Serveraufruf.

PostgreSQL bleibt die kanonische Quelle. Lokale Daten autorisieren keine
Operation und werden nie für fremde Einträge, Gruppenmitgliedschaft oder
Ranglisten verwendet.

## Gruppen, Einladungen und Ranglisten (MVP08)

### RPC-Only Architektur- und Sicherheitsgrenze

Sämtliche Gruppen- und Einladungsfunktionen sind strikt über geschützte Supabase
RPCs gekapselt (`list_my_groups`, `create_group`, `get_group_leaderboard`,
`public.set_group_leaderboard_anonymity`, `create_group_invite`, `list_group_invites`,
`revoke_group_invite`, `preview_group_invite`, `public.accept_group_invite`). Direkte
Lesezugriffe auf Gruppentabellen (`groups`, `group_memberships`) sind per RLS auf eigene
aktive Mitgliedschaften beschränkt. Sämtliche Schreibzugriffe sind entzogen; Mutationen
sowie Zugriffe auf private Einladungstabellen (`private.group_invites`) sind ausschließlich
serverseitig per RPC möglich.

### Einladungs-Hashspeicherung

Roh-Einladungstokens (10-stellige alphanumerische Codes) und Einladungscodes werden serverseitig
ausschließlich als SHA-256-Hashes (`token_hash` / `code_hash`) in `private.group_invites`
gespeichert (`sha256(token)` / `sha256(code)`). Das Klartext-Token wird dem Ersteller bei der Erzeugung genau
einmal zurückgegeben und im Backend weder in Tabellen noch in Serverlogs abgelegt.

### Mitgliedschafts-Zeitstempel (`joined_at`) und keine rückwirkenden Summen

Jede Gruppenmitgliedschaft speichert den exakten Beitrittszeitstempel `joined_at`.
Die Berechnung der Gruppenrangliste (`get_group_leaderboard`) aggregiert persönliche
Salawat-Einträge eines Mitglieds ausschließlich ab dessen individuellem `joined_at`.
Salawat, die vor dem Beitritt zur Gruppe erfasst wurden, fließen **nicht** rückwirkend
in die Gruppenrangliste ein.

### Online-Only Gruppen-Zustandsverwaltung

`GroupsStore` und `GroupsProvider` agieren als reiner Online-Zustandsverwalter.
Gruppenfunktionen (Erstellen, Rangliste abrufen, Einladungen verwalten, Beitritt
und Anonymitätswechsel) werden direkt gegen die Supabase-RPCs ausgeführt und nicht
in der lokalen SQLite-Datenbank oder Mutation-Queue zwischengespeichert. Bei fehlender
Netzwerkverbindung zeigt die UI den entsprechenden Offline-Status.

### Lebenszyklus ausstehender Einladungstokens (Pending Invite Tokens)

Wird ein Einladungslink geöffnet, während die App unangemeldet ist oder das Profil/die
Einwilligung noch fehlt, wird das Token temporär in SecureStore unter dem Schlüssel
`salawat-circle.pending-invite` hinterlegt. Nach Abschluss der Registrierung und Profilerstellung
wird das ausstehende Token gelesen, die Beitrittsvorschau automatisch geöffnet und der
Schlüssel nach Verwendung oder Abbruch umgehend aus SecureStore gelöscht.

### Anonymitätsmodell (`alias_epoch` / `alias_key`)

Der Gruppeninhaber kann die Anonymisierung der Rangliste aktivieren. Wenn aktiv,
berechnet das Backend stabile servergenerierte Gruppenaliase aus Adjektiv und Nomen
(z. B. `Ruhiger Garten`, optional mit numerischem Suffix wie `Ruhiger Garten 2` bei Kollisionen,
aktuell sprachunabhängig vom Server vorgegeben) unter Verwendung von `alias_key` und `alias_epoch`.
Ein Mitglied sieht stets seinen eigenen echten Anzeigenamen, während andere Mitglieder nur den Alias sehen.
Anonymisierung wirkt **nicht rückwirkend**: Mitglieder, die die Rangliste zuvor mit
echten Anzeigenamen eingesehen haben, können historische Zuordnungen nicht rückwirkend
"vergessen".

### Keyset-Pagination (`sort_name` / `row_id`)

Die Gruppenrangliste nutzt Keyset-Pagination zur effizienten und stabilen Anzeige
großer Ranglisten. Der composite Cursor baut auf `(rank, sort_name, row_id)` auf, um
bei identischen Summenwerten eine absolut deterministische Sortierung ohne doppelte
oder übersprungene Einträge über Seitengrenzen hinweg zu garantieren.

### Strukturiertes Rate-Limiting

Aktionen wie Einladungserstellung, Beitrittsvorschau, Beitritt und Gruppenerstellung
werden serverseitig über die Hilfsfunktion `private.enforce_rate_limit` und die Tabelle
`private.rate_limit_buckets` geschützt. Bei Überschreiten der Limits liefert die RPC einen
strukturierten Fehlercode (`RATE_LIMITED` / HTTP 429), der vom Gateway sauber gefangen
und in eine benutzerfreundliche Warten-Statusansicht übersetzt wird.

### Verbleibende Production-Arbeit (Architecture Follow-ups)

- **Universal Links & App Links Setup:** Öffentliche Web-Domain-Konfiguration
  (Apple App Site Association `apple-app-site-association` und Android `assetlinks.json`
  auf der Rechts-/Join-Webseite `apps/legal-site`) zur nahtlosen Betriebssystem-Integration
  von `https://salawat.app/join/<token>`.
- **Scheduled Cleanup Task:** Automatisierte PG-Cron- / Scheduled Function-Einrichtung zur
  regelmäßigen Löschung abgelaufener Einträge in `rate_limit_buckets`.
- **Erweiterte Moderation & Abuse Detection:** Automatisierte Inhaltsprüfung für Gruppen-
  und Profilnamen sowie administrative Moderations-Workflows (Admin-App).
- **Automatisierte Geräte- und Accessibility-Tests:** Systematische E2E- und Screenreader-
  Testmatrix auf physischen iOS- und Android-Geräten.

