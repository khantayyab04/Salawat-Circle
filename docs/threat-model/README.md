# Threat Model

## Lokaler Offlinezustand (MVP07)

**Schutzobjekte:** eigene Salawat-Einträge, eigene Zielversion, persönliche
Summary, Mutation-Payloads und Konfliktdetails.

**Kontrollen:**

- Sämtliche fachlichen Nutzdaten werden vor SQLite mit AES-256-GCM
  authentifiziert verschlüsselt. Manipulierter Chiffretext oder ein falscher
  Kontoschlüssel kann nicht entschlüsselt werden.
- Der zufällige 256-Bit-Schlüssel liegt pro Konto und Installation in
  SecureStore/Keychain/Keystore und wird nicht in SQLite oder der Mutation-Queue
  gespeichert.
- Konto-ID ist der einzige nicht verschlüsselte Datenbankschlüssel. E-Mail,
  OTP, JWT, Service-Role-Schlüssel und angenommene Einladungstoken werden nicht
  in der Offline-Datenbank gespeichert.
- Beim Logout werden alle lokalen Offlinezeilen, der aktive Kontoschlüssel und
  der Active-Account-Marker gelöscht. Ein Kontowechsel entfernt den Zustand des
  zuvor aktiven Kontos vor dem Öffnen des neuen Zustands.
- Der Server autorisiert weiterhin jede Mutation. Lokale UUID, Revision oder
  Queue-Status gewähren keine Berechtigung.
- Revisionskonflikte führen nicht zu Last-Write-Wins. Der aktuelle eigene
  Serverstand wird über ein authentifiziertes, fremdzugriffsgeschütztes RPC
  geladen und muss explizit bestätigt oder überschrieben werden.
- Persistierte Fehler enthalten nur stabile Fehlercodes, keine sensiblen
  Rohmeldungen.

**Verbleibende Production-Härtung:** SQLCipher als zusätzliche
Dateisystemverschlüsselung, expliziter Ausschluss der Datenbank aus
Gerätebackups, instrumentierte Sync-SLOs und eine erweiterte
Multi-Device-/Chaos-Testmatrix.

## Private Gruppen, Einladungen und Ranglisten (MVP08)

**Schutzobjekte:** Gruppenexistenz, Einladungstokens, Mitgliederlisten,
Anzeigenamen, persönliche Beitrittszeitpunkte und aggregierte Salawat-Ranglisten.

**Bedrohungen & Sicherheitskontrollen:**

- **Einladungstoken-Geheimhaltung:** 10-stellige Einladungscodes werden serverseitig
  ausschließlich als SHA-256-Hashes (`token_hash` / `code_hash`) in `private.group_invites`
  gespeichert. Roh-Tokens existieren flüchtig auf dem Client des Erstellers oder des Beitretenden und werden
  weder im Backend-Speicher noch in System- oder App-Logs protokolliert.
- **Brute-Force- & Enumerationsschutz:** Das Erstellen, Vorschauen und Einlösen von
  Einladungscodes sowie die Gruppenerstellung sind über `private.enforce_rate_limit` in
  Postgres abgeflacht. Zu viele Fehlversuche führen zu sauberen `RATE_LIMITED`-Antworten,
  wodurch automatisiertes Erraten von 10-stelligen Codes unterbunden wird.
- **Neutrale Fehlermeldungen (Oracle-Vermeidung):** Ungültige, abgelaufene, verbrauchte
  oder widerrufene Einladungstokens liefern einheitliche, neutrale Fehlerzustände
  (`INVITE_INVALID` / `joinInvalidInviteMessage`). Ein Angreifer kann nicht differenzieren,
  ob ein Token existierte, abgelaufen war oder erschöpft ist.
- **Transaktions-Sperren & Kapazitätsschutz:** Die Einlösungs-RPC (`public.accept_group_invite`)
  nutzt explizite Zeilensperren (`FOR UPDATE`) in einer PostgreSQL-Transaktion. Dadurch
  werden Race-Conditions beim Erreichen der maximalen Nutzungsanzahl (`max_uses`) oder
  Mitgliederlimits sicher ausgeschlossen.
- **RLS & Nicht-Mitglieder-Zugriffsschutz:** Direkte Schreibzugriffe auf Gruppentabellen
  sind entzogen, während Lesezugriffe per RLS auf eigene aktive Mitgliedschaften beschränkt sind.
  Nicht-Mitglieder besitzen keinerlei Lese- oder Schreibrechte auf Gruppen,
  Mitgliedschaften oder Ranglisten. Gruppenvorschau und Beitritt sind ausschließlich
  über authentifizierte SECURITY DEFINER RPCs möglich.
- **Kein Logging sensibler Daten:** Einladungstokens, E-Mail-Adressen, Anzeigenamen und
  Salawat-Einzelwerte sind strikt aus Client- und Server-Logausgaben ausgeschlossen.
- **Kontoisolierung:** Nutzerdaten sind durch Supabase Auth UIDs isoliert. Der lokale
  Gruppenzustand wird nicht unverschlüsselt persistiert und ist an die jeweilige
  Sitzung gebunden.

**Anonymitätsgrenzen & Restrisiken:**

- **Nicht-rückwirkende Anonymisierung:** Die Gruppenanonymisierung (servergenerierte
  Adjektiv+Nomen-Pseudonyme wie `Ruhiger Garten`, optional mit numerischem Suffix)
  schützt Anzeigenamen ab dem Zeitpunkt der Aktivierung durch den Gruppeninhaber. Wenn
  Mitglieder die Rangliste zuvor mit Klarnamen/Anzeigenamen gesehen haben, lässt sich
  diese historische Information nicht rückwirkend aus dem Wissen der Mitglieder entfernen.
- **Korrelationsrisiko durch Aggregatwerte:** Auch bei aktiver Anonymisierung können
  Mitglieder Rückschlüsse ziehen, wenn ein bestimmtes Mitglied zu einem bekannten
  Zeitpunkt einen Salawat-Betrag erfasst und sich die Gesamtsumme eines Anonymus in
  der Rangliste um exakt diesen Betrag erhöht.
- **Zufällige Epochen & Opaque Zeilen-IDs:** Alias-Schlüssel (`alias_key`, `alias_epoch`)
  und Zeilen-IDs sind nicht-sequentiell und opaque, um das Erraten von Mitgliedszahlen
  oder Beitrittsreihenfolgen zu verhindern.
- **Zwischenablage & Teilen (Nutzerverantwortung):** Das Teilen von Einladungslinks
  oder Codes über das Betriebssystem-Share-Sheet oder die Zwischenablage (über das aktiv genutzte
  Paket `expo-clipboard`) überträgt die Geheimhaltung des Tokens in die Verantwortung der Nutzer. Einladungen
  sollten ausschließlich über vertrauenswürdige, private Kanäle weitergegeben werden.

**Verbleibende Production-Härtung (Threat Model Follow-ups):**

- **Universal Links Domain Verification:** Einrichtung von Universal Links / App Links mit
  AASA-Datei und `assetlinks.json` auf der Produktionsdomain zur Verhinderung von Deep-Link-Hijacking.
- **Automatisierte Bucket-Retention:** Regelmäßige automatisierte Löschung veralteter Eintragszeilen
  in `rate_limit_buckets` per Scheduled Job.
- **Erweiterter Missbrauchs- & Content-Schutz:** Serverseitige automatische Filterung von Gruppen-
  und Anzeigenamen sowie Admin-Moderationswerkzeuge.
- **Manuelle Accessibility- & Plattform-Audits:** Umfassende Audits von Screenreadern (VoiceOver,
  TalkBack) und Plattform-Sicherheitsfeatures auf physischen iOS- und Android-Geräten.

