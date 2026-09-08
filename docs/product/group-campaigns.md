# Gruppenkampagnen und Inhaberschaft

Die ausdrücklich beauftragte Erweiterung der Gruppenansicht ersetzt für das ausgewählte Monatsziel die bisher ausschließlich gregorianische Monatsperiode. Eine Gruppe hat genau eine ausgewählte, feste Kampagne; sie wird nicht automatisch verlängert oder wiederholt. Bestehende Gruppen ohne Kampagne behalten die bisherige gregorianische Monatsansicht, bis ihr Inhaber ein Monatsziel speichert.

## Kalender und Zeitraum

- **Gregorianischer Monat:** Das ausgewählte Datum bestimmt den vollständigen Kalendermonat, vom Ersten bis zum Letzten.
- **Islamischer Monat (berechnet):** Das ausgewählte Datum bestimmt den vollständigen Monat des tabellarischen islamischen Zivilkalenders. Epoche: 19. Juli 622 im gregorianischen Kalender, 30-jähriger Schaltzyklus. Das ist eine berechnete Datierung; lokale Mondsichtung kann abweichen. Beispielsweise reicht Ramadan 1445 hier vom 11. März bis 9. April 2024.
- **30 Tage ab Start:** Der ausgewählte Tag ist der erste der exakt 30 eingeschlossenen Kalendertage. Der letzte Tag liegt 29 Tage später.

Die Datumsauswahl verwendet native Kalendersteuerungen. Das Backend normalisiert die Monatsgrenzen und liefert sie an die Ansicht zurück. Die feste Gruppenzeitzone bestimmt den heutigen Tag. Gespeicherte Eintragsdaten bleiben Kalendertage; bei ihrer Übermittlung findet keine Umwandlung in einen UTC-Zeitpunkt statt. Für neue Kampagnen sind ausgewählte Daten von 1900 bis 2200 erlaubt.

Monatsrangliste und Monatsstatistik zählen ausschließlich Einträge innerhalb der eingeschlossenen Kampagnengrenzen und bis heute. Die aktiven Mitgliedschaften und die unveränderbare lokale Erfassungszeit begrenzen Beiträge weiterhin; ein Beitritt gibt keine älteren Beiträge frei. Abgelaufene Kampagnen zeigen keinen erfundenen täglichen Restbedarf. Zukünftige Kampagnen haben noch keine Beiträge; für ihren täglichen Restbedarf zählt die vollständige Kampagnendauer.

## Wochenziel

Ohne expliziten eigenen Wochenbetrag wird das Monatsziel anteilig verteilt:

`aufgerundet(Monatsziel × überlappende Kalendertage / Kampagnentage)`

Die Woche beginnt am Montag. Bei 3.000 Salawat über 30 Tage und fünf überlappenden Tagen beträgt das Wochenziel 500. Bei einem abgeleiteten Wochenziel verwenden Wochenstatistik und Wochenrangliste nur diese Überlappung; Einträge vor Kampagnenstart zählen nicht zum neuen Ziel. Außerhalb der Kampagne existiert kein abgeleitetes Ziel. Ein explizites Wochenziel hat Vorrang und verwendet die ganze Kalenderwoche. Das Entfernen dieses eigenen Wochenziels stellt die anteilige Ableitung wieder her. Die Oberfläche bietet deshalb bei einem bereits abgeleiteten Ziel keine irreführende Deaktivierung an.

Änderungen aktualisieren Gruppenrevisionen, Monatsstatistik, abgeleitete Wochenstatistik und Monatsrangliste. Die Berechnung in der ausdrücklich aktivierten lokalen Demo dient nur der Vorschau; im regulären Betrieb ist PostgreSQL die Quelle der Wahrheit.

## Inhaberschaft und Austritt

Die aktuelle Inhaberrolle ist mit Text und Kronensymbol auf einer goldenen Fläche sichtbar. Nach einer Übertragung aktualisiert der Client eigene Rolle und Mitgliedsrollen aus der Serverantwort; beim erneuten Öffnen werden Rechte und Mitglieder erneut geladen.

Ein Inhaber mit weiteren nicht ausgetretenen Mitgliedern muss die Inhaberschaft übertragen oder die anderen Mitglieder entfernen. Auch ein vorübergehend gesperrtes Konto zählt bei dieser Schutzprüfung als Mitglied. Ist der Inhaber das letzte Mitglied, kann er austreten; die Gruppe und ihre abhängigen Gruppendaten werden in derselben Transaktion gelöscht. Persönliche Einträge bleiben erhalten. Die RPC sperrt zuerst die Gruppe und verhindert damit einen konkurrierenden Beitritt während der Entscheidung.

Neue Kampagnendaten besitzen erzwungene RLS und keinerlei direkte Clientrechte. Lesen erfolgt nur über aggregierende Mitglieder-RPCs; Schreiben nur durch den aktiven Inhaber mit passender Revision. Negative Tests decken gewöhnliche und ehemalige Mitglieder, anonymen Zugriff und direkte Tabellenänderungen ab.
