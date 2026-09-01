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
