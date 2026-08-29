# Salawat Tracker

## Vollständige Produkt-, UX-, Backend-, Sicherheits- und Release-Spezifikation

**Dokumentstatus:** Umsetzungsreife Spezifikation, Version 1.0  
**Stand:** 29. August 2026  
**Arbeitsname:** Salawat Tracker  
**Zielplattformen:** iOS und Android  
**Primärmarkt:** Deutschland und Europäische Union

## 1. Zweck und Verbindlichkeit

Dieses Dokument ist der verbindliche Bau-, Prüf- und Abnahmevertrag für eine bewusst kleine Salawat App. Es beschreibt nicht nur sichtbare Funktionen, sondern auch Datenmodell, Backendverhalten, Berechtigungen, Offlinebetrieb, Sicherheit, Datenschutz, Moderation, Betrieb, Deployment, Tests und Store Veröffentlichung.

Kein Anforderungsdokument kann garantieren, dass Software vollkommen fehlerfrei ist. Ein Produkt gilt hier deshalb erst dann als produktionsreif, wenn alle Anforderungen mit Priorität P0 umgesetzt sind, sämtliche definierten Release Gates bestanden wurden, keine offenen kritischen oder hohen Sicherheitslücken bestehen und die End to End Tests auf echten Geräten erfolgreich waren.

Die Begriffe **MUSS**, **DARF NICHT**, **SOLL** und **KANN** sind normativ:

* **MUSS** und **DARF NICHT** sind zwingende Abnahmekriterien.
* **SOLL** darf nur mit dokumentierter Begründung abweichen.
* **KANN** ist optional und gehört nicht zur ersten Produktionsfreigabe.

## 2. Produktvision

Die App soll genau eine Gewohnheit unterstützen: Salawat erfassen, persönlich verfolgen und auf Wunsch in privaten Gruppen gemeinsam sichtbar machen.

Die App soll sich in wenigen Sekunden verstehen lassen. Auf der Startseite steht oberhalb des ersten Scrollbereichs ausschließlich die heutige Eingabe im Mittelpunkt. Erst beim Scrollen folgen Kennzahlen, Ziel und Historie. Gruppen sind privat und einladungsbasiert. Erinnerungen werden ausschließlich zu einer selbst festgelegten Uhrzeit versendet.

### 2.1 Produktprinzipien

1. **Eine Hauptaktion:** Eine Zahl eingeben und mit einem klaren Button speichern.
2. **Private Voreinstellung:** Keine öffentlichen Profile, keine öffentliche Gruppensuche und keine öffentliche Rangliste.
3. **Ruhiges Design:** Keine Werbung, kein Feed, keine Chats, keine Likes, keine Konfetti Animationen und kein künstlicher Zeitdruck.
4. **Ehrliche Daten:** Jede sichtbare Summe wird aus denselben kanonischen Einträgen berechnet.
5. **Vertrauen statt Scheingenauigkeit:** Werte sind selbst angegeben. Die App behauptet nicht, sie verifizieren zu können.
6. **Datensparsamkeit:** Keine Kontakte, kein Standort, keine Kamera, kein Mikrofon und keine Werbe ID.
7. **Alltagstauglichkeit:** Einträge funktionieren auch ohne Netz und werden später idempotent synchronisiert.
8. **Würdevolle Sprache:** Die App macht keine theologischen Aussagen über Belohnung, Annahme oder spirituellen Rang.

## 3. Fester Produktscope

### 3.1 Funktionen der ersten Produktionsversion

| ID | Funktion | Priorität |
|---|---|---:|
| AUTH | Anmeldung mit verifiziertem E Mail Einmalcode | P0 |
| CONSENT | Explizite Einwilligung in die Verarbeitung und Gruppenteilung | P0 |
| HOME | Heutige Salawat Anzahl eingeben und absenden | P0 |
| ENTRY | Eigene Einträge erstellen, bearbeiten und löschen | P0 |
| DASH | Gesamtwert, Wochenwert, Tagesziel und erreichte Zieltage | P0 |
| GOAL | Tagesziel mit Regler und exakter Zahl setzen oder deaktivieren | P0 |
| HISTORY | Chronologische, paginierte Liste aller eigenen Einträge | P0 |
| GROUP | Private Gruppen erstellen, anzeigen, verwalten und verlassen | P0 |
| INVITE | Beitritt über sicheren Link oder manuellen Code | P0 |
| RANK | Private Wochen- und Gesamtrangliste einer Gruppe | P0 |
| REMINDER | Eine lokale tägliche Erinnerung zu frei gewählter Uhrzeit | P0 |
| OFFLINE | Verschlüsselte lokale Daten und robuste Synchronisation | P0 |
| RIGHTS | Export, Einwilligungswiderruf und Kontolöschung | P0 |
| SAFETY | Melden, Blockieren, Namensfilter und Moderationsprozess | P0 |
| OPS | Monitoring, Sicherungen, Wiederherstellung und Rollback | P0 |

### 3.2 Bewusst nicht enthalten

Folgendes gehört nicht zur ersten Version und darf nicht beiläufig eingebaut werden:

* Öffentliche Gruppen oder Gruppensuche
* Chats, Kommentare, Reaktionen, Likes oder Direktnachrichten
* Öffentliche Nutzerprofile oder Suche nach Personen
* Profilbilder, Gruppenbilder, Statusmeldungen oder Biografien
* Kontakte Upload oder Adressbuchzugriff
* Beiträge, Bilder, Videos oder Audio
* Automatische Zählung per Mikrofon, Kamera oder Bewegungssensor
* Werbung, Bezahlabos, In App Käufe oder Spendenabwicklung
* Streaks, Verlustwarnungen, Schuld erzeugende Texte oder manipulative Gamification
* Teilen persönlicher Zahlen in öffentliche soziale Netzwerke
* KI Funktionen, Empfehlungen oder generierte religiöse Inhalte
* Web Dashboard für normale Nutzer
* Mehrere Erinnerungen pro Tag
* Rückwirkender Datenimport aus Tabellen oder anderen Apps

### 3.3 Plattformentscheidung

Die erste Version ist eine native Mobile App für iOS und Android. Eine Browser App ist nicht Teil des Produkts. Es gibt lediglich eine kleine öffentliche Website für Datenschutz, Nutzungsbedingungen, Impressum, Support, Kontolöschung und den Fallback von Einladungslinks.

## 4. Fachliche Definitionen

### 4.1 Eintrag

Jedes Absenden erzeugt einen eigenständigen Salawat Eintrag mit Betrag und Kalendertag. Mehrere Einträge am selben Tag sind erlaubt und werden addiert. Dadurch kann eine Person zum Beispiel morgens 100 und abends 200 erfassen, ohne einen bestehenden Tageswert überschreiben zu müssen.

### 4.2 Persönlicher Tag

Der persönliche Tag wird bei der Eingabe anhand der in der App gespeicherten IANA Zeitzone bestimmt. Historische Einträge behalten ihr gespeichertes Datum, auch wenn die Person später die Zeitzone wechselt.

### 4.3 Woche

Eine Woche beginnt montags und endet sonntags. Die persönliche Wochenansicht verwendet den heutigen Kalendertag der gespeicherten Nutzerzeitzone. Eine Gruppe verwendet den heutigen Kalendertag ihrer bei Erstellung festgelegten Gruppenzeitzone.

### 4.4 Tagesziel

Ein Tagesziel gilt ab seinem Wirksamkeitsdatum. Änderungen überschreiben historische Ziele nicht. Wird ein Ziel im Verlauf eines Tages geändert, gilt der zuletzt an diesem Tag gespeicherte Zielwert für den gesamten Tag.

### 4.5 Aktive Gruppenmitgliedschaft

Eine Mitgliedschaft beginnt mit der bestätigten Annahme einer Einladung. Werte vor diesem Zeitpunkt werden nicht rückwirkend in der Gruppe angezeigt. Für den Kalendertag des Beitritts zählt ein Eintrag nur, wenn seine unveränderbare lokale Erfassungszeit nicht vor joined_at liegt. Verlässt eine Person die Gruppe, verschwindet sie sofort aus der Rangliste. Bei einem späteren Wiedereintritt beginnt eine neue Mitgliedschaft und nur Werte ab diesem Wiedereintritt zählen.

### 4.6 Ranglistenwert

Die Rangliste verwendet die persönlichen Einträge eines Mitglieds, die innerhalb des gewählten Zeitraums und innerhalb der aktuellen Mitgliedschaft liegen. Derselbe persönliche Eintrag kann in mehreren privaten Gruppen zählen. Ein Eintrag wird nicht einer einzelnen Gruppe zugeordnet.

### 4.7 Selbstangabe

Alle Werte sind Selbstangaben. Die Benutzeroberfläche darf dies neutral in der Gruppeninformation erläutern. Es gibt keine Verifikation und keine Aussage darüber, ob ein Wert tatsächlich ausgeführt wurde.

## 5. Nutzerrollen und Berechtigungen

### 5.1 Nicht angemeldete Person

Eine nicht angemeldete Person darf:

* Start-, Anmelde- und rechtliche Seiten sehen
* Einen Einladungslink lokal bis zur Anmeldung zwischenspeichern
* Einen E Mail Einmalcode anfordern

Sie darf keine Profile, Gruppen, Einträge, Ziele oder Ranglisten vom Backend lesen.

### 5.2 Angemeldetes Mitglied

Ein Mitglied darf:

* Ausschließlich eigene Einträge und Ziele vollständig lesen und verändern
* Eigene Gruppenmitgliedschaften sehen
* Die aggregierte Rangliste einer Gruppe sehen, solange es aktives Mitglied ist
* Aktive Gruppenmitglieder mit Anzeigename und aggregiertem Wert sehen
* Eine Gruppe verlassen
* Nutzer melden oder blockieren

Ein Mitglied darf niemals E Mail Adressen, persönliche Eintragshistorien oder Tagesdetails anderer Mitglieder sehen.

### 5.3 Gruppeninhaber

Der Ersteller ist zunächst Gruppeninhaber. Zusätzlich zu normalen Mitgliedsrechten darf er:

* Gruppenname verwalten
* Einladungen erzeugen und widerrufen
* Mitglieder entfernen
* Inhaberschaft übertragen
* Gruppe löschen

Ein Inhaber darf eine Gruppe nur verlassen, nachdem die Inhaberschaft übertragen wurde oder die Gruppe gelöscht wird.

### 5.4 Moderator und Administrator

Moderatoren arbeiten ausschließlich in einer getrennten, stark geschützten Verwaltungsoberfläche. Sie dürfen Meldungen prüfen, Namen sperren, Gruppen deaktivieren und Konten suspendieren. Sie dürfen standardmäßig keine Salawat Einzelwerte einsehen. Ein technisch möglicher Ausnahmezugriff muss als Break Glass Zugriff mit Begründung, Mehrpersonenfreigabe und unveränderbarem Audit Ereignis ausgestaltet sein.

## 6. Informationsarchitektur

### 6.1 Hauptnavigation

Die App hat nach der Anmeldung genau drei Hauptbereiche:

1. **Heute**
2. **Gruppen**
3. **Einstellungen**

Die Navigation verwendet eine native untere Tab Leiste. Die Startansicht nach jedem normalen App Start ist **Heute**. Ein geöffneter Einladungslink führt nach erfolgreicher Anmeldung direkt zur Einladungsbestätigung.

### 6.2 Routeninventar

| Route | Zweck |
|---|---|
| /welcome | Einfache Einführung und Einstieg |
| /auth/email | E Mail Adresse eingeben |
| /auth/code | Einmalcode eingeben |
| /onboarding/profile | Anzeigename und Zeitzone bestätigen |
| /onboarding/consent | Explizite Einwilligung |
| /today | Eingabe, Dashboard und Historie |
| /entry/:id/edit | Eigenen Eintrag bearbeiten |
| /groups | Gruppenliste und Gruppe erstellen |
| /groups/create | Gruppenname bestätigen |
| /groups/:id | Rangliste und Gruppeninformationen |
| /groups/:id/members | Mitgliederverwaltung |
| /groups/:id/invites | Einladungen verwalten |
| /join/:token | Einladung prüfen und bestätigen |
| /settings | Einstellungen |
| /settings/reminder | Tägliche Erinnerung |
| /settings/profile | Anzeigename und Zeitzone |
| /settings/privacy | Export, Einwilligung und Löschung |
| /settings/legal | Datenschutz, Bedingungen und Impressum |
| /settings/support | Hilfe, Melden und Kontakt |

## 7. Kernabläufe und Abnahmekriterien

### 7.1 Registrierung und Anmeldung

#### Ablauf

1. Die Person gibt eine E Mail Adresse ein.
2. Das Backend antwortet unabhängig von der Existenz des Kontos mit derselben neutralen Nachricht.
3. Ein sechsstelliger Einmalcode wird über einen produktiven, eigenen SMTP Dienst versendet.
4. Der Code läuft nach zehn Minuten ab und ist nur einmal nutzbar.
5. Nach erfolgreicher Verifikation werden Anzeigename und automatisch erkannte IANA Zeitzone bestätigt.
6. Die explizite Einwilligung wird getrennt, verständlich und nicht vorausgewählt eingeholt.
7. Erst danach wird die Startansicht geöffnet.

#### Anforderungen

* Es gibt in Version 1 keine Passwörter.
* Ein erneuter Code kann frühestens nach 60 Sekunden angefordert werden.
* Auth Endpunkte sind begrenzt und durch Bot Schutz absicherbar.
* Produktionsmails verwenden eine verifizierte Absenderdomain mit SPF, DKIM und DMARC.
* E Mail Adressen werden niemals anderen Nutzern angezeigt.
* Ein Konto ohne gültige Einwilligung kann keine Salawat Daten anlegen.
* Eine eingeloggte Sitzung wird verschlüsselt im Betriebssystemspeicher gehalten.
* Abmelden löscht Sitzung, entschlüsselten Cache, lokale Datenbankschlüssel und ausstehende Benachrichtigungen dieses Kontos.

#### Akzeptanz

* Gültiger Code meldet an.
* Falscher, abgelaufener oder bereits genutzter Code meldet nicht an.
* Wiederholte Anfragen werden begrenzt.
* Ein Backend Fehler erzeugt keine doppelte Profilanlage.
* Eine Einladung bleibt während Anmeldung erhalten und wird danach erneut geprüft.

### 7.2 Startseite und heutige Eingabe

#### Sichtbarer erster Bereich

Ohne Scrollen sind nur folgende Elemente sichtbar:

1. Kurze Überschrift **Heute**
2. Bereits heute erfasste Gesamtsumme
3. Großes numerisches Eingabefeld mit Beschriftung **Salawat hinzufügen**
4. Primärer Button **Eintragen**
5. Dezenter Offline- oder Synchronisationsstatus, aber nur wenn relevant

Das Eingabefeld öffnet die numerische Tastatur. Tausendertrennzeichen werden bei der Anzeige formatiert, nicht als Bestandteil des kanonischen Wertes gespeichert.

#### Validierung

* Erlaubt sind nur ganze Zahlen von 1 bis 10.000.000 pro Eintrag.
* Dezimalzahlen, negative Werte, Exponentialschreibweise, leerer Inhalt und nur aus Trennzeichen bestehende Eingaben werden abgelehnt.
* Führende Nullen sind erlaubt, werden aber normalisiert.
* Während der Verarbeitung ist der Button gegen unbeabsichtigtes Doppeltippen gesperrt.
* Jeder Client erzeugt vor dem Speichern eine UUID für den Eintrag. Derselbe Versuch kann serverseitig nie zwei Einträge erzeugen.

#### Erfolgsverhalten

* Der neue Eintrag erscheint sofort optimistisch in heutiger Summe, Dashboard und Historie.
* Es gibt ein kurzes, zurückhaltendes haptisches Erfolgsfeedback, sofern Systemhaptik aktiv ist.
* Das Eingabefeld wird geleert.
* Bei einem Serverfehler wird die optimistische Änderung zurückgenommen oder als noch nicht synchronisiert gekennzeichnet.
* Offline wird der Eintrag verschlüsselt gespeichert und deutlich, aber unaufdringlich als ausstehend markiert.

#### Akzeptanz

* Ein Tap erzeugt genau einen Eintrag.
* Zwei bewusst nacheinander abgesendete Werte erzeugen zwei Einträge.
* Ein Timeout mit später Serverantwort erzeugt nach Wiederholung keinen Duplikateintrag.
* Nach Neustart bleibt ein offline erstellter Eintrag erhalten.
* Nach Wiederherstellung der Verbindung wird er genau einmal synchronisiert.

### 7.3 Dashboard unterhalb des ersten Scrollbereichs

Nach dem Eingabebereich folgen vier ruhige Kennzahlen:

| Karte | Beschriftung | Berechnung |
|---|---|---|
| Gesamt | Gesamt | Summe aller eigenen Einträge |
| Woche | Diese Woche | Summe von Montag bis Sonntag der aktuellen persönlichen Woche |
| Ziel | Tagesziel | Für heute wirksamer Zielwert oder Kein Ziel |
| Zielerfolg | Ziel erreicht | Erreichte Zieltage geteilt durch relevante Zieltage dieser Woche |

Alle Summen enthalten lokal ausstehende Einträge optimistisch, solange sie valide sind. Ein dezenter Status erklärt, wenn Werte noch synchronisiert werden.

**Ziel erreicht x/y Tage** bedeutet:

* x ist die Zahl der Kalendertage von Montag bis heute, deren Tageswert mindestens das an diesem Tag wirksame Ziel erreicht.
* y ist die Zahl der Kalendertage von Montag bis heute, für die überhaupt ein Ziel aktiv war.
* Tage vor dem erstmaligen Setzen eines Ziels zählen nicht zum Nenner.
* Ist kein relevanter Tag vorhanden, zeigt die App **Noch kein Zieltag** statt 0/0.

Dashboard, heutige Summe und Historie müssen nach jeder Mutation aus derselben lokalen Datenquelle aktualisiert werden. Nach erfolgreicher Synchronisation wird die serverseitige Zusammenfassung abgeglichen.

### 7.4 Tagesziel

Der Zielbereich enthält:

1. Einen Regler für schnelle Anpassungen
2. Eine sichtbar gekoppelte exakte Zahleneingabe
3. Eine Aktion **Ziel speichern**
4. Eine Aktion **Ziel deaktivieren**

Ein Regler allein ist für große oder ungerade Werte zu ungenau und nicht vollständig barrierefrei. Deshalb ist die exakte Zahleneingabe zwingend.

#### Regeln

* Werte von 1 bis 10.000.000 sind erlaubt.
* Der Regler verwendet sinnvolle Stufen bis 10.000. Größere oder ungerade Werte werden über das Zahlenfeld eingetragen.
* Ein neuer Wert gilt ab heute.
* Mehrere Änderungen am selben Tag aktualisieren die heutige Zielversion.
* Historische Zielstände werden nicht rückwirkend verändert.
* Deaktivieren legt ab heute eine Zielversion ohne Betrag an.
* Der Regler besitzt eine zugängliche Rollen-, Werte- und Aktionsbeschreibung für VoiceOver und TalkBack.

### 7.5 Verlauf

Der Verlauf erscheint unterhalb des Dashboards und Zielbereichs. Die jüngsten Einträge stehen oben.

Jede Zeile zeigt:

* Formatierten Betrag
* Datum
* Bei mehreren Einträgen am selben Tag zusätzlich die Erfassungszeit
* Synchronisationsstatus, nur wenn ausstehend oder fehlerhaft
* Gut erreichbares Aktionsmenü mit **Bearbeiten** und **Löschen**

#### Bearbeiten

* Betrag ist veränderbar.
* Datum kann zwischen 365 Tagen in der Vergangenheit und heute gewählt werden.
* Zukünftige Daten sind verboten.
* Eine Änderung sendet die erwartete Revisionsnummer.
* Wurde derselbe Eintrag auf einem anderen Gerät geändert, überschreibt die App nicht still. Sie lädt den aktuellen Stand und zeigt einen verständlichen Konfliktdialog.
* Eine Änderung kann persönliche und Gruppenranglisten neu berechnen.

#### Löschen

* Löschen wird durch einen klaren Bestätigungsdialog geschützt.
* Nach Bestätigung wird der Eintrag fachlich und physisch aus der aktiven Datenbank gelöscht.
* Wiederholtes Senden derselben Löschoperation ist idempotent.
* Löschung aktualisiert alle Summen und Ranglisten.
* Logs dürfen den gelöschten Betrag nicht enthalten.

#### Pagination

* Initial werden 30 Einträge geladen.
* Weitere Seiten verwenden einen stabilen Cursor aus Datum, Erstellungszeit und ID.
* Offset Pagination ist wegen möglicher paralleler Einträge nicht zulässig.
* Das Ende der Liste wird klar angezeigt.

### 7.6 Gruppenübersicht

Die Gruppenansicht enthält oben eine primäre Aktion **Gruppe erstellen** und darunter ausschließlich Gruppen, in denen die Person aktuell Mitglied ist. Es gibt keine öffentliche Entdecken Ansicht.

Jede Gruppenzeile zeigt:

* Gruppenname
* Eigene aktuelle Wochenplatzierung
* Eigener Wochenwert
* Anzahl aktiver Mitglieder
* Zeitpunkt der letzten serverseitigen Aktualisierung

Leere Ansicht:

> Du bist noch in keiner Gruppe. Erstelle eine private Gruppe oder tritt über einen Einladungslink bei.

### 7.7 Gruppe erstellen

#### Felder

* Gruppenname, 2 bis 50 sichtbare Zeichen
* Gruppenzeitzone, aus der persönlichen Zeitzone vorausgefüllt und vor Erstellung änderbar

Es gibt keine Beschreibung, kein Bild und keine öffentliche Kennung.

#### Regeln

* Unicode wird kanonisch normalisiert.
* Steuerzeichen, unsichtbare Täuschungszeichen, reine Emojifolgen, URLs und verbotene Begriffe werden abgelehnt.
* Vor dem Erstellen müssen Nutzungsbedingungen und Gruppenregeln akzeptiert sein.
* Der Ersteller wird atomar Eigentümer und aktives Mitglied.
* Gruppenzeitzone und Wochenbeginn werden nach Erstellung in Version 1 nicht mehr durch Nutzer geändert.
* Pro Konto sind höchstens 50 aktive Gruppen erlaubt.
* Pro Gruppe sind höchstens 500 aktive Mitglieder erlaubt.

Nach Erstellung öffnet sich die Gruppendetailansicht mit einer klaren Aktion **Mitglieder einladen**.

### 7.8 Einladung und Beitritt

Die primäre Einladung erfolgt über den nativen Teilen Dialog des Geräts. Dadurch ist kein Kontaktezugriff und keine Speicherung fremder E Mail Adressen nötig.

Eine Einladung besteht aus:

* HTTPS Universal Link beziehungsweise Android App Link
* Kryptografisch zufälligem Linktoken mit mindestens 256 Bit Entropie
* Zehnstelligem, nicht leicht verwechselbarem Ersatzcode für manuelle Eingabe
* Ablaufzeit, standardmäßig sieben Tage
* Maximal 25 erfolgreichen Verwendungen
* Widerrufsmöglichkeit für den Inhaber

Das Backend speichert nur Hashwerte von Linktoken und Code. Tokens sind geheim, erscheinen nicht in Logs und werden nach Annahme aus lokaler Navigation sowie Zwischenspeicher entfernt.

#### Ablauf bei installiertem Client

1. Link öffnet die App.
2. Nicht angemeldete Personen durchlaufen Anmeldung und Einwilligung.
3. Das Backend prüft Token, Ablauf, Widerruf, Kapazität, Sperren und bestehende Mitgliedschaft.
4. Erst nach Authentifizierung wird der Gruppenname angezeigt.
5. Der Bestätigungsbildschirm erklärt: Anzeigename und aggregierte Salawat Werte werden für aktive Gruppenmitglieder sichtbar.
6. Mit **Gruppe beitreten** wird die Teilung ausdrücklich bestätigt.
7. Annahme, Nutzungszähler und Mitgliedschaft werden in einer Transaktion geschrieben.

#### Fallback ohne installierte App

Die Website zeigt keine Gruppendetails. Sie erklärt nur, dass eine private Einladung vorliegt, bietet Store Links und zeigt den manuellen Ersatzcode. Ein später in der App eingegebener Code wird erneut vollständig serverseitig geprüft.

#### Schutz

* Codeversuche sind pro Konto und Zeitfenster begrenzt.
* Nach 20 Fehlversuchen folgt eine zeitweilige Sperre.
* Antworten verraten nicht, ob eine konkrete Gruppe existiert.
* Tokenprüfung verwendet konstanten Vergleich.
* Gleichzeitige Annahmen sperren den Einladungssatz während der Transaktion, damit Maximalnutzung und Gruppenlimit nicht überschritten werden.
* Dieselbe Person verbraucht bei Wiederholung nicht mehrfach eine Verwendung.

### 7.9 Gruppendetail und Rangliste

Die Detailansicht zeigt:

1. Gruppenname und Mitgliederzahl
2. Segmentauswahl **Diese Woche** und **Gesamt**
3. Eigene hervorgehobene Position
4. Rangliste
5. Gruppeninformationen und Aktionen

Eine Ranglistenzeile zeigt ausschließlich:

* Rang
* Anzeigename
* Aggregierten Wert im gewählten Zeitraum
* Kennzeichnung **Du** beim eigenen Konto

E Mail, Einzeltage, einzelne Einträge, Ziel, Erinnerung, Zeitzone und Zeitpunkt einzelner Eingaben sind unsichtbar.

#### Rangregeln

* Standardsicht ist die aktuelle Gruppenwoche.
* Rang wird mit dichter Rangfolge berechnet. Bei 100, 100 und 90 entstehen die Ränge 1, 1 und 2.
* Gleichstände werden stabil nach normalisiertem Anzeigenamen und Mitgliedschafts ID sortiert.
* Mitglieder mit 0 erscheinen am Ende.
* Nur Einträge ab Beginn der aktuellen Mitgliedschaft zählen.
* Nur aktive Mitglieder erscheinen.
* Beim Verlassen oder Entfernen verschwindet die Person sofort.
* Blockierte Personen werden der blockierenden Person nicht angezeigt.
* Die Rangliste wird beim Öffnen, beim Zurückkehren in den Vordergrund und per Ziehen zum Aktualisieren neu geladen.
* Version 1 benötigt keine permanente Echtzeitverbindung.

#### Gruppenverwaltung

Normale Mitglieder können:

* Mitgliederliste sehen
* Nutzer melden oder blockieren
* Gruppe verlassen

Der Inhaber kann zusätzlich:

* Gruppenname ändern
* Einladungen erzeugen oder widerrufen
* Mitglieder entfernen
* Inhaberschaft übertragen
* Gruppe löschen

Entfernung, Übertragung und Löschung benötigen eine Bestätigung. Gruppenlöschung ist endgültig und löscht Mitgliedschaften sowie Einladungen, niemals aber persönliche Salawat Einträge.

### 7.10 Erinnerung

Es gibt genau eine tägliche Erinnerung pro Konto und Gerät.

#### Ablauf

1. Die Person aktiviert in Einstellungen den Schalter.
2. Sie wählt eine lokale Uhrzeit.
3. Erst jetzt erklärt die App kurz den Zweck und fordert die Systemberechtigung an.
4. Bei Zustimmung wird eine wiederholte lokale Kalenderbenachrichtigung geplant.
5. Bei Ablehnung bleibt die App vollständig nutzbar und zeigt einen Link zu den Systemeinstellungen.

#### Anforderungen

* Die Benachrichtigung wird lokal auf dem Gerät geplant. Version 1 speichert keinen Push Token und versendet keine Marketing Pushnachrichten.
* Standardtext ist neutral: **Zeit für deine heutige Salawat.**
* Antippen öffnet die Startseite.
* Sommerzeit und Zeitzonenwechsel werden über einen täglichen lokalen Kalendertrigger sowie erneute Prüfung beim App Start behandelt.
* Änderung der Uhrzeit ersetzt den alten Trigger atomar.
* Deaktivieren löscht alle durch die App geplanten Erinnerungstrigger dieses Kontos.
* Abmelden und Kontolöschung löschen lokale Trigger.
* Berechtigungszustände **nicht gefragt**, **erlaubt**, **abgelehnt** und **systemseitig eingeschränkt** werden getrennt behandelt.
* Die App fordert nach Ablehnung nicht wiederholt aggressiv an.

### 7.11 Einstellungen

Einstellungen enthalten nur:

1. Erinnerung und Uhrzeit
2. Anzeigename
3. E Mail Adresse ändern
4. Zeitzone mit automatischem Vorschlag und manueller Auswahl
5. Datenschutz und Datenexport
6. Einwilligung widerrufen
7. Konto löschen
8. Nutzungsbedingungen, Datenschutz und Impressum
9. Support und Meldestatus
10. Von allen Geräten abmelden
11. Abmelden
12. App Version

Die App folgt standardmäßig dem Systemdesign für hell und dunkel. Eine zusätzliche Themenauswahl ist nicht erforderlich.

Eine Änderung der E Mail Adresse benötigt eine frische Sitzung, Bestätigung über die bisherige Adresse und Verifikation der neuen Adresse. Bis zum vollständigen Abschluss bleibt die alte Adresse aktiv. Nach erfolgreicher Änderung werden andere Sitzungen widerrufen. Ist kein Zugriff mehr auf die bisherige Adresse möglich, gibt es keine unsichere manuelle Umgehung; ein dokumentierter Supportprozess darf nur nach belastbarer Eigentumsprüfung helfen.

Die Erinnerungszeit wird ausschließlich verschlüsselt auf dem jeweiligen Gerät gespeichert. Auf jedem neuen Gerät muss die Person die Erinnerung bewusst aktivieren und die Systemberechtigung selbst erteilen.

## 8. Exakte Berechnungsregeln

Sei E die Menge valider eigener Einträge, d der persönliche heutige Kalendertag und w der Montag der Woche von d.

~~~text
heute(u, d) = Summe(E.amount für user u und entry_date = d)

woche(u, d) = Summe(E.amount für user u und
                    w <= entry_date <= w + 6 Tage)

gesamt(u) = Summe(E.amount für user u)

ziel(u, t) = Betrag der neuesten Zielversion mit
             effective_from <= t

ziel_erreicht(u, t) = tages_summe(u, t) >= ziel(u, t)
                      sofern ziel(u, t) gesetzt ist
~~~

Für eine Gruppe g wird der heutige Gruppentag aus g.timezone bestimmt. Die Wochenrangliste verwendet den Montag bis Sonntag dieser Gruppenwoche. Für jedes aktive Mitglied zählt nur der Schnitt aus Zeitraum und aktueller Mitgliedschaft.

~~~text
mitglied_start = Kalendertag von joined_at in Gruppenzeitzone

wert(m, zeitraum) = Summe der persönlichen Einträge von m,
                    deren entry_date im Zeitraum liegt und für die gilt:
                    entry_date > mitglied_start oder
                    entry_date = mitglied_start und
                    recorded_at_client >= joined_at
~~~

Alle Summen werden in PostgreSQL als BIGINT berechnet und über JSON als Dezimalstring übertragen. Der Client darf große Summen nicht über ungenaue Fließkommazahlen verarbeiten.

## 9. UI und UX Spezifikation

### 9.1 Visuelle Richtung

Die Gestaltung ist ruhig, modern und zurückhaltend. Religiöse Würde entsteht durch Klarheit und Sorgfalt, nicht durch dekorative Überladung.

Empfohlene visuelle Grundlage:

* Warmer, sehr heller neutraler Hintergrund im hellen Modus
* Sehr dunkler neutraler Hintergrund im dunklen Modus
* Gedämpftes Smaragdgrün als einzige primäre Akzentfarbe
* Systemschrift für optimale Lesbarkeit und Dynamic Type
* Große Zahlen mit tabellarischen Ziffern
* Karten mit geringer visueller Tiefe, feiner Kontur und großzügigem Innenabstand
* Keine Glasflächen, starken Verläufe, 3D Elemente oder religiösen Stockgrafiken
* Keine arabische Kalligrafie als bloße Dekoration

### 9.2 Design Tokens

Die konkreten Hexwerte werden vor Entwicklung mit Kontrasttests finalisiert. Folgende semantische Tokens müssen existieren:

| Kategorie | Tokens |
|---|---|
| Hintergrund | background, surface, surfaceElevated |
| Text | textPrimary, textSecondary, textDisabled, textInverse |
| Aktion | accent, accentPressed, accentMuted |
| Status | success, warning, error, offline, pending |
| Kontur | borderSubtle, borderStrong, focusRing |
| Abstand | 4, 8, 12, 16, 24, 32, 48 |
| Radius | 8, 12, 16, pill |
| Schrift | caption, body, bodyStrong, title, displayNumber |

Farben dürfen nie die einzige Informationsträgerin sein. Fehler, Erfolg, Offlinezustand und Rang werden zusätzlich durch Text, Symbol oder Struktur vermittelt.

### 9.3 Layout

* Horizontaler Seitenabstand beträgt auf Mobiltelefonen mindestens 16 logische Pixel.
* Primäre Touchziele sind mindestens 48 mal 48 dp groß.
* Der Eintragen Button nimmt die volle nutzbare Breite ein.
* Inhalt respektiert Safe Areas, dynamische Schriftgrößen und Bildschirmrotation.
* Auf kleinen Geräten darf nichts horizontal scrollen.
* Bei sehr großer Systemschrift werden Kennzahlen untereinander statt in einem engen Raster angeordnet.
* Die Historie verwendet eine virtualisierte Liste und keine ungebremste Darstellung aller Einträge.

### 9.4 Interaktionszustände

Jede datenabhängige Ansicht muss folgende Zustände explizit gestalten:

1. Initiales Laden
2. Erfolgreich mit Daten
3. Erfolgreich ohne Daten
4. Offline mit lokalem Inhalt
5. Offline ohne lokalen Inhalt
6. Ausstehende Synchronisation
7. Teilweiser Fehler
8. Vollständiger Fehler
9. Nicht berechtigt
10. Sitzung abgelaufen
11. Wartungsmodus
12. Erzwungene Aktualisierung bei nicht mehr unterstützter Version

Skeletons dürfen nur die echte spätere Struktur spiegeln. Ein globaler Vollbildspinner nach dem ersten erfolgreichen Laden ist zu vermeiden.

### 9.5 Fehlermeldungen

Meldungen sind konkret und handlungsorientiert:

| Situation | Nutzermeldung |
|---|---|
| Ungültiger Betrag | Gib eine ganze Zahl zwischen 1 und 10.000.000 ein. |
| Offline gespeichert | Gespeichert. Wird synchronisiert, sobald du wieder online bist. |
| Server nicht erreichbar | Die Verbindung klappt gerade nicht. Dein Eintrag bleibt auf diesem Gerät gespeichert. |
| Versionskonflikt | Dieser Eintrag wurde auf einem anderen Gerät geändert. Prüfe den aktuellen Stand. |
| Einladung abgelaufen | Diese Einladung ist nicht mehr gültig. Bitte den Gruppeninhaber um eine neue. |
| Gruppe voll | Diese Gruppe hat die maximale Mitgliederzahl erreicht. |
| Berechtigung abgelehnt | Erinnerungen sind ausgeschaltet. Du kannst sie in den Geräteeinstellungen erlauben. |
| Rate Limit | Zu viele Versuche. Warte kurz und versuche es erneut. |

Interne Fehlercodes, SQL Meldungen, Stacktraces, Token oder Anbieterinformationen werden nie angezeigt.

### 9.6 Barrierefreiheit

Die App erfüllt mindestens WCAG 2.2 AA, soweit auf native Mobile Oberflächen übertragbar, sowie die nativen Accessibility Leitlinien.

Verbindlich:

* Normaler Text erreicht mindestens 4,5 zu 1 Kontrast.
* Große Texte und nichttextliche Steuerelemente erreichen mindestens 3 zu 1.
* Alle interaktiven Elemente haben zugängliche Namen, Rollen, Zustände und Hinweise.
* Die Fokusreihenfolge entspricht der visuellen Reihenfolge.
* VoiceOver und TalkBack lesen Beträge mit Bedeutung, zum Beispiel **1.500 Salawat, Eintrag vom 29. August**.
* Der Slider ist per Wischgeste, exakter Eingabe und barrierefreien Erhöhen- sowie Verringernaktionen nutzbar.
* Dynamische Schrift bis zu den größten Accessibility Größen bleibt ohne Funktionsverlust nutzbar.
* Fetttext, hoher Kontrast, reduzierte Bewegung und reduzierte Transparenz werden respektiert.
* Animationen sind kurz, nicht unverzichtbar und bei reduzierter Bewegung deaktiviert.
* Löschaktionen sind nicht nur über Wischgesten erreichbar.
* Jede Ranginformation wird als Text vorgelesen.
* Alle End to End Kernabläufe werden manuell mit VoiceOver und TalkBack geprüft.

### 9.7 Internationalisierung

Version 1 enthält Deutsch und Englisch. Architektur und Layout sind von Beginn an für Arabisch und Urdu mit Rechts nach links Darstellung vorbereitet.

* Kein sichtbarer Text wird hart im Komponentenquellcode hinterlegt.
* Pluralformen, Datumsformate und Zahlengruppierung verwenden die aktive Locale.
* Kanonische Datenwerte bleiben localeunabhängig.
* IANA Zeitzonen werden gespeichert, keine bloßen UTC Offsets.
* Texte dürfen bei Übersetzung mindestens 40 Prozent länger werden.
* Screenshots und Accessibility Texte werden je Sprache geprüft.

## 10. Technische Zielarchitektur

### 10.1 Verbindlicher Stack

| Ebene | Entscheidung |
|---|---|
| Mobile | React Native mit Expo und TypeScript |
| Navigation | Expo Router |
| Client Daten | TanStack Query plus verschlüsselte SQLite Persistenz |
| Lokale Datenbank | expo sqlite mit SQLCipher |
| Sichere Schlüssel | expo secure store |
| Benachrichtigung | expo notifications, ausschließlich lokaler Trigger |
| Formulare und Schema | React Hook Form und Zod |
| Backend | Supabase in EU Region |
| Datenbank | PostgreSQL |
| Authentifizierung | Supabase Auth mit E Mail OTP und eigenem SMTP |
| API | PostgREST, streng begrenzte SQL RPCs und wenige Edge Functions |
| Backend Autorisierung | PostgreSQL Row Level Security |
| Website | Kleine statische Website auf eigener Domain |
| Admin | Separate interne Weboberfläche mit MFA |
| Build und Release | EAS Build, EAS Submit und EAS Update |
| Fehlerüberwachung | EU gehosteter Dienst mit PII Scrubbing, standardmäßig ohne Session Replay |
| CI | GitHub Actions oder EAS Workflows |
| Tests | Vitest, React Native Testing Library, pgTAP und Maestro |

Die jeweils aktuelle stabile Version wird zu Projektbeginn exakt im Lockfile fixiert. Vorab-, Canary- und Beta Versionen sind in Produktion verboten. Mit Stand dieses Dokuments ist Expo SDK 57 die aktuelle stabile Linie. Sie verwendet React Native 0.86, benötigt mindestens Node 22.13, zielt auf Android API 36 und unterstützt iOS ab 16.4. Diese Werte müssen unmittelbar vor dem ersten Build erneut anhand offizieller Dokumentation geprüft werden.

### 10.2 Architekturübersicht

~~~mermaid
flowchart TD
    A["iOS und Android App"] --> B["Supabase Auth und API"]
    B --> C["PostgreSQL mit RLS"]
    B --> D["Edge Functions"]
    E["Einladungs- und Rechtswebsite"] --> B
    F["Interne Moderation"] --> D
~~~

### 10.3 Verantwortungsgrenzen

#### Mobile App

Die App ist verantwortlich für:

* Darstellung und lokale Eingabevalidierung
* Verschlüsselten Cache
* Offline Warteschlange
* Optimistische Oberfläche
* Lokale Erinnerungen
* Sichere Sitzungsspeicherung
* Deep Link Verarbeitung

Sie ist nicht vertrauenswürdig für Berechtigung, Mitgliedschaft, Summen anderer Personen, Rang, Tokenstatus, Kontolöschung oder Moderationsrechte.

#### PostgreSQL und RPC

Die Datenbank ist die fachliche Quelle der Wahrheit. Sie ist verantwortlich für:

* Datenintegrität durch Typen, Checks, Fremdschlüssel und eindeutige Indizes
* Row Level Security
* Atomare Mutationen
* Idempotenz
* Revisionskontrolle
* Summen und Ranglisten
* Gruppen- und Einladungsregeln

#### Edge Functions

Edge Functions werden nur verwendet, wenn serverseitige Geheimnisse, externe Dienste oder privilegierte Auth Operationen nötig sind:

* Kontoexport
* Kontolöschung nach erneuter Verifikation
* Erzeugen sicherer Einladungstokens
* Moderationsaktionen
* Optionaler Supportversand

Normale Einträge dürfen nicht unnötig durch eine eigene Serverfunktion geleitet werden.

#### Öffentliche Website

Die Website enthält:

* /privacy
* /terms
* /imprint
* /support
* /delete-account
* /join
* /.well-known/apple-app-site-association
* /.well-known/assetlinks.json

Sie setzt keine Marketingcookies und lädt keine Drittanbietertracker.

### 10.4 Monorepo Struktur

~~~text
apps/
  mobile/
  admin/
  legal-site/

packages/
  shared-types/
  validation/
  design-tokens/
  localization/

supabase/
  migrations/
  functions/
  tests/
  seed.sql

e2e/
  maestro/

docs/
  architecture/
  threat-model/
  privacy/
  runbooks/
~~~

### 10.5 Umgebungen

Es gibt strikt getrennte Umgebungen:

| Umgebung | Zweck | Daten |
|---|---|---|
| Lokal | Entwicklung und Tests | Nur synthetisch |
| Staging | Integration, QA und Store Vorabtest | Nur synthetisch |
| Produktion | Reale Nutzung | Reale Daten |

Produktionsdaten dürfen nie in Entwicklung oder Staging kopiert werden. Projekt IDs, Datenbankzugänge, SMTP Daten, Signierschlüssel und Monitoring DSNs sind pro Umgebung getrennt.

## 11. Backend und Datenmodell

### 11.1 Schemata

* **auth:** Von Supabase verwaltete Konten und Sitzungen
* **public:** Über die Data API erreichbare Tabellen mit aktivierter RLS
* **private:** Nicht über die Data API exponierte Tokens, Limits, Meldungen, Einwilligungsnachweise und Auditdaten

Jede neue Tabelle muss explizit einem Schema zugeordnet werden. Es darf kein unkontrolliertes Objekt im Standardsuchpfad entstehen.

### 11.2 Profile

**Tabelle:** public.profiles

| Spalte | Typ | Regel |
|---|---|---|
| id | uuid | Primärschlüssel, Referenz auf auth.users, on delete cascade |
| display_name | text | 2 bis 30 sichtbare Zeichen |
| normalized_name | text | Serverseitig normalisiert |
| status | enum | active, suspended |
| created_at | timestamptz | Serverzeit |
| updated_at | timestamptz | Serverzeit |
| revision | integer | Start 1, bei Änderung erhöhen |

Der Anzeigename ist nicht global eindeutig. Es gibt keine öffentlichen Handles.

### 11.3 Einstellungen

**Tabelle:** public.user_settings

| Spalte | Typ | Regel |
|---|---|---|
| user_id | uuid | Primärschlüssel und Profilreferenz |
| timezone | text | Gültige IANA Zeitzone |
| locale | text | Unterstützte BCP 47 Locale |
| created_at | timestamptz | Serverzeit |
| updated_at | timestamptz | Serverzeit |

Erinnerungsstatus, Uhrzeit, Systemberechtigung und lokale Notification ID sind gerätespezifisch und werden nicht im Backend gespeichert.

### 11.4 Salawat Einträge

**Tabelle:** public.salawat_entries

| Spalte | Typ | Regel |
|---|---|---|
| id | uuid | Vom Client vor Mutation erzeugter Primärschlüssel |
| user_id | uuid | Besitzer, nicht vom Request frei wählbar |
| amount | integer | Check 1 bis 10.000.000 |
| entry_date | date | Fachlicher Kalendertag |
| timezone | text | IANA Zeitzone bei Erstellung |
| recorded_at_client | timestamptz | Unveränderbare lokale Erfassungszeit für Offlineordnung und Beitrittsgrenze, nie für Autorisierung |
| created_at | timestamptz | Serverzeit |
| updated_at | timestamptz | Serverzeit |
| revision | integer | Start 1 |

Verbindliche Indizes:

* Primärschlüssel auf id
* Index auf user_id, entry_date absteigend, created_at absteigend, id absteigend
* Index auf user_id, updated_at für Synchronisation
* Index auf user_id, entry_date für Summen

Die Datenbank übernimmt user_id ausschließlich aus auth.uid(). Eine fremde user_id im Request wird nicht akzeptiert.

### 11.5 Zielversionen

**Tabelle:** public.daily_goal_versions

| Spalte | Typ | Regel |
|---|---|---|
| id | uuid | Primärschlüssel |
| user_id | uuid | Besitzer |
| effective_from | date | Wirksam ab diesem Tag |
| amount | integer nullable | Null bedeutet ab diesem Tag kein Ziel |
| created_at | timestamptz | Serverzeit |
| updated_at | timestamptz | Serverzeit |

Eindeutige Bedingung auf user_id und effective_from. Ist amount gesetzt, gilt der Check 1 bis 10.000.000. Das wirksame Ziel ist immer die neueste Version mit effective_from kleiner oder gleich dem gesuchten Tag.

### 11.6 Gruppen

**Tabelle:** public.groups

| Spalte | Typ | Regel |
|---|---|---|
| id | uuid | Vom Client erzeugter Primärschlüssel |
| owner_user_id | uuid | Aktives Mitglied und Inhaber |
| name | text | 2 bis 50 sichtbare Zeichen |
| normalized_name | text | Serverseitig normalisiert |
| timezone | text | Gültige IANA Zeitzone, nach Erstellung fix |
| status | enum | active, suspended |
| created_at | timestamptz | Serverzeit |
| updated_at | timestamptz | Serverzeit |
| revision | integer | Start 1 |

Ein Gruppenname ist nur aktiven Mitgliedern sichtbar. Suspended Gruppen sind für normale Mitglieder gesperrt und zeigen eine neutrale Supportmeldung.

### 11.7 Mitgliedschaftsperioden

**Tabelle:** public.group_memberships

| Spalte | Typ | Regel |
|---|---|---|
| id | uuid | Primärschlüssel |
| group_id | uuid | Gruppenreferenz, on delete cascade |
| user_id | uuid | Profilreferenz, on delete cascade |
| joined_at | timestamptz | Annahmezeit |
| left_at | timestamptz nullable | Null bedeutet aktiv |
| invite_id | uuid nullable | Verwendete Einladung |
| sharing_consent_version | text | Version der bestätigten Gruppenfreigabe |
| created_at | timestamptz | Serverzeit |

Ein partieller eindeutiger Index erlaubt pro Gruppe und Person höchstens eine aktive Mitgliedschaft mit left_at gleich Null. Frühere Perioden bleiben für Integrität erhalten, sind aber nicht Teil einer späteren Rangliste.

### 11.8 Einladungen

**Tabelle:** private.group_invites

| Spalte | Typ | Regel |
|---|---|---|
| id | uuid | Primärschlüssel |
| group_id | uuid | Gruppenreferenz |
| created_by | uuid | Muss aktueller Inhaber sein |
| token_hash | bytea | Eindeutig |
| code_hash | bytea | Eindeutig |
| expires_at | timestamptz | Höchstens 30 Tage |
| max_uses | integer | 1 bis 100 |
| use_count | integer | Nicht negativ, höchstens max_uses |
| revoked_at | timestamptz nullable | Widerruf |
| created_at | timestamptz | Serverzeit |

**Tabelle:** private.group_invite_uses

| Spalte | Typ | Regel |
|---|---|---|
| invite_id | uuid | Teil des Primärschlüssels |
| user_id | uuid | Teil des Primärschlüssels |
| membership_id | uuid | Eindeutig |
| used_at | timestamptz | Serverzeit |

Diese Eindeutigkeit verhindert, dass wiederholte Annahmeversuche einer Person den Nutzungszähler mehrfach erhöhen.

### 11.9 Blockierungen

**Tabelle:** public.user_blocks

| Spalte | Typ | Regel |
|---|---|---|
| blocker_user_id | uuid | Teil des Primärschlüssels |
| blocked_user_id | uuid | Teil des Primärschlüssels |
| created_at | timestamptz | Serverzeit |

Selbstblockierung ist verboten. Eine Blockierung verhindert direkte Einladungsinteraktionen und blendet beide Konten in gegenseitigen Ranglistenresultaten aus.

### 11.10 Meldungen und Moderation

**Tabelle:** private.reports

| Spalte | Typ | Regel |
|---|---|---|
| id | uuid | Primärschlüssel |
| reporter_user_id | uuid | Meldende Person |
| reported_user_id | uuid nullable | Gemeldetes Konto |
| group_id | uuid nullable | Gemeldete Gruppe |
| category | enum | harassment, hateful_name, impersonation, spam, other |
| details | text nullable | Maximal 500 Zeichen |
| status | enum | open, reviewing, resolved, rejected |
| created_at | timestamptz | Serverzeit |
| resolved_at | timestamptz nullable | Abschluss |

Mindestens eines der Ziele reported_user_id oder group_id muss gesetzt sein. Meldende Personen können nur Status und Abschlusszeit ihrer eigenen Meldung sehen, nicht interne Moderationsnotizen.

**Tabelle:** private.moderation_actions

Sie enthält Aktion, Ziel, Moderator, Begründung, Zeitpunkt und vorherigen sowie neuen Status. Salawat Beträge werden niemals darin gespeichert.

### 11.11 Einwilligungen

**Tabelle:** private.consent_records

| Spalte | Typ | Regel |
|---|---|---|
| id | uuid | Primärschlüssel |
| user_id | uuid | Kontoreferenz |
| consent_type | enum | core_processing, group_sharing |
| document_version | text | Unveränderbare Version |
| locale | text | Angezeigte Sprache |
| granted_at | timestamptz | Zeitpunkt |
| withdrawn_at | timestamptz nullable | Widerruf |

Es wird keine IP Adresse nur zum Einwilligungsnachweis gespeichert.

### 11.12 Rate Limits

**Tabelle:** private.rate_limit_buckets

Sie enthält Akteur, Aktion, Fensterbeginn und Zähler. Aktualisierung geschieht atomar. Abgelaufene Fenster werden regelmäßig gelöscht. Beispiele:

| Aktion | Limit |
|---|---:|
| Eintrag erstellen | 60 pro Minute, 300 pro Tag |
| Eintrag bearbeiten oder löschen | 60 pro Minute |
| Gruppe erstellen | 10 pro Tag |
| Einladung erstellen | 30 pro Tag |
| Code prüfen | 5 pro Minute, 20 bis Sperre |
| Meldung erstellen | 10 pro Tag |
| Export anfordern | 3 pro Tag |
| Kontolöschung anfordern | 3 pro Tag |

Die Werte sind Startwerte und werden anhand realer Missbrauchsmuster angepasst, ohne normale religiöse Nutzung zu behindern.

### 11.13 Systemkonfiguration

**Tabelle:** public.app_config

Sie enthält ausschließlich nicht geheime Betriebswerte:

* Minimum unterstützte App Version je Plattform
* Wartungsmodus
* Aktuelle Datenschutz- und Bedingungsversion
* Support URL
* Maximalwerte für Gruppen und Einträge

Nur authentifizierter Lesezugriff ist erlaubt. Änderungen erfolgen ausschließlich über den geschützten Deploymentprozess.

### 11.14 Minimales SQL Grundmuster

Das folgende Muster ist verbindlich für jede exponierte Tabelle. Die vollständige Implementierung muss als versionierte Migration vorliegen.

~~~sql
create table public.salawat_entries (
  id uuid primary key,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  amount integer not null
    check (amount between 1 and 10000000),
  entry_date date not null,
  timezone text not null,
  recorded_at_client timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
    check (revision >= 1)
);

alter table public.salawat_entries enable row level security;
alter table public.salawat_entries force row level security;

create policy entries_select_own
on public.salawat_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update, delete
on public.salawat_entries
from anon, authenticated;
~~~

Mutationen erfolgen über eng begrenzte Funktionen. Jede SECURITY DEFINER Funktion besitzt einen leeren Suchpfad, verwendet vollständig qualifizierte Objektnamen, prüft auth.uid(), enthält kein dynamisches SQL und ist nur für die benötigte Rolle ausführbar.

### 11.15 Verbindlicher Backend Lieferumfang

Ein über das Anbieter Dashboard manuell zusammengeklicktes Projekt ist kein finales Backend. Der vollständige Backendstand muss im Repository reproduzierbar enthalten:

* supabase/config.toml ohne Geheimwerte
* Lückenlose, geordnete SQL Migrationen
* Typen, Tabellen, Checks, Fremdschlüssel und Indizes
* Sämtliche RLS Policies und Grants
* Alle RPC Funktionen
* Trigger für aktualisierte Zeitpunkte und sichere Profilanlage
* Zeitgesteuerte Löschjobs für abgelaufene Einladungen, Limits und Exporte
* Edge Functions für Einladungstoken, Export, Kontolöschung und Moderation
* Lokale synthetische Seed Daten
* pgTAP Tests für Schema, Funktionen und RLS
* Integrationsprüfungen der Edge Functions
* Automatisch generierte TypeScript Datenbanktypen
* Versionierte API Beschreibung und stabile Fehlercodes
* Beispielkonfiguration mit allen erforderlichen Variablennamen, aber ohne Werte
* Deployment-, Backup-, Restore- und Incident Runbooks
* Skript oder Pipeline, die ein leeres lokales Projekt vollständig aufbaut und testet

Nach dem lokalen Supabase Reset müssen Migration, Seed, Typgenerierung und alle Backendtests ohne manuelle Nacharbeit erfolgreich durchlaufen.

## 12. API Vertrag

### 12.1 Grundregeln

* Alle Requests laufen über HTTPS.
* Authentifizierte Requests enthalten ein gültiges Supabase JWT.
* user_id wird nie als vertrauenswürdiger Eingabeparameter verwendet.
* Alle Mutationen sind transaktional und entweder vollständig erfolgreich oder wirkungslos.
* Jeder Response enthält request_id und server_time.
* Beträge und Summen werden als Dezimalstrings ausgegeben.
* Zeitpunkte verwenden ISO 8601 in UTC.
* Kalendertage verwenden YYYY-MM-DD.
* Listen verwenden Cursor Pagination.
* Unbekannte Felder werden nicht still als sicherheitsrelevante Eingaben übernommen.
* API und Datenbanktypen werden in TypeScript generiert. Handgeschriebene, auseinanderlaufende Duplikattypen sind verboten.

### 12.2 Fehlerformat

~~~json
{
  "request_id": "uuid",
  "error": {
    "code": "ENTRY_VERSION_CONFLICT",
    "message": "Dieser Eintrag wurde bereits geändert.",
    "retryable": false,
    "field": null
  }
}
~~~

Stabile Fehlercodes:

| Code | HTTP | Bedeutung |
|---|---:|---|
| AUTH_REQUIRED | 401 | Keine gültige Sitzung |
| CONSENT_REQUIRED | 403 | Kernverarbeitung nicht bestätigt |
| FORBIDDEN | 403 | Keine Berechtigung |
| NOT_FOUND | 404 | Ressource nicht sichtbar oder vorhanden |
| INVALID_INPUT | 422 | Allgemein ungültige Eingabe |
| INVALID_AMOUNT | 422 | Betrag außerhalb Regeln |
| INVALID_DATE | 422 | Datum unzulässig |
| ENTRY_VERSION_CONFLICT | 409 | Revision stimmt nicht |
| ALREADY_MEMBER | 409 | Bereits aktives Mitglied |
| OWNER_TRANSFER_REQUIRED | 409 | Inhaber kann nicht direkt verlassen |
| GROUP_LIMIT_REACHED | 409 | Gruppen- oder Mitgliederlimit |
| INVITE_INVALID | 404 | Einladung nicht nutzbar |
| INVITE_EXPIRED | 410 | Einladung abgelaufen |
| INVITE_REVOKED | 410 | Einladung widerrufen |
| INVITE_FULL | 409 | Nutzungszahl erreicht |
| NAME_REJECTED | 422 | Name verletzt Regeln |
| RATE_LIMITED | 429 | Zeitlimit überschritten |
| MAINTENANCE | 503 | Wartungsmodus |
| INTERNAL | 500 | Unerwarteter Fehler |

NOT_FOUND und FORBIDDEN dürfen bei sensiblen Ressourcen absichtlich dieselbe äußere Antwort erzeugen, damit Existenz nicht verraten wird.

### 12.3 Persönliche Datenfunktionen

#### get_home_summary

**Eingabe:** timezone  
**Ausgabe:** today_date, today_total, week_start, week_total, all_time_total, today_goal, achieved_days, eligible_goal_days, pending_server_count, calculated_at

Die Funktion liest keine Client Summen, sondern berechnet serverseitig aus Einträgen und Zielversionen.

#### list_entries

**Eingabe:** cursor optional, limit 1 bis 50  
**Ausgabe:** items, next_cursor, has_more

Jedes Item enthält id, amount, entry_date, timezone, recorded_at_client, created_at, updated_at und revision.

#### create_entry

**Eingabe:** id, amount, entry_date, timezone, recorded_at_client  
**Ausgabe:** vollständiger kanonischer Eintrag

Verhalten:

* id ist vom Client erzeugt.
* timezone muss eine gültige IANA Zeitzone sein.
* entry_date darf aus Sicht dieser Zeitzone nicht in der Zukunft und höchstens 365 Tage in der Vergangenheit liegen.
* recorded_at_client darf nicht mehr als 24 Stunden in der Zukunft liegen und wird nach Erstellung nie verändert.
* Existiert dieselbe id bereits beim selben Nutzer mit demselben fachlichen Inhalt, wird der bestehende Eintrag zurückgegeben.
* Existiert dieselbe id mit anderem Inhalt, folgt INVALID_INPUT.
* Eine id eines anderen Nutzers wird nicht offengelegt und erzeugt keine Übernahme.

#### update_entry

**Eingabe:** id, amount, entry_date, expected_revision  
**Ausgabe:** aktualisierter Eintrag mit erhöhter revision

Update erfolgt nur bei Eigentümerschaft und exakt erwarteter Revision. recorded_at_client und created_at bleiben unverändert.

#### delete_entry

**Eingabe:** id, expected_revision  
**Ausgabe:** deleted true

Ist ein eigener Eintrag aufgrund derselben bereits ausgeführten Operation nicht mehr vorhanden, darf die Wiederholung erfolgreich antworten. Eine fremde ID bleibt unsichtbar.

#### set_daily_goal

**Eingabe:** effective_from gleich persönlichem Heute, amount oder null  
**Ausgabe:** Zielversion

Ein historisches effective_from ist über die normale App nicht erlaubt.

### 12.4 Gruppenfunktionen

#### list_my_groups

Gibt nur Gruppen mit aktiver eigener Mitgliedschaft aus. Jede Zeile enthält Gruppen ID, Name, eigene Rolle, Mitgliederzahl, eigenen Wochenwert, eigenen Rang und calculated_at.

#### create_group

**Eingabe:** client_group_id, name, timezone  
**Ausgabe:** Gruppe und eigene Mitgliedschaft

Gruppe und Inhabermitgliedschaft entstehen in derselben Transaktion.

#### update_group_name

**Eingabe:** group_id, name, expected_revision  
Nur Inhaber. Namensfilter und Revisionsprüfung sind zwingend.

#### create_group_invite

**Edge Function Eingabe:** group_id, expires_in_days, max_uses  
**Ausgabe:** share_url, manual_code, expires_at, max_uses

Nur der Inhaber darf erzeugen. Rohwerte werden genau einmal an den autorisierten Client zurückgegeben und nicht geloggt.

#### list_group_invites

Nur für Inhaber. Gibt Metadaten und die letzten vier Zeichen des manuellen Codes aus, niemals das Rohlinktoken.

#### revoke_group_invite

Nur Inhaber. Wiederholung ist idempotent.

#### preview_invite

Nur angemeldet. Bei gültigem Token werden Gruppenname, Mitgliederzahl und Teilungshinweis ausgegeben. Es wird noch keine Mitgliedschaft angelegt.

#### accept_invite

**Eingabe:** Linktoken oder manueller Code, bestätigte sharing_consent_version  
**Ausgabe:** Gruppe und Mitgliedschaft

Prüfung und Annahme erfolgen atomar. Eine bestehende aktive Mitgliedschaft antwortet idempotent mit ALREADY_MEMBER oder dem bestehenden Membership Objekt, ohne einen weiteren Invite Use.

#### get_group_leaderboard

**Eingabe:** group_id, period mit week oder all_time, cursor, limit  
**Ausgabe:** group, period_start, period_end, own_rank, items, next_cursor, calculated_at

Die Funktion bestätigt vor jeder Ausgabe eine aktive Mitgliedschaft. Sie gibt ausschließlich aggregierte Daten zurück.

#### list_group_members

Gibt Mitgliedschafts ID, Anzeigename, joined_at, owner Kennzeichnung und Blockierungszustand zurück. Keine E Mail und keine Beträge.

#### remove_group_member

Nur Inhaber, nicht gegen sich selbst. Setzt left_at atomar. Das persönliche Konto und seine Einträge bleiben bestehen.

#### leave_group

Normale Mitglieder setzen ihre aktuelle Mitgliedschaft auf beendet. Inhaber erhalten OWNER_TRANSFER_REQUIRED.

#### transfer_group_ownership

Nur aktueller Inhaber. Ziel muss aktives, nicht suspendiertes Mitglied sein. Eigentümerwechsel und Gruppenrevision erfolgen in einer Transaktion.

#### delete_group

Nur Inhaber nach erneuter Bestätigung. Löscht Gruppe, Mitgliedschaften, Einladungen und gruppenbezogene Meldungsreferenzen gemäß Aufbewahrungsregeln. Persönliche Einträge bleiben unberührt.

### 12.5 Sicherheits- und Datenschutzfunktionen

#### block_user und unblock_user

Nur für das eigene Konto. Selbstblockierung verboten. Beide Operationen sind idempotent.

#### create_report

Validiert Ziel, Kategorie, Detailgrenze und Rate Limit. Ein Moderator erhält keine unnötigen Salawat Daten.

#### export_account_data

Edge Function mit frischer Sitzung. Erzeugt im Stream ein ZIP mit JSON und CSV:

* Profil und Einstellungen
* Eigene Einträge
* Zielversionen
* Eigene Gruppenmitgliedschaften
* Eigene Gruppen, sofern Inhaber
* Blockierungen
* Einwilligungsnachweise
* Eigene Meldungen mit sichtbarem Status

Die Exportdatei wird nicht dauerhaft in einem öffentlichen Bucket abgelegt. Falls temporärer Objektspeicher nötig ist, gilt ein einmaliger, kurzlebiger signierter Link und automatische Löschung spätestens nach 24 Stunden.

#### delete_account

Edge Function mit erneuter E Mail Verifikation. Sie führt in einer Datenbanktransaktion aus:

1. Für jede eigene Gruppe Auswahl zwischen Übertragung und Löschung entsprechend der bestätigten Nutzerentscheidung
2. Beenden aller Mitgliedschaften
3. Löschen aller Einträge, Ziele, Einstellungen, Blockierungen und nicht aufbewahrungspflichtigen Daten
4. Widerruf aller Einladungen
5. Pseudonymisierung rechtlich notwendiger Moderations- oder Sicherheitsnachweise
6. Löschen des Auth Kontos
7. Sperren weiterer Requests dieser Sitzung

Die App löscht danach lokalen Cache, Datenbankschlüssel, Sitzung und Benachrichtigungen. Der Vorgang muss auch über /delete-account auf der Website initiierbar sein.

## 13. Autorisierung und Row Level Security

### 13.1 Grundsatz

RLS ist auf jeder Tabelle im exponierten Schema aktiviert und erzwungen. Tabellen ohne vollständige Policy Tests dürfen nicht veröffentlicht werden. Standard Grants werden entzogen und nur die minimal benötigten Rechte wieder vergeben.

### 13.2 Matrix

| Ressource | Anonym | Eigenes Konto | Fremdes Konto in gleicher Gruppe | Gruppeninhaber | Admin |
|---|---:|---:|---:|---:|---:|
| Profil vollständig | Nein | Lesen, ändern | Nein | Nein | Nur Status |
| Anzeigename über Gruppen RPC | Nein | Ja | Ja | Ja | Ja |
| Einstellungen | Nein | Lesen, ändern | Nein | Nein | Nein |
| Salawat Einträge | Nein | CRUD | Nein | Nein | Standardmäßig Nein |
| Zielversionen | Nein | Lesen, ändern | Nein | Nein | Nein |
| Gruppenmetadaten | Nein | Als Mitglied | Als Mitglied | Verwalten | Moderieren |
| Ranglistenaggregate | Nein | Als Mitglied | Als Mitglied | Als Mitglied | Standardmäßig Nein |
| Mitgliedschaften | Nein | Eigene, RPC Liste | Begrenzte RPC Liste | Verwalten | Moderieren |
| Einladungstoken | Nein | Nein | Nein | Nur neu erzeugte Rohwerte | Nein |
| Blockierungen | Nein | Eigene | Nein | Nein | Nein |
| Meldungen | Nein | Eigene Statussicht | Nein | Nein | Bearbeiten |

### 13.3 Negative Pflichtprüfungen

Für jede exponierte Operation existiert mindestens ein Test mit:

* Nicht angemeldeter Rolle
* Fremdem Nutzer
* Ehemaligem Gruppenmitglied
* Suspendiertem Nutzer
* Ungültigem JWT
* Gelöschter oder suspendierter Gruppe
* Manipulierter user_id
* Erratener fremder UUID

Ein Test ist nur bestanden, wenn keine fremden Daten, keine unterschiedlichen Existenzsignale und keine Mutation entstehen.

### 13.4 Service Role

Der Supabase Service Role Schlüssel:

* Darf nie in App Bundle, Website JavaScript, Clientkonfiguration, Logs oder Repository vorkommen.
* Darf nur in genehmigten Edge Functions und Verwaltungsjobs liegen.
* Muss pro Umgebung getrennt sein.
* Muss nach Verdacht sofort rotierbar sein.
* Darf nicht für normale Nutzerrequests verwendet werden, wenn eine nutzergebundene RLS Anfrage genügt.

## 14. Offlinebetrieb und Synchronisation

### 14.1 Lokale Speicherung

Die lokale SQLite Datenbank ist mit SQLCipher verschlüsselt. Pro Konto und Installation wird ein zufälliger 256 Bit Schlüssel erzeugt und in SecureStore beziehungsweise im nativen Keychain oder Keystore gehalten.

Lokal gespeichert werden nur:

* Eigene Einträge
* Eigene Zielversionen
* Dashboardzusammenfassung
* Eigene Gruppenliste
* Zuletzt geladene aggregierte Ranglisten
* Mutation Queue
* Nicht angenommener Einladungstoken, kurzzeitig

E Mail, OTP, Service Geheimnisse und Rohinvite Token nach Annahme gehören nicht in SQLite.

Die verschlüsselte Datenbank wird von allgemeinen Gerätebackups ausgeschlossen, weil die kanonischen Daten serverseitig synchronisiert sind. Bei Abmeldung oder Kontowechsel wird sie sicher verworfen.

### 14.2 Lokales Datenmodell

Jeder lokale Datensatz besitzt:

* local_state mit synced, pending_create, pending_update, pending_delete, conflict oder failed
* server_revision
* last_attempt_at
* retry_count
* last_error_code ohne sensible Rohmeldung

Die Mutation Queue enthält Operationstyp, Entity ID, minimalen Payload, erwartete Revision, Erstellungszeit und Status. Sie speichert keine JWTs.

### 14.3 Synchronisationsalgorithmus

1. UI schreibt valide Mutation und optimistische Projektion in einer lokalen Transaktion.
2. Bei Netz und gültiger Sitzung wird die Queue pro Entity in Reihenfolge abgearbeitet.
3. Erstellen verwendet die vorab erzeugte Entity UUID.
4. Mehrere noch nicht gesendete Änderungen desselben lokalen Eintrags werden zusammengeführt.
5. Eine lokale Erstellung mit anschließender Löschung vor erstem Sync wird lokal entfernt und muss nicht gesendet werden.
6. Netzwerkfehler, 5xx und 429 werden mit exponentiellem Backoff und Zufallsanteil erneut versucht.
7. 400, 403 und 422 werden nicht automatisch endlos wiederholt.
8. 401 versucht genau einmal Session Refresh und stoppt danach bis zur Anmeldung.
9. 409 Revision Conflict setzt conflict und fordert den aktuellen Serverstand.
10. Nach erfolgreichem Queue Durchlauf werden Summary und betroffene Ranglisten neu geladen.

### 14.4 Konfliktregel

Es gibt kein stilles Last Write Wins bei bestehenden Einträgen.

Bei Konflikt zeigt die App:

* Serverseitigen aktuellen Betrag und Tag
* Lokale beabsichtigte Änderung
* **Serverstand behalten**
* **Meine Änderung erneut anwenden**

Erneutes Anwenden verwendet die neue Revision. Bei Löschkonflikten muss klar erklärt werden, wenn ein anderer Client den Eintrag verändert hat.

### 14.5 Offline Grenzen

* Neue Einträge, Bearbeiten, Löschen und Zieländerungen funktionieren offline.
* Gruppe erstellen, Einladung annehmen, Mitglieder entfernen, Inhaberschaft übertragen und Konto löschen benötigen eine Onlineverbindung.
* Zwischengespeicherte Ranglisten zeigen klar **Zuletzt aktualisiert um …**.
* Eine offline angezeigte Platzierung darf nicht als aktuell bezeichnet werden.
* Nach sieben Tagen ohne erfolgreiche Sitzungserneuerung darf die App lokalen Inhalt weiter anzeigen und Einträge verschlüsselt vormerken, muss aber vor Upload erneut authentifizieren.

## 15. Sicherheitskonzept

### 15.1 Schutzprofil

Da personenbezogene Salawat Werte religiöse Überzeugungen offenbaren können, wird ein erhöhtes Schutzprofil angesetzt. Mobile Kontrollen orientieren sich an OWASP MASVS, Backendkontrollen mindestens an OWASP ASVS Level 2. Eine externe Prüfung oder ein strukturierter Penetrationstest ist vor öffentlicher Freigabe erforderlich.

### 15.2 Bedrohungen und Kontrollen

| Bedrohung | Zwingende Kontrolle |
|---|---|
| Fremde Einträge über erratene ID lesen | RLS, Eigentümerprüfung, negative Tests |
| Fremden Eintrag ändern | Keine direkten Grants, RPC mit auth.uid und Revision |
| Doppelte Offline Einträge | Client UUID und idempotente Erstellung |
| Verlorene parallele Änderung | Optimistische Revisionskontrolle |
| Einladung erraten | 256 Bit Token, begrenzter Code, Hashspeicherung, Rate Limit |
| Einladung aus Logs stehlen | Token Redaction, keine Drittanbietertracker, kurze Laufzeit |
| Gruppenlimit bei Parallelzugriff umgehen | Zeilensperre und atomare Transaktion |
| Service Role aus App extrahieren | Nur Publishable Key im Client |
| Sitzung vom Gerät stehlen | SecureStore, verschlüsselte lokale DB, Logout Bereinigung |
| Sensible Daten in Crashlogs | PII Scrubbing, keine Werte oder Namen in Breadcrumbs |
| Missbräuchliche Namen | Eingabefilter, Melden, Blockieren, Moderation |
| Kontoübernahme | Verifizierter OTP, Rate Limit, Bot Schutz, Sessionverwaltung |
| SQL Injection | Parametrisierte RPCs, kein dynamisches SQL |
| Abhängigkeit kompromittiert | Lockfile, Review, Scanning, genaue Versionen |
| Manipuliertes Client Bundle | Server vertraut keiner Clientberechnung |
| Unbeabsichtigte öffentliche Sichtbarkeit | Private Defaults, keine öffentliche API oder Suche |
| Datenverlust | PITR, Restore Tests, Migrationsrollback |

### 15.3 Geheimnisse

* Lokale env Dateien werden nie committed.
* Secrets liegen in umgebungsspezifischen Secret Stores.
* CI Logs dürfen Secrets nicht ausgeben.
* GitHub Secret Scanning und Push Protection sind aktiv.
* Drittanbieteraktionen in CI werden auf vollständige Commit SHAs fixiert.
* Schlüssel besitzen dokumentierten Eigentümer, Zweck, Rotationszeitpunkt und Widerrufsverfahren.
* Eine vierteljährliche Rotation wird geübt; sofortige Rotation folgt jedem Verdacht.

### 15.4 Transport und Netzwerk

* Ausschließlich HTTPS mit moderner TLS Konfiguration.
* Keine Klartextausnahmen in iOS ATS oder Android Network Security Config.
* Öffentliche Website setzt HSTS, Content Security Policy, Referrer Policy und Frame Schutz.
* Auth Redirects erlauben nur explizit registrierte App und HTTPS Ziele.
* Zertifikat Pinning ist in Version 1 nicht zwingend, weil fehlerhafte Rotation die App aussperren kann. Eine Einführung setzt einen getesteten Mehrschlüssel- und Notfallplan voraus.

### 15.5 Mobile Härtung

* Auth Tokens nur in SecureStore.
* Sensible Daten nicht in AsyncStorage, Clipboard, Screenshots, Crash Breadcrumbs oder Push Payloads.
* App Switcher Vorschau wird bei sichtbaren sensiblen Detailansichten optional verdeckt.
* Debug Menüs, Testkonten und Entwicklungsendpunkte fehlen in Release Builds.
* Android Backupregeln und iOS Dateischutz werden explizit geprüft.
* SQLCipher Schlüssel wird nie hardcodiert.
* Bei Root oder Jailbreak wird nicht pauschal ausgesperrt, aber ein Risikohinweis kann angezeigt werden. Serverseitige Sicherheit darf nie vom Gerätezustand abhängen.
* Release Builds sind signiert, reproduzierbar zuordenbar und besitzen Symbol- beziehungsweise Sourcemap Upload für Fehleranalyse.

### 15.6 Missbrauch von Zählwerten

Ranglisten beruhen auf Vertrauen. Das Backend begrenzt einzelne Beträge und Frequenz, versucht aber nicht, spirituelle Handlungen zu verifizieren. Ein ungewöhnlich hoher Wert darf nicht automatisch öffentlich gebrandmarkt werden. Gruppeninhaber können Mitglieder entfernen; Mitglieder können melden und blockieren.

### 15.7 Sicherheitsereignisse

Es existiert ein Runbook für:

1. Verdächtiger Zugriff auf Daten
2. Geleakter Schlüssel
3. Missbrauch von Einladungen
4. Kontoübernahme
5. Fehlerhafte RLS Policy
6. Schadhafte App Version
7. Datenbankverlust
8. Datenschutzverletzung

Das Runbook enthält Zuständigkeit, Eindämmung, Beweissicherung, Rotation, Nutzerinformation, Behördenprüfung und Nachbereitung.

## 16. Datenschutz und Recht

### 16.1 Datenklassifikation

Mit einer identifizierbaren Person verknüpfte Salawat Werte können religiöse Überzeugungen offenbaren. Sie werden vorsorglich als besondere Kategorie personenbezogener Daten gemäß Artikel 9 DSGVO behandelt.

Verarbeitungszwecke:

* Persönliche Erfassung und Auswertung
* Vom Mitglied ausdrücklich bestätigte aggregierte Teilung in privaten Gruppen
* Technisch notwendige Sicherung, Fehlerbehebung und Missbrauchsprävention

Die Daten dürfen nicht für Werbung, Profiling, Verkauf, Kreditwürdigkeit, Beschäftigungsentscheidungen oder Training allgemeiner KI Modelle genutzt werden.

### 16.2 Rechtsgrundlage

Vor EU Veröffentlichung muss qualifizierte Rechtsberatung die konkrete Kombination bestätigen. Die Spezifikation geht vorsorglich aus von:

* Artikel 6 Absatz 1 Buchstabe b DSGVO für die zur Vertragserfüllung nötigen Kontodienste, soweit anwendbar
* Expliziter Einwilligung gemäß Artikel 9 Absatz 2 Buchstabe a für Salawat Daten
* Getrennter ausdrücklicher Bestätigung bei jedem Gruppenbeitritt für die Sichtbarkeit aggregierter Werte

Einwilligung ist nicht vorausgewählt, klar bezeichnet, versioniert und ebenso leicht widerrufbar wie erteilbar.

### 16.3 Privacy by Design

* Private Gruppen als Standard
* Keine öffentliche Suche
* Kein Kontaktezugriff
* Keine E Mail Sichtbarkeit
* Keine Eintragshistorie für Gruppenmitglieder
* Keine Drittanbieter Werbe- oder Verhaltensanalyse
* Generischer Notification Text
* Verschlüsselter lokaler Cache
* EU Datenregion
* Minimale Logs
* Kurze Token- und Logaufbewahrung
* Kein Session Replay
* Keine echten Produktionsdaten in Tests

### 16.4 Transparenz

Datenschutzerklärung und Einwilligungsansicht erklären mindestens:

* Verantwortlichen und Kontakt
* Welche Daten verarbeitet werden
* Warum und auf welcher Grundlage
* Dass Gruppenmitglieder Anzeigename und aggregierte Werte sehen
* Empfänger und Auftragsverarbeiter
* Datenregion und mögliche Drittlandtransfers
* Speicherdauer
* Betroffenenrechte
* Widerruf
* Kontolöschung
* Beschwerderecht
* Ob eine Datenschutzbeauftragte Person bestellt ist

### 16.5 Betroffenenrechte

In der App müssen erreichbar sein:

* Auskunft über gespeicherte Daten
* Maschinenlesbarer Export
* Berichtigung über Bearbeiten
* Löschung einzelner Einträge
* Vollständige Kontolöschung
* Widerruf der Gruppenfreigabe durch Verlassen
* Widerruf der Kernverarbeitung
* Kontakt für Einschränkung, Widerspruch und Beschwerden

Supportanfragen erhalten eine Ticket ID und werden innerhalb gesetzlicher Fristen bearbeitet.

### 16.6 Aufbewahrung

| Datenart | Aufbewahrung |
|---|---|
| Aktive Einträge | Bis Nutzerlöschung |
| Gelöschte Einträge | Sofort aus aktiver DB, danach nur bis Backup Rotation |
| Abgelaufene Einladungen | Automatische Löschung spätestens 30 Tage nach Ablauf |
| Auth Sicherheitslogs | Nach dokumentierter Notwendigkeit, Ziel höchstens 30 Tage |
| Anwendungslogs | Ziel 14 Tage, ohne Salawat Werte |
| Crashdaten | Ziel 30 Tage, ohne direkte Identität |
| Offene Moderationsfälle | Bis Abschluss |
| Abgeschlossene Moderationsfälle | Ziel 180 Tage, danach löschen oder anonymisieren |
| Temporärer Export | Höchstens 24 Stunden |
| Lokaler Cache | Bis Abmeldung, Kontolöschung oder Neuinstallation |

Konkrete Fristen werden in einem Löschkonzept dokumentiert und technisch automatisiert. Backups werden nicht für normale Nutzung wieder zugänglich gemacht und rotieren nach festgelegter Frist.

### 16.7 Datenschutz Folgenabschätzung

Vor öffentlichem Launch wird dokumentiert geprüft, ob eine Datenschutz Folgenabschätzung erforderlich ist. Wegen potenziell besonderer Datenkategorien, Gruppenfreigabe und möglicher Skalierung soll sie vorsorglich durchgeführt werden, auch wenn die gesetzliche Schwelle im Einzelfall noch geprüft werden muss.

### 16.8 Verträge und Verzeichnis

Vor Produktion müssen vorliegen:

* Verzeichnis der Verarbeitungstätigkeiten
* Auftragsverarbeitungsverträge mit Hosting, SMTP, Monitoring und Support
* Prüfung von Unterauftragsverarbeitern
* Transfer Impact Assessment, wenn Drittlandtransfer besteht
* Technische und organisatorische Maßnahmen
* Löschkonzept
* Berechtigungskonzept
* Incident und Breach Prozess
* Datenschutz Folgenabschätzung oder begründete Nichtnotwendigkeit

### 16.9 Store und deutsche Pflichtseiten

* In App Kontolöschung
* Externer Webweg für Kontolöschung
* Korrekte Apple Privacy Angaben
* Korrekte Google Play Data Safety Angaben
* Datenschutzerklärung
* Nutzungsbedingungen und Community Regeln
* Leicht erreichbarer Support
* Prüfung eines Impressums gemäß DDG
* Prüfung der Pflichten aus dem Digital Services Act
* Altersgrenze 16 Jahre für den EU Start, solange kein spezielles Minderjährigenkonzept umgesetzt ist

Diese Spezifikation ist keine Rechtsberatung. Store Formulare und Rechtslage sind unmittelbar vor Veröffentlichung erneut professionell zu prüfen.

## 17. Community Sicherheit und Moderation

Obwohl die App weder öffentlichen Feed noch Chat besitzt, sind Anzeigenamen und Gruppennamen nutzergenerierte Inhalte. Deshalb gelten die Moderationsanforderungen der App Stores.

### 17.1 Vorbeugung

* Nutzungsbedingungen und Community Regeln werden vor dem ersten Erstellen einer Gruppe akzeptiert.
* Namen werden serverseitig normalisiert und gegen eine lokal betriebene, versionierte mehrsprachige Verbotsliste geprüft.
* Leetspeak, übermäßige Trennzeichen, unsichtbare Zeichen und Unicode Täuschungen werden soweit verhältnismäßig erkannt.
* Namen mit URLs oder Kontaktwerbung sind nicht erlaubt.
* Die App minimiert freien Text. Nur Meldungsdetails erlauben begrenzten Freitext.

Ein automatischer Filter ist nie alleinige Moderation. Falsch positive Ablehnungen müssen über Support prüfbar sein.

### 17.2 Melden

Jede Gruppen- und Mitgliederansicht besitzt eine klar auffindbare Aktion **Melden**. Kategorien sind fest vorgegeben, Details optional. Nach Absenden erhält die Person eine Ticket ID und kann den Status sehen.

Meldungen müssen intern priorisiert werden:

| Priorität | Beispiel | Zielreaktion |
|---|---|---|
| Sofort | Konkrete Drohung oder illegale Inhalte | Unmittelbare Prüfung |
| Hoch | Hassname, gezielte Belästigung | Innerhalb 24 Stunden |
| Normal | Spam, Identitätsvortäuschung | Innerhalb 72 Stunden |

### 17.3 Blockieren

Blockieren ist direkt am Mitglied möglich und benötigt keine Begründung.

* Blockierte Konten sind gegenseitig in Ranglistenergebnissen verborgen.
* Eine blockierte Person kann keine wirksame direkte Einladung an die blockierende Person erzeugen.
* Besteht eine gemeinsame Gruppe, erklärt die App, dass beide weiterhin Gruppenmitglieder sind, aber gegenseitig ausgeblendet werden.
* Ist der Gruppeninhaber betroffen, bietet die App zusätzlich **Gruppe verlassen** an.
* Entblockieren ist in Einstellungen möglich.

### 17.4 Moderationsoberfläche

Die interne Oberfläche besitzt:

* MFA und rollenbasierte Rechte
* Warteschlange nach Priorität und Alter
* Minimalansicht des gemeldeten Namens und Kontextes
* Aktionen Verwarnen, Name zurücksetzen, Gruppe suspendieren, Konto suspendieren, Ablehnen
* Interne Notiz
* Audit Trail
* Vier Augen Freigabe für dauerhafte Kontosperre
* Keine Standardansicht persönlicher Salawat Werte

### 17.5 Einspruch

Eine suspendierte Person erhält eine neutrale Erklärung, die Regelkategorie und einen Supportweg für Einspruch. Interne Sicherheitsdetails oder Identität der meldenden Person werden nicht offengelegt.

## 18. Zuverlässigkeit, Performance und Beobachtbarkeit

### 18.1 Serviceziele

Diese Werte sind interne Ziele, keine öffentliche Garantie:

| Kennzahl | Ziel |
|---|---:|
| Monatliche Verfügbarkeit der Kern API | 99,9 Prozent |
| Crashfreie Mobile Sitzungen | mindestens 99,8 Prozent |
| Erfolgreiche Entry Synchronisation nach Netzrückkehr | mindestens 99,5 Prozent |
| P95 get_home_summary in EU | unter 500 ms |
| P95 create_entry in EU | unter 800 ms |
| P95 Rangliste mit 500 Mitgliedern | unter 1.000 ms |
| Datenbankfehlerquote Kernmutationen | unter 0,1 Prozent |
| RPO Produktion mit PITR | höchstens 15 Minuten |
| RTO Ziel | höchstens 4 Stunden |

Externe Anbietergrenzen müssen mit diesen Zielen kompatibel sein. Sind sie es nicht, werden Ziele angepasst oder der Tarif beziehungsweise Anbieter geändert, bevor sie öffentlich versprochen werden.

### 18.2 Datenbankperformance

* Jede Filterspalte in RLS Policies und Aggregationen wird indexiert.
* Querypläne für Home Summary, Verlauf und Rangliste werden mit realistischen Datenmengen geprüft.
* N plus 1 Requests in Gruppenlisten sind verboten.
* Home Summary wird in einem serverseitigen Aufruf berechnet.
* Ranglisten verwenden Aggregation und Window Function in der Datenbank.
* Eine Lastsimulation umfasst mindestens 100.000 Nutzer, 10 Millionen Einträge und Gruppen mit 500 Mitgliedern.
* Langsame Queries über dem festgelegten Schwellenwert erzeugen einen Alarm.

### 18.3 Logging

Erlaubte Felder:

* request_id
* Route oder RPC Name
* HTTP Status
* Dauer
* App Version und Plattform
* Umgebung
* Unspezifischer Fehlercode

Verbotene Felder:

* Salawat Betrag
* Gesamtwert oder Ranglistenwert
* E Mail
* Anzeigename oder Gruppenname
* Einladungslink, Token oder manueller Code
* JWT, Refresh Token oder OTP
* Meldungsdetails
* Vollständige Request- oder Responsebodies

Ein kurzlebiger pseudonymer technischer Akteur darf nur verwendet werden, wenn eine konkrete Betriebsnotwendigkeit dokumentiert ist.

### 18.4 Fehlerüberwachung

* Session Replay ist deaktiviert.
* Standard PII Versand ist deaktiviert.
* beforeSend Scrubbing entfernt Formulardaten, URLs mit Tokens und lokale Datenbankwerte.
* Sourcemaps und native Symbole werden pro Release hochgeladen.
* Fehler sind eindeutig Release, Plattform und Build zugeordnet.
* Ein Alarm entsteht bei neuem kritischem Fehler, steigender Fehlerrate, Auth Ausfall, Sync Ausfall und Datenbankverbindungsproblemen.

### 18.5 Betriebsmetriken

Metriken enthalten keine Salawat Werte:

* Requestzahl und Fehlerrate je Operation
* Latenz
* Queue Sync Erfolg und Konfliktrate
* Anzahl abgelaufener Hintergrundjobs
* Auth Zustellfehler
* Datenbankverbindungen und Speicher
* Backupstatus
* App Versionen

Verhaltensanalyse, Heatmaps, Werbe SDKs und geräteübergreifendes Tracking sind in Version 1 verboten.

### 18.6 Sicherungen

Produktion verwendet einen bezahlten Datenbanktarif mit automatischen Backups und Point in Time Recovery.

* Backupstatus wird täglich automatisch geprüft.
* Monatlich erfolgt eine Testwiederherstellung in isolierter Umgebung mit synthetischer Validierung.
* Vierteljährlich wird ein vollständiger Restore Runbook Test durchgeführt.
* Wiederhergestellte Produktionsdaten erhalten denselben Schutz und werden nach Test sicher gelöscht.
* Backupzugriff ist auf wenige Administratoren mit MFA begrenzt.
* RPO und RTO werden nach jeder Übung gemessen.

## 19. Teststrategie

### 19.1 Testpyramide

1. Viele deterministische Unit Tests
2. Datenbank- und Policy Tests mit pgTAP
3. Integrationsprüfungen gegen lokale Supabase Instanz
4. Mobile Komponententests
5. Wenige, aber vollständige End to End Abläufe
6. Manuelle Accessibility-, Sicherheits- und Store Tests

Tests verwenden ausschließlich synthetische Konten und Daten.

### 19.2 Unit Tests

Mindestens:

* Zahlenparser für alle erlaubten und unerlaubten Formate
* Tausenderformatierung für Deutsch und Englisch
* Persönliches Heute bei UTC minus 12 bis UTC plus 14
* Montagsermittlung an Jahres- und Monatsgrenzen
* Sommerzeitwechsel
* Zielversionsermittlung
* Zielerfolg x/y
* Zusammenführen lokaler Queue Operationen
* Exponentieller Backoff
* Konfliktzustände
* Deep Link Parsing
* Unicode Namensnormalisierung
* Fehlercode Mapping
* Große BIGINT Dezimalstrings

### 19.3 Datenbanktests

Migrationsprüfung:

* Lokale Datenbank lässt sich von null vollständig aufbauen.
* Jede Migration ist einmalig und deterministisch.
* Schema Diff nach Migration ist leer.
* Fremdschlüssel, Checks, eindeutige und partielle Indizes existieren.

RLS Prüfung:

* RLS ist für alle public Tabellen aktiv und erzwungen.
* Anonym kann nichts Fachliches lesen.
* Nutzer A kann nie Einträge, Ziele oder Einstellungen von Nutzer B lesen.
* Gemeinsame Gruppe erlaubt nur aggregierte RPC Ausgabe.
* Ehemalige Mitglieder verlieren sofort Zugriff.
* Inhaberrechte sind nicht auf normale Mitglieder übertragbar.
* Suspendierte Konten und Gruppen werden korrekt blockiert.

Fachlogik:

* Doppelte create_entry ID erzeugt keinen zweiten Datensatz.
* Falsche Revision verändert nichts.
* Zwei parallele Invite Annahmen respektieren max_uses.
* Eine Person verbraucht eine Einladung nur einmal.
* Gruppe und Inhabermitgliedschaft entstehen gemeinsam oder gar nicht.
* Eigentümertransfer ist atomar.
* Kontolöschung hinterlässt keinen verwaisten owner_user_id.
* Zieländerung verändert historische Zielversionen nicht.
* Rangliste zählt nichts vor joined_at.
* Wiedereintritt beginnt neu.
* Blockierte Konten werden gefiltert.

### 19.4 Mobile Komponententests

* Eingabefeld und Buttonzustände
* Dashboardkarten in allen Lade- und Fehlerzuständen
* Zielregler gekoppelt mit Zahleneingabe
* Verlauf mit Bearbeiten, Löschen und Pagination
* Leere Gruppenliste
* Rangliste mit Gleichständen und eigenem Rang
* Einladungsbestätigung
* Notification Permission Zustände
* Große Schrift und lange Übersetzungen
* Dark Mode
* Offlinebanner und Pending Kennzeichnung

### 19.5 End to End Szenarien

#### E2E 01 Anmeldung und erster Eintrag

1. Neue E Mail
2. OTP
3. Profil
4. Einwilligung
5. 100 eintragen
6. Heute, Woche und Gesamt zeigen 100
7. Verlauf zeigt genau einen Eintrag

#### E2E 02 Mehrere Einträge, Bearbeiten und Löschen

1. 100 und 200 eintragen
2. Summe zeigt 300
3. 100 auf 150 bearbeiten
4. Summe zeigt 350
5. 200 löschen
6. Summe zeigt 150
7. Neustart erhält Zustand

#### E2E 03 Offline und Idempotenz

1. Netzwerk ausschalten
2. 500 eintragen
3. Pending Zustand sehen
4. App beenden und starten
5. 500 bleibt sichtbar
6. Netzwerk einschalten
7. Synchronisation abwarten
8. Backend enthält genau einen 500 Eintrag

#### E2E 04 Konflikt zwischen Geräten

1. Derselbe Eintrag auf Gerät A und B laden
2. A ändert auf 300
3. B versucht 400 mit alter Revision
4. Kein stilles Überschreiben
5. Konfliktdialog zeigt 300 und 400

#### E2E 05 Zielhistorie

1. Ziel 100 setzen
2. 100 erfassen
3. Zielerfolg 1/1
4. Folgetag Ziel auf 200 ändern
5. Historischer Tag bleibt Ziel 100

#### E2E 06 Gruppe und Einladung

1. Konto A erstellt Gruppe
2. A erzeugt Einladung
3. Konto B öffnet Link
4. B sieht Teilungshinweis und bestätigt
5. B erscheint mit 0
6. B trägt 250 ein
7. Beide sehen denselben Ranglistenwert
8. Kein Konto sieht die E Mail des anderen

#### E2E 07 Mitgliedschaftsgrenze

1. B besitzt Einträge vor Beitritt
2. B tritt Gruppe bei
3. Vorherige Einträge zählen nicht
4. B verlässt Gruppe und verschwindet
5. B tritt neu bei
6. Nur neue Werte ab Wiedereintritt zählen

#### E2E 08 Gruppenverwaltung

1. Inhaber entfernt Mitglied
2. Mitglied verliert Zugriff
3. Inhaber überträgt Eigentum
4. Alter Inhaber kann verlassen
5. Neuer Inhaber löscht Gruppe
6. Persönliche Einträge bleiben bestehen

#### E2E 09 Erinnerung

1. Aktivieren
2. Berechtigung erlauben
3. Trigger existiert genau einmal
4. Uhrzeit ändern
5. Alter Trigger entfernt
6. Deaktivieren löscht Trigger
7. Ablehnung lässt App nutzbar

#### E2E 10 Datenrechte

1. Export anfordern
2. Datei enthält vollständige eigene Daten
3. Keine fremden Daten
4. Kontolöschung erneut verifizieren
5. Gruppenfolge bestätigen
6. Konto und aktive Daten verschwinden
7. Alte Sitzung kann nichts mehr lesen

#### E2E 11 Melden und Blockieren

1. Mitglied melden
2. Ticket ID erhalten
3. Mitglied blockieren
4. Gegenseitige Ranglistensicht ausgeblendet
5. Moderator bearbeitet Meldung
6. Meldende Person sieht nur Status

### 19.6 Accessibility Tests

* Vollständiger Kernablauf mit iOS VoiceOver
* Vollständiger Kernablauf mit Android TalkBack
* Größte dynamische Schrift
* Android Accessibility Scanner
* Google Play Pre Launch Accessibility Report
* Externe Tastatur, sofern vom Gerät unterstützt
* Kontrastprüfung aller Zustände
* Reduzierte Bewegung
* Farbsehschwächen Simulation

### 19.7 Sicherheitsprüfungen

* Statische Codeanalyse
* Dependency Review bei jedem Pull Request
* Secret Scan
* Mobile Binary Analyse
* RLS und IDOR Tests
* Auth Rate Limit Tests
* Invite Brute Force Test
* Manipulierte Deep Links
* Replay und Doppelrequest Tests
* SQL Injection Tests
* Sensible Daten in Logs, Screenshots, Backup und Clipboard
* Externer Penetrationstest vor öffentlicher Veröffentlichung

### 19.8 Performance Tests

* Home Summary bei 100.000 Einträgen eines Kontos
* Verlaufspagination bei parallelem Einfügen
* Rangliste mit 500 Mitgliedern und Millionen Einträgen
* 100 parallele Invite Annahmen am Restlimit
* 1.000 gleichzeitige create_entry Requests
* Kalter und warmer App Start
* Wiederanlauf einer Queue mit 10.000 lokalen Operationen

## 20. CI, Migrationen und Deployment

### 20.1 Pull Request Pipeline

Jeder Pull Request muss bestehen:

1. Installation aus unverändertem Lockfile
2. Formatprüfung
3. Lint
4. TypeScript strict Typecheck
5. Unit Tests mit Coverage Schwellen
6. Mobile Komponententests
7. Lokaler Supabase Reset
8. Alle Migrationen
9. pgTAP und RLS Tests
10. Edge Function Tests
11. Dependency Review
12. Secret Scan
13. Android und iOS Konfigurationsprüfung
14. Preview Build bei UI Änderungen

Kein direkter Push auf main. Mindestens eine Reviewperson bestätigt Code und Testauswirkung. Sicherheitskritische RLS-, Auth- und Löschänderungen benötigen eine zweite fachkundige Review.

### 20.2 Migrationsstrategie

* Schemaänderungen liegen ausschließlich als versionierte SQL Migrationen vor.
* Dashboard Klickänderungen ohne Migration sind in Produktion verboten.
* Migrationen sind vorwärtskompatibel mit der aktuell veröffentlichten und mindestens einer vorherigen App Version.
* Destruktive Änderungen verwenden Expand, Migrate, Contract über mehrere Releases.
* Spalten werden erst entfernt, wenn keine unterstützte App Version sie nutzt.
* Große Backfills laufen in begrenzten Batches.
* Vor risikoreicher Produktionsmigration wird PITR Zustand geprüft.
* Jede riskante Migration besitzt Rollback- oder Forward Fix Plan.

### 20.3 Deploymentreihenfolge

1. Release Candidate taggen
2. Vollständige CI ausführen
3. Datenbankmigration nach Staging
4. Edge Functions nach Staging
5. Mobile Staging Build
6. End to End und Smoke Tests
7. Manuelle Produkt-, Accessibility- und Datenschutzabnahme
8. Produktionsbackup und PITR prüfen
9. Rückwärtskompatible Datenbankmigration nach Produktion
10. Edge Functions nach Produktion
11. Synthetischen Produktions Smoke Test ausführen
12. Signierte App Builds erzeugen
13. TestFlight und Google Play Internal Testing
14. Store Metadaten und Datenschutzformulare prüfen
15. Gestaffelte Veröffentlichung
16. Metriken und Fehler beobachten

### 20.4 Gestaffelte Freigabe

* Interne Tester
* Geschlossene Beta
* 5 Prozent Produktion
* 25 Prozent
* 100 Prozent

Jede Stufe wartet mindestens einen sinnvollen Beobachtungszeitraum. Bei kritischem Fehler wird die Freigabe pausiert und zurückgerollt.

### 20.5 EAS Update

Over the Air Updates dürfen nur JavaScript und Assets ändern, die mit der im Binary enthaltenen nativen Laufzeit kompatibel sind.

* runtimeVersion folgt einer verbindlichen Policy.
* Native Modul-, Berechtigungs- oder Konfigurationsänderungen benötigen einen neuen Store Build.
* Updates werden erst in Preview und Staging geprüft.
* Produktionsupdates werden gestaffelt.
* Datenbankänderungen dürfen kein bereits installiertes Binary brechen.
* Kritischer OTA Fehler wird durch Rückveröffentlichung des letzten bekannten guten Updates zurückgenommen.
* Store Regeln für dynamisch gelieferte Inhalte werden eingehalten.

### 20.6 Rollback

Rollbackplan pro Ebene:

| Ebene | Maßnahme |
|---|---|
| Mobile Store Build | Veröffentlichung stoppen, vorherigen Build weiter anbieten, Hotfix bauen |
| OTA | Letztes bekannt gutes Update erneut ausrollen |
| Edge Function | Vorherige Version deployen |
| Datenbanklogik | Forward Fix oder getestete reversible Migration |
| Datenbankdaten | PITR nur bei tatsächlichem Datenverlust und nach Incident Freigabe |
| Feature | Serverseitiger Kill Switch in app_config |

Eine Datenbank darf nicht leichtfertig auf einen früheren Zeitpunkt zurückgesetzt werden, weil dadurch legitime neue Nutzerdaten verloren gehen können.

## 21. App Store Veröffentlichung

### 21.1 Technische Vorgaben mit Stand 29. August 2026

* Neue Google Play Apps und Updates müssen ab 31. August 2026 Android 16 beziehungsweise API 36 oder höher anvisieren.
* Apple Uploads müssen seit 28. April 2026 mit Xcode 26 oder neuer und dem iOS 26 SDK oder neuer gebaut sein.
* Expo SDK 57 erfüllt laut offizieller Referenz targetSdkVersion 36 und benötigt iOS 16.4 oder neuer.

Diese Werte ändern sich regelmäßig und werden am Tag des Release Candidate erneut geprüft.

### 21.2 Store Pflichtmaterial

* App Name und Untertitel
* Klare Beschreibung ohne unbelegte religiöse oder gesundheitliche Aussagen
* Screenshots für unterstützte Gerätegrößen und Sprachen
* App Icon und Launchscreen
* Support URL
* Datenschutz URL
* Kontolösch URL
* Altersfreigabe
* Apple Privacy Angaben
* Google Data Safety Formular
* Angaben zu nutzergenerierten Inhalten und Moderation
* Reviewtestkonto oder nachvollziehbarer OTP Testweg
* Reviewhinweise für Einladungen, Gruppen und Löschung

### 21.3 Account Löschung

Die Kontolöschung muss in der App initiierbar sein. Google Play verlangt zusätzlich eine Webressource zur Löschanforderung. Beide Wege müssen tatsächlich funktionieren und dürfen nicht nur zu einer allgemeinen Supportseite führen.

### 21.4 Notification Berechtigung

Die Berechtigung wird nicht beim ersten App Start angefordert. Sie folgt ausschließlich auf die aktive Entscheidung, eine Erinnerung einzuschalten. Ablehnung darf keine Funktionssperre erzeugen.

### 21.5 Privacy Manifests und SDK Prüfung

Vor jedem iOS Release werden alle Drittanbieter SDKs, Required Reason APIs, Signaturen und Privacy Manifests geprüft. Vor jedem Android Release wird die Data Safety Deklaration mit dem tatsächlichen SDK Verhalten abgeglichen.

## 22. Wartung und Support

### 22.1 Supportwege

In App und Website enthalten:

* Hilfeseite für Anmeldung, Einträge, Gruppen und Erinnerungen
* Supportformular oder E Mail
* Ticket ID
* Statusseite bei größeren Störungen
* Sicherheitskontakt
* Datenschutzkontakt

Support darf niemals nach OTP, Passwort, vollständigem Token oder Service Schlüssel fragen.

### 22.2 Regelmäßige Aufgaben

| Rhythmus | Aufgabe |
|---|---|
| Täglich | Alarme, Backupstatus, Auth Mailzustellung |
| Wöchentlich | Fehlertrends, offene Moderation, Abhängigkeiten |
| Monatlich | Restore Test, Berechtigungsreview, Löschjobs |
| Vierteljährlich | Incident Übung, Schlüsselrotation, Datenschutzreview |
| Halbjährlich | Threat Model, Penetrationstestumfang, Store Richtlinien |
| Jährlich | Vollständige DPIA-, Vertrags- und Architekturprüfung |

### 22.3 Versionssupport

Die aktuelle und die zwei vorherigen App Hauptversionen sollen unterstützt werden, sofern keine Sicherheitslücke eine frühere Abschaltung erzwingt. Ein erzwungenes Update ist nur zulässig, wenn alte Versionen Datenschutz, Sicherheit oder Datenintegrität gefährden.

## 23. Definition of Done und Release Gates

Die App darf öffentlich veröffentlicht werden, wenn alle folgenden Punkte erfüllt sind.

### 23.1 Produkt

* [ ] Alle P0 Funktionen sind implementiert.
* [ ] Kein Platzhalter, TODO Ablauf oder Mock Backend ist erreichbar.
* [ ] Alle Formeln entsprechen Abschnitt 8.
* [ ] Leere, Offline-, Fehler- und Konfliktzustände sind vollständig.
* [ ] Deutsche und englische Texte sind lektoriert.
* [ ] Keine Funktion außerhalb Scope verwässert die Hauptaktion.

### 23.2 Backend

* [ ] Produktion kann aus Migrationen reproduziert werden.
* [ ] Alle public Tabellen haben erzwungene RLS.
* [ ] Direkte Grants sind minimal.
* [ ] Alle RPCs prüfen auth.uid und Eingaben.
* [ ] Invite Annahme und Eigentümertransfer sind atomar.
* [ ] Idempotenz- und Revisionstests bestehen.
* [ ] Kontoexport ist vollständig.
* [ ] Kontolöschung ist vollständig und erneut authentifiziert.
* [ ] Keine Service Role liegt im Client.

### 23.3 Qualität

* [ ] Alle Unit-, Komponenten-, Datenbank-, Integrations- und E2E Tests sind grün.
* [ ] Kein flakiger P0 Test ist ignoriert.
* [ ] Performanceziele sind mit realistischen Daten geprüft.
* [ ] Offline Neustart und spätere Synchronisation sind auf echten Geräten geprüft.
* [ ] iOS und Android Gerätematrix ist bestanden.
* [ ] VoiceOver, TalkBack und große Schrift sind bestanden.

### 23.4 Sicherheit

* [ ] Threat Model ist aktuell.
* [ ] Keine offene kritische oder hohe Schwachstelle.
* [ ] Mittlere Schwachstellen besitzen akzeptierte Frist und Verantwortlichen.
* [ ] Externer Penetrationstest ist abgeschlossen.
* [ ] Geheimnis-, Dependency- und Binary Scan sind bestanden.
* [ ] Logs und Crashreports wurden auf sensible Daten geprüft.
* [ ] Restore und Incident Runbooks wurden geübt.

### 23.5 Datenschutz und Recht

* [ ] Rechtsgrundlage und Einwilligung sind juristisch geprüft.
* [ ] DPIA ist durchgeführt oder Nichtnotwendigkeit dokumentiert.
* [ ] Datenschutzerklärung, Bedingungen, Community Regeln und Impressum sind veröffentlicht.
* [ ] Auftragsverarbeitungsverträge sind geschlossen.
* [ ] Verzeichnis und Löschkonzept sind vorhanden.
* [ ] Apple Privacy und Google Data Safety entsprechen exakt der App.
* [ ] In App und Web Kontolöschung funktionieren.
* [ ] Moderations- und Blockierabläufe erfüllen Store Anforderungen.

### 23.6 Betrieb

* [ ] Produktionsmonitoring und Alarme sind aktiv.
* [ ] PITR und Backups sind aktiv.
* [ ] Restore Test ist bestanden.
* [ ] Staging und Produktion sind getrennt.
* [ ] Rollback ist dokumentiert und getestet.
* [ ] Support und Sicherheitskontakt sind besetzt.
* [ ] Gestaffelter Release ist konfiguriert.

## 24. Empfohlene Umsetzungsreihenfolge

### Phase 1: Fundament

* Monorepo, CI, Expo App und lokale Supabase Umgebung
* Auth, Profile, Einwilligung und sichere Sitzung
* Datenbankschemata, RLS und erste Policy Tests
* Design Tokens, Navigation und Internationalisierung

### Phase 2: Persönlicher Kern

* Einträge, Home Summary und Verlauf
* Zielversionen und exakte Berechnungen
* Bearbeiten, Löschen, Cursor Pagination
* Verschlüsselte SQLite Datenbank
* Offline Queue, Idempotenz und Konflikte

### Phase 3: Gruppen

* Gruppe erstellen und listen
* Sichere Einladungen und Universal Links
* Mitgliedschaften und Rangliste
* Eigentümeraktionen
* Melden, Blockieren und Moderationsoberfläche

### Phase 4: Betrieb und Rechte

* Lokale Erinnerung
* Export und Kontolöschung
* Rechtswebsite
* Monitoring, Backups und Runbooks
* Last-, Accessibility- und Sicherheitstests

### Phase 5: Veröffentlichung

* Geschlossene Beta
* Fehlerbehebung
* Datenschutz- und Rechtsfreigabe
* Store Unterlagen
* Gestaffelte Produktion

Eine Phase gilt erst als abgeschlossen, wenn ihre Tests und Dokumentation im selben Pull Request beziehungsweise Release enthalten sind.

## 25. Vollständige Abnahmematrix

| Anforderung | Backendbeleg | Clientbeleg | Testbeleg |
|---|---|---|---|
| Genau ein Eintrag je Submit | UUID und idempotente RPC | Button Sperre und Queue | E2E 01, 03 |
| Mehrere Einträge pro Tag | Kein Tages Unique Constraint | Verlauf zeigt einzelne Zeilen | E2E 02 |
| Konsistente Summen | get_home_summary | Eine lokale Projektion | Unit und E2E 02 |
| Historische Ziele | Zielversionen | Ziel UI | E2E 05 |
| Private Gruppen | RLS und RPC | Keine Entdecken Ansicht | RLS Tests |
| Keine rückwirkende Teilung | joined_at Filter | Beitrittshinweis | E2E 07 |
| Sichere Einladung | Hash, Ablauf, Limit | Universal Link und Code | Invite Paralleltest |
| Private Rangliste | Aggregations RPC | Nur Name und Summe | E2E 06 |
| Offlinefähig | Idempotenz und Revision | SQLCipher Queue | E2E 03, 04 |
| Tägliche Erinnerung | Kein Pushbackend nötig | Lokaler Trigger | E2E 09 |
| Löschen und Export | Privilegierte Functions | Datenschutzansicht | E2E 10 |
| Melden und Blockieren | Reports und Blocks | Sichtbare Aktionen | E2E 11 |
| Barrierefrei | Nicht anwendbar | Semantik und Layout | Abschnitt 19.6 |
| Deploybar | Migrationen und Umgebungen | Signierte Builds | Release Gates |

## 26. Offizielle Recherchebasis

Die folgenden Quellen begründen die wesentlichen Architektur-, Sicherheits-, Datenschutz-, Accessibility- und Storeentscheidungen. Der technische Stand ist auf das Dokumentdatum bezogen.

### Datenschutz und Recht

1. [DSGVO, insbesondere Artikel 5, 9, 25, 32 und 35](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)
2. [EDPB Hinweise zur rechtmäßigen Verarbeitung sensibler Daten](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en)
3. [EDPB Leitlinien zu Privacy by Design und Privacy by Default](https://www.edpb.europa.eu/documents/guideline/guidelines-42019-on-article-25-data-protection-by-design-and-by-default_en)
4. [BfDI Informationen zur Datenschutz Folgenabschätzung](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Technik/Datenschutz-Folgenabschaetzungen.html)
5. [Digitale Dienste Gesetz, Paragraf 5](https://www.gesetze-im-internet.de/ddg/__5.html)
6. [Digital Services Act](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng)

### App Store Regeln

7. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
8. [Apple Anforderungen zur Kontolöschung](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
9. [Apple App Privacy Angaben](https://developer.apple.com/app-store/app-privacy-details/)
10. [Google Play Anforderungen zur Kontolöschung](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-GB)
11. [Google Play Richtlinie zu nutzergenerierten Inhalten](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en-GB)
12. [Google Play Target API Anforderungen](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-GB)
13. [Apple aktuelle SDK Mindestanforderungen](https://developer.apple.com/news/upcoming-requirements/)

### Mobile UX und Accessibility

14. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
15. [Apple Human Interface Guidelines zu Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
16. [Android Accessibility und Touchziele](https://developer.android.com/guide/topics/ui/accessibility/apps)
17. [React Native Accessibility API](https://reactnative.dev/docs/accessibility)
18. [Apple Notifications Leitlinien](https://developer.apple.com/design/human-interface-guidelines/notifications)
19. [Android Notification Berechtigung](https://developer.android.com/develop/ui/compose/notifications/notification-permission)

### Mobile Technik

20. [Expo SDK Referenz und Plattformversionen](https://docs.expo.dev/versions/latest/)
21. [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
22. [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
23. [Expo SQLite und SQLCipher](https://docs.expo.dev/versions/latest/sdk/sqlite/)
24. [Expo Universal Links](https://docs.expo.dev/linking/ios-universal-links/)
25. [Expo Android App Links](https://docs.expo.dev/linking/android-app-links/)
26. [Expo Runtime Versions und Updatekompatibilität](https://docs.expo.dev/eas-update/runtime-versions/)
27. [Expo EAS Build](https://docs.expo.dev/build/introduction/)

### Backend und Sicherheit

28. [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
29. [Supabase Auth](https://supabase.com/docs/guides/auth)
30. [Supabase Passwordless E Mail Login](https://supabase.com/docs/guides/auth/auth-email-passwordless)
31. [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)
32. [Supabase Produktionscheckliste](https://supabase.com/docs/guides/deployment/going-into-prod)
33. [Supabase Datenbanktests mit pgTAP](https://supabase.com/docs/guides/database/testing)
34. [Supabase Backups und Point in Time Recovery](https://supabase.com/docs/guides/platform/backups)
35. [OWASP Mobile Application Security Verification Standard](https://mas.owasp.org/MASVS/)
36. [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
37. [OWASP Empfehlungen für zufällige, zeitbegrenzte Einmaltokens](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
38. [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
39. [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
40. [GitHub Actions sichere Nutzung](https://docs.github.com/en/actions/reference/security/secure-use)

## 27. Abschließende Produktentscheidung

Die App bleibt absichtlich klein. Ein vollständiges Produkt bedeutet hier nicht möglichst viele Funktionen, sondern dass die wenigen versprochenen Funktionen unter realen Bedingungen zuverlässig sind:

* Eintragen dauert Sekunden.
* Keine Eingabe geht durch Offlinezustand oder Timeout verloren.
* Keine doppelte Eingabe entsteht durch Wiederholung.
* Persönliche Daten bleiben persönlich.
* Gruppen zeigen genau die vereinbarten Aggregate.
* Erinnerungen respektieren die Entscheidung des Nutzers.
* Bearbeiten und Löschen wirken überall konsistent.
* Kontolöschung und Export sind echte, getestete Abläufe.
* Deployment, Monitoring, Wiederherstellung und Rollback sind vor Launch vorhanden.

Erst wenn diese Punkte durch Tests und Release Gates nachgewiesen sind, ist die App ein stabiles End to End Produkt und nicht nur ein funktionierender Prototyp.
