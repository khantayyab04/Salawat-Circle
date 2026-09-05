# Salawat Circle: Informationsarchitektur und Interaktionsmodell

## Produktjobs

1. **Erfassen:** Salawat schnell, ruhig und einhändig als einzelnen Eintrag
   festhalten.
2. **Fortschritt verstehen:** Tages-, Wochen- und Zielverlauf ohne
   Kennzahlenüberladung nachvollziehen.
3. **Gemeinsam:** Private Gruppen und die eigene Position darin verstehen und
   verwalten.

Konto, Erinnerungen, Datenschutz und Hilfe sind Konfiguration. Sie sind über
das Konto erreichbar, aber nicht Teil der primären Tab-Navigation.

## Navigation

Die drei Tabs sind **Heute**, **Fortschritt** und **Gruppen**. Der
Konto-Einstieg sitzt als beschriftete Avatar-Schaltfläche im Header. Die
Tab-Reihenfolge ist stabil und jedes Ziel bewahrt seinen Zustand.

| Ziel | Route | Aufgabe |
| --- | --- | --- |
| Heute | `/(tabs)/today` | Erfassung in Sekunden |
| Fortschritt | `/(tabs)/progress` | Tagesrhythmus, Ziele und Verlauf |
| Gruppen | `/(tabs)/groups` | private Gruppen und Ranglisten |
| Konto | `/account` | seltene Einstellungen |

Einladungstiefenlinks bleiben unter `/join/*` bestehen. Interne
Bearbeitungsaktionen erscheinen als fokussierte Sheets statt zusätzlicher
Navigationstiefe.

## Erfassungsmodell

Der Heute-Screen enthält keine dauerhaft sichtbare Form und kein Dashboard.
Ein Zielring zeigt die heutige Summe und gegebenenfalls die Zielerreichung.
Wertchips bauen einen noch nicht gespeicherten Betrag auf. Die einzelne
Primäraktion sagt exakt, was gespeichert wird, beispielsweise
„300 eintragen“. Ein eigener Betrag ist über ein Sheet mit Zahlenfeld
zugänglich.

Das Staging ist ausschließlich UI-Zustand. Beim Commit ruft die Oberfläche
die bestehende `EntriesStore.create(amount)`-Schnittstelle genau einmal auf.
Der Store behält damit UUID-Erzeugung, Optimismus, Offline-Warteschlange,
Synchronisation und Idempotenz. Ein Fehler verwirft den gestagten Betrag
nicht.

## Fortschrittsmodell

Der Fortschritt-Tab ersetzt vier konkurrierende KPI-Karten und den
Einzeleintrags-Feed auf der Startseite. Er besteht aus:

- sieben Tagesbalken mit einer Zielmarke und zugänglicher Textzusammenfassung,
- einer ruhigen Zielzeile,
- einer Wochen-/Gesamt-Summenzeile und
- einer virtualisierten Tagesliste.

Ein Tag öffnet ein Sheet mit seinen Einzeleinträgen. Löschen bietet einen
sichtbaren Undo-Pfad. Zielbearbeitung ist ebenfalls ein Sheet.

## Gruppenmodell

Die Gruppenliste beantwortet schon in der Zeile die wichtigste Frage:
Gruppenname, eigene Position und Mitgliederzahl. Das Detail konzentriert sich
auf die Rangliste; die eigene Position bleibt sichtbar. Mitglieder,
Einladungen und Gruppenverwaltung werden in einer Verwaltungsansicht mit
semantischen Sektionen zusammengeführt.

## Gestaltungsgrenzen

- Medina-Grün trägt die Primärinteraktion.
- Gold kennzeichnet nur Auszeichnung oder erreichte Ziele, immer zusätzlich
  mit Text und Symbol.
- Systemschrift und tabellarische Ziffern sind Standard.
- Systemmaterial darf nur Navigation, Header und Sheets tragen; Content
  bleibt opak und lesbar.
- Jede Aktion hat sichtbares Feedback. Gesten beschleunigen, ersetzen aber
  nie sichtbare Bedienwege.
