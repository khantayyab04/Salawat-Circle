# Modern Mobile UI & UX Research

**Status:** produktunabhängige Research- und Entscheidungsreferenz
**Recherchestand:** 2. September 2026
**Ziel:** Mobile Apps für iOS und Android fachlich beurteilen, neu gestalten oder substanziell verbessern
**Geltungsbereich:** Consumer- und Prosumer-Apps; für regulierte, sicherheitskritische, industrielle oder hoch spezialisierte Produkte sind zusätzliche Domänenstandards erforderlich

> Dieses Dokument ist kein Baukasten, dessen gesamter Inhalt implementiert werden soll. Es ist ein Wissenspool. Produktziel, Zielgruppe, Nutzungskontext, Plattformkonventionen, Accessibility, bestehende Businesslogik und reale Nutzungsdaten haben Vorrang vor allgemeinen Defaults und visuellen Trends.

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Quick Reference](#2-quick-reference)
3. [Research-Methode und Evidenz](#3-research-methode-und-evidenz)
4. [Fundamentale UX-Prinzipien](#4-fundamentale-ux-prinzipien)
5. [Mobile UX Hygiene](#5-mobile-ux-hygiene)
6. [Informationsarchitektur und Navigation](#6-informationsarchitektur-und-navigation)
7. [Layout, Screen-Architektur und Spacing](#7-layout-screen-architektur-und-spacing)
8. [Visuelles System](#8-visuelles-system)
9. [Komponenten und Aktionen](#9-komponenten-und-aktionen)
10. [Formulare, Auswahl, Datum und Zeit](#10-formulare-auswahl-datum-und-zeit)
11. [Search, Filter und Sortierung](#11-search-filter-und-sortierung)
12. [Sheets, Modals und Dialoge](#12-sheets-modals-und-dialoge)
13. [Onboarding, Authentication, Permissions und Settings](#13-onboarding-authentication-permissions-und-settings)
14. [Empty, Loading, Error und Feedback States](#14-empty-loading-error-und-feedback-states)
15. [Motion, Gesten und Haptics](#15-motion-gesten-und-haptics)
16. [Content Design und Informationsreduktion](#16-content-design-und-informationsreduktion)
17. [Dashboards und Datenvisualisierung](#17-dashboards-und-datenvisualisierung)
18. [Accessibility, Dark Mode und adaptive Layouts](#18-accessibility-dark-mode-und-adaptive-layouts)
19. [iOS und Android](#19-ios-und-android)
20. [Design System und Komponentenbibliothek](#20-design-system-und-komponentenbibliothek)
21. [Benchmark moderner Apps](#21-benchmark-moderner-apps)
22. [Aktuelle Trends 2024–2026](#22-aktuelle-trends-20242026)
23. [AI App UX](#23-ai-app-ux)
24. [No-Gos und Anti-Patterns](#24-no-gos-und-anti-patterns)
25. [Entscheidungsregeln für AI Coding Agents](#25-entscheidungsregeln-für-ai-coding-agents)
26. [Framework für Redesign und Review](#26-framework-für-redesign-und-review)
27. [Priorisierung von Verbesserungen](#27-priorisierung-von-verbesserungen)
28. [Recommended Modern Mobile Defaults](#28-recommended-modern-mobile-defaults)
29. [Screen Design Checklist](#29-screen-design-checklist)
30. [App-wide Checklist](#30-app-wide-checklist)
31. [Kontextabhängige Anwendung](#31-kontextabhängige-anwendung)
32. [How AI Coding Agents Should Use This Document](#32-how-ai-coding-agents-should-use-this-document)
33. [Quellenverzeichnis](#33-quellenverzeichnis)

---

## 1. Executive Summary

Moderne Mobile UX entsteht primär nicht durch Glass, Gradients, Bento-Grids oder große Rundungen. Sie entsteht durch **klare Priorisierung, unmittelbare Reaktion, verlässliche Zustände, plattformgerechtes Verhalten, zugängliche Interaktion und konsequente Reduktion unnötiger Arbeit**. Nutzer erleben eine App als hochwertig, wenn sie schnell verstehen, was sie hier tun können, nach jeder Aktion wissen, was passiert ist, Fehler ohne Angst korrigieren können und sich das System auch bei schlechtem Netz, großer Schrift oder langen Inhalten stabil verhält.

Die wichtigsten Erkenntnisse:

- **Ein Screen braucht eine dominante Aufgabe.** Sekundäre Informationen und seltene Aktionen dürfen existieren, sollen aber die Hauptaufgabe nicht visuell oder kognitiv verdrängen.
- **Minimalismus ist minimale unnötige Komplexität, nicht minimale Information.** Komplexe Arbeit darf informationsreich sein. Sie braucht bessere Gruppierung, progressive Offenlegung, Suche, Filter und Detail-on-demand.
- **Hygiene schlägt Dekoration.** Touch Targets, Back-Verhalten, Safe Areas, Keyboard Avoidance, Fokus, Screen Reader, dynamische Schrift, Offline-/Fehlerzustände und responsive Layouts sind Definition of Done, keine Premium-Features.
- **Plattformkonventionen sind ein Effizienzgewinn.** Systemkomponenten bringen bekannte Semantik, Accessibility, Textskalierung, Gesten und Zustände mit. Branding soll Farbe, Typografie, Inhalt und ausgewählte Formen prägen, nicht das erwartete Verhalten von Navigation, Back, Pickern oder Permissions brechen. Apple betont Hierarchie, Harmonie und Konsistenz; Android empfiehlt bekannte Layout-/Navigationspaare und adaptive Komponenten.[S01][S17]
- **Berührbare Fläche ist wichtiger als sichtbare Größe.** Als produktiver Standard gelten mindestens 44 × 44 pt auf iOS und 48 × 48 dp auf Android. WCAG 2.2 AA fordert für Pointer mindestens 24 × 24 CSS px oder ausreichenden Abstand; das ist eine Konformitätsschwelle für Web/Hybrid, kein guter Mobile-App-Zielwert.[S02][S19][S27]
- **Listen sind der Default für homogene, scanbare Daten.** Cards sind sinnvoll, wenn ein Element als eigenständiges Objekt, Vorschau-Container oder handlungsfähige Einheit verstanden werden soll. Container ohne eigenen Zweck erzeugen visuelles Rauschen.
- **Feedback muss zur Reichweite der Wirkung passen.** Feldfehler gehören ans Feld, Prozessfehler in den Prozess, globale Zustände in Banner oder Statusbereiche. Toasts dürfen keine kritischen, dauerhaften oder handlungsnotwendigen Informationen tragen.[S33]
- **Wartezeit braucht ehrliche Kommunikation.** Sofortige Pressed States, optimistic UI bei sicher rückrollbaren Aktionen, strukturtreue Skeletons, determinate Progress bei messbaren Vorgängen und Hintergrundfortsetzung bei langen Tasks erzeugen wahrgenommene Geschwindigkeit.
- **Accessibility wird in Architektur und Komponenten eingebaut.** Kontrast, Semantik, Fokusreihenfolge, skalierbarer Text, Reduced Motion und alternative Informationskanäle müssen in Tokens, Komponenten-APIs und Tests verankert sein.[S02][S25]
- **Aktuelle visuelle Systeme sind expressiver, aber kontrolliert.** Apples Liquid Glass ist als funktionale Ebene für Controls und Navigation gedacht, ausdrücklich nicht als allgegenwärtige Content-Oberfläche. Material 3 Expressive erweitert Farbe, Form, Typografie und Motion, ist aber ein Werkzeugkasten statt einer Pflichtästhetik.[S06][S16]
- **AI benötigt Unsicherheits-UX.** Fähigkeiten und Grenzen, laufender Status, Quellen, editierbare Eingaben, Abbruch, Retry, Undo und menschliche Kontrolle sind wichtiger als eine Chat-Blase. AI soll nur eingebaut werden, wenn sie einen konkreten Job besser erfüllt.[S12][S45]
- **Designqualität ist zustandsübergreifend.** Ein Komponenten-Screenshot im Default State beweist wenig. Entscheidend sind pressed, focused, selected, disabled, loading, error, success, empty, offline, große Schrift, lange Übersetzung, Dark Mode und kleine/weite Fenster.

### Was „modern“ tatsächlich bedeutet

| Dauerhafte Ursache | Oberflächlicher Stellvertreter |
|---|---|
| schnelle, vorhersehbare Reaktion | auffällige Animation |
| klare Hierarchie | große Headline |
| geringe unnötige Dichte | viel ungenutzter Raum |
| native und zugängliche Controls | optische Plattformkopie |
| kohärente Tokens und Zustände | überall gleiche Rundung |
| kontextuelle Aktionen | schwebende Buttons ohne Kontext |
| gute Content-Priorisierung | Cards um jeden Textblock |
| robuste Offline-/Fehler-UX | perfekte Happy-Path-Mockups |

---

## 2. Quick Reference

### 2.1 Evidenz-Kurzzeichen

- **[Fundamental]** langfristig etabliertes Wahrnehmungs- oder UX-Prinzip.
- **[Platform Standard]** durch aktuelle iOS-/Android-Konvention oder Systemverhalten geprägt.
- **[Strong Best Practice]** durch mehrere hochwertige Quellen, Forschung und breite Produktpraxis gestützt.
- **[Context Dependent]** nur nach Produkt-, Zielgruppen- und Task-Analyse anwenden.
- **[Current Trend]** 2024–2026 sichtbar verbreitet, aber nicht automatisch langlebig.
- **[Experimental]** noch nicht als allgemeiner Standard belastbar.

### 2.2 Zwölf Regeln vor jedem Detaildesign

1. **[Fundamental]** Benenne den primären User Job des Screens in einem Satz.
2. **[Strong Best Practice]** Zeige genau eine visuell dominante Primäraktion pro Zustand; gleichrangige Alternativen sind möglich, aber selten.
3. **[Platform Standard]** Nutze 44 pt (iOS) beziehungsweise 48 dp (Android) als Mindest-Touch-Target.[S02][S19]
4. **[Strong Best Practice]** Nutze 16–24 pt/dp horizontales Screen Padding als Startbereich; passe an Gerät, Dichte und Inhalt an.
5. **[Strong Best Practice]** Nutze Body-Text meist mit 16–17 pt/sp und skaliere mit Systemeinstellungen; kleine Hilfstexte sind kein Ort für wichtige Information.
6. **[Fundamental]** Farbe ist nie der einzige Bedeutungsträger; Status braucht zusätzlich Text, Form, Icon oder Position.
7. **[Strong Best Practice]** Liste für gleichartige Zeilen, Card für eigenständige Objekte, Grouped Section für zusammengehörige Einstellungen.
8. **[Fundamental]** Jede Aktion gibt sofort sichtbares Feedback und bleibt, wo möglich, rückgängig oder abbrechbar.
9. **[Platform Standard]** Essenzielle Funktionen dürfen nie nur über Long Press, Swipe oder andere unsichtbare Gesten erreichbar sein.
10. **[Strong Best Practice]** Entwirf Loading, Empty, Error, Offline und Permission-denied zusammen mit dem Default State.
11. **[Platform Standard]** Respektiere Safe Areas, System Bars, Keyboard, Back, Dynamic Type/Text Scaling und Reduced Motion.[S03][S18][S24]
12. **[Context Dependent]** Entferne kein Element wegen „Minimalismus“, bevor sein Nutzer- und Businesszweck verstanden ist.

### 2.3 Schnellwerte — Defaults, keine Gesetze

| Element | Solider Startwert | Hinweis |
|---|---:|---|
| Screen Padding kompakt | 16 pt/dp | 20–24 bei ruhigen Content-Screens |
| Basisspacing | 4 pt/dp | Hauptskala bevorzugt in 4er-Schritten, 2 nur optisch |
| Touch Target | 44 pt iOS / 48 dp Android | sichtbares Icon darf kleiner sein |
| Button/Input Höhe | 48–56 pt/dp | kompakter nur mit weiterhin großem Hit Area |
| Card Padding | 16–20 pt/dp | bei dichten Utility-Cards 12–16 |
| List Row | 48–64 pt/dp | Inhalt und Textskalierung bestimmen Höhe |
| Body | 16–17 pt/sp | 1.4–1.6 Line Height als Startbereich |
| Secondary Text | 14–15 pt/sp | ausreichend Kontrast; nicht für kritische Inhalte |
| Icons | 20–24 pt/dp | Navigation meist 24; Hit Area separat |
| Standard Radius | 12–16 pt/dp | verschachtelte Radien konzentrisch abstimmen |
| Press/State Motion | 80–150 ms | direkt, unterbrechbar |
| Component Transition | 160–250 ms | Distanz und Umfang berücksichtigen |
| Navigation/Sheet | 240–400 ms | Systembewegung bevorzugen |
| Bottom Navigation | 3–5 Ziele | nur Top-Level-Destinationen, mit Labels |

### 2.4 Auswahl eines Containers

| Wenn Inhalt … | Bevorzugt | Nicht automatisch |
|---|---|---|
| homogen und scanbar ist | Liste / Section | einzelne Card je Zeile |
| ein eigenständiges Objekt mit Vorschau ist | Card | mehrere verschachtelte Cards |
| eine Einstellung darstellt | Grouped List Row | Dashboard-Kachel |
| visuell exploriert wird | Grid / Media Card | Textliste |
| eine primäre Kennzahl plus Trend zeigt | kompakter KPI-Block | riesige Bento-Kachel |
| nur semantisch gruppiert werden muss | Überschrift + Whitespace | Border/Shadow um alles |

---

## 3. Research-Methode und Evidenz

### 3.1 Vorgehen

Die Recherche wurde am 2. September 2026 mit aktuellen Webquellen durchgeführt. Priorität hatten:

1. offizielle Human Interface Guidelines und Entwicklerleitlinien von Apple und Google;
2. W3C/WCAG und Design Tokens Community Group;
3. etablierte Forschungs- und Fachquellen wie Nielsen Norman Group und Baymard Institute;
4. offizielle Produktankündigungen und Hilfedokumente realer Apps;
5. vergleichende Synthese statt Übernahme einzelner Blogmeinungen.

Konkrete Zahlen sind einer von drei Typen:

- **normativ/konformitätsbezogen**, etwa WCAG-Kontrast;
- **plattformspezifisch**, etwa 44 pt oder 48 dp Touch Targets;
- **synthetisierte Defaults**, etwa 16–24 pt Screen Padding. Letztere sind Startpunkte und ausdrücklich keine universellen Vorgaben.

### 3.2 Trennung der Aussagearten

| Art | Haltbarkeit | Umgang |
|---|---|---|
| Fundamentale UX-Prinzipien | lang | nur durch neue starke Evidenz oder speziellen Kontext überschreiben |
| Plattformstandard | bis Plattformänderung | gegen aktuelle SDK-/HIG-Version prüfen |
| Strong Best Practice | mittel bis lang | mit Nutzertests und Produktdaten validieren |
| Current Trend | kurz bis mittel | Nutzen nachweisen; Rückbaukosten bedenken |
| Experimental | unklar | begrenzt testen, Fallback und Messplan vorsehen |
| Designmode | kurz | nicht in Kernarchitektur oder kritische Interaktion einbauen |

### 3.3 Grenzen der App-Benchmarks

Die Benchmark-Sektion ist **keine kontrollierte Usability-Studie** und kein vollständiges Screen-Audit. Sie stützt sich auf öffentlich dokumentierte Releases, Hilfeseiten und sichtbare Produktmuster. Rollouts, A/B-Tests, Region, Accounttyp und Betriebssystem können Varianten erzeugen. Deshalb werden Muster als Inspiration und Hypothesen behandelt, nicht als Beweis, dass ein Pattern für jedes Produkt funktioniert.

### 3.4 Aktueller Plattformkontext 2026

- Apple nutzt Liquid Glass als dynamisches Material für eine funktionale Control-/Navigationsebene. Apple warnt davor, es als Content-Layer zu verwenden, weil dies Hierarchie und Lesbarkeit schwächen kann.[S06]
- Material 3 Expressive erweitert M3 um emotionalere Farbe, flexible Typografie, kontrastierende Formen, expressive Komponenten und Motion Physics. Expressivität bleibt kontextabhängig; produktive Apps brauchen weiterhin ruhige Informationsflächen.[S16]
- Android behandelt adaptive Layouts, Edge-to-edge, verschiedene Fenstergrößen und Formfaktoren als Standardanforderung. Navigation soll sich etwa von Bottom Bar zu Rail oder Pane-Struktur verändern, statt nur gestreckt zu werden.[S17][S18]
- WCAG 2.2 ist der robuste plattformübergreifende Accessibility-Bezug; native Plattformvorgaben ergänzen ihn.[S25]
- Der Design Tokens Community Group Report 2025.10 ist stabil, aber kein W3C-Standard. Er etabliert ein interoperables Format und trennt Basis-, semantische und komponentenbezogene Entscheidungen.[S29]

---

## 4. Fundamentale UX-Prinzipien

NN/g fasst viele zeitstabile Grundsätze in den zehn Usability-Heuristiken zusammen: sichtbarer Systemstatus, Realwelt-Match, Kontrolle, Konsistenz, Fehlerprävention, Recognition statt Recall, Effizienz, fokussierte Gestaltung, Fehlerbehebung und Hilfe.[S30]

### 4.1 Prinzip → konkrete Mobile-Regel

| Prinzip | Mobile-Operationalisierung | Schlechtes Pattern | Besseres Pattern |
|---|---|---|---|
| Visuelle Hierarchie | pro Viewport 1 Fokus, 1–2 sekundäre Ebenen; Größe, Gewicht, Kontrast und Raum koordiniert einsetzen | jede Kennzahl groß und farbig | Hauptwert dominant, Vergleich und Details ruhiger |
| Informationshierarchie | Reihenfolge nach User Job, nicht Datenmodell | Metadaten vor Aufgabe | Aufgabe, Ergebnis, dann Details |
| Affordance | Interaktives sieht interaktiv aus und reagiert sofort | farbiger Text ist manchmal Button, manchmal Label | konsistente Button-/Link-/Row-Semantik |
| Konsistenz | gleiche Aktion = gleiche Benennung, Position, State und Wirkung | „Speichern“, „Fertig“, Check-Icon für identische Aktion | ein Muster je Handlungsklasse |
| Feedback | sichtbarer pressed/focus State in <100–150 ms; Ergebnisstatus passend zur Reichweite | Tap ohne Reaktion, später Toast | Pressed State, Progress, Ergebnis im Kontext |
| Fehlertoleranz | Undo, Drafts, Autosave oder bestätigte irreversible Aktion | Bestätigung für alles | Undo für reversible; Confirm nur bei hohem Risiko |
| Recognition over Recall | Optionen, letzte Suchen, aktive Filter und Kontext sichtbar halten | Nutzer muss Code/Status aus vorigem Screen merken | Wert übernehmen oder direkt referenzieren |
| Progressive Disclosure | häufig/entscheidend zuerst, selten/fortgeschritten auf Anfrage | alle Einstellungen dauerhaft offen | Grundoptionen plus klar benanntes „Weitere Optionen“ |
| Cognitive Load | Entscheidungen bündeln, Defaults setzen, irrelevante Optionen verbergen | 14 gleich gewichtete Aktionen | 1 primär, 2–3 sekundär, Rest kontextuell |
| Hick’s Law | Zahl gleichartiger Entscheidungen reduzieren und kategorisieren | langer unsortierter Action-Sheet | gruppierte, priorisierte, suchbare Optionen |
| Fitts’s Law | häufige Ziele groß, erreichbar und nicht nahe Systemgesten platzieren | 20-px Icon am Rand | 44/48 Hit Area mit sicherem Insets-Abstand |
| Gestalt/Nähe | semantische Gruppen über Abstand zuerst zeigen | Border um jedes Element | enger innerhalb, größerer Abstand zwischen Gruppen |
| Kontrast | Bedeutung durch Luminanz, Gewicht und Form; nicht nur Farbe | hellgraue Pflichtinfo | gut lesbarer Text plus sekundäre Hierarchie |
| Scanbarkeit | Front-load Labels, kurze Absätze, stabile Alignment-Kanten | zentrierte Textwände | linksbündige Labels, kurze Blöcke, klare Sections |
| Predictability | Navigation und Systemgesten folgen Plattformmodell | Back schließt App oder löscht Zustand überraschend | Back zeigt erwartetes Ziel und bewahrt Draft |
| Discoverability | Kernaktion sichtbar; Gesten nur als Beschleuniger | Löschen nur per Swipe | sichtbares Menü plus optionaler Swipe |
| Efficiency of Use | Defaults, Wiederverwendung, Shortcuts und Kontextaktionen für Wiederkehrer | gleicher langer Flow bei jeder Nutzung | letzte Wahl, Quick Action, Bulk-Aktion |
| Perceived Performance | unmittelbare Reaktion und progressive Ergebnisse | blockierender Spinner | lokale Reaktion, Skeleton/Teilinhalt, Hintergrundstatus |
| Content First | Navigation und Chrome unterstützen Inhalt | UI-Dekor dominiert ersten Viewport | primärer Inhalt/Task oberhalb von Sekundärflächen |
| User Control | Cancel, Back, Undo, Pause, Edit und Datenkontrolle | nicht abbrechbarer Upload | Hintergrundtask mit Status und Abbruch, wenn sicher |
| Reversibility | reversible Aktionen direkt; irreversibles klar markieren | Confirm für Archivierbares | Aktion + Undo; Confirm nur endgültig/destruktiv |
| Contextual Relevance | Aktion dort zeigen, wo Objekt und Zustand sie sinnvoll machen | globaler FAB ohne klaren Scope | Row-/Toolbar-/Bottom-Action im relevanten Zustand |

### 4.2 Progressive Disclosure ohne Versteckspiel

Progressive Disclosure verbessert Lernbarkeit, Effizienz und Fehlerrate, wenn die Trennung richtig ist und der Zugang zu Details eindeutig bleibt.[S31]

**Zeige sofort:**

- Information, die für die aktuelle Entscheidung notwendig ist;
- häufige und zeitkritische Aktionen;
- aktive Filter, Auswahl und Systemstatus;
- Risiko, Preis, Dauer oder Konsequenz vor dem Commit;
- Fehler und Recovery direkt am betroffenen Objekt.

**Verberge oder verschiebe:**

- seltene Konfiguration;
- vollständige Metadaten ohne Einfluss auf die aktuelle Aufgabe;
- Erklärungen, die nur bei Unsicherheit gebraucht werden;
- alternative Aktionen, die nicht gleichrangig sind;
- Details, die sich in einem neuen Screen besser scannen, teilen oder verlinken lassen.

**Nicht verbergen:** Sicherheitsfolgen, Kosten, Datenschutzwirkung, irreversible Konsequenzen, aktive Systemzustände oder Kernnavigation.

### 4.3 Minimalismus richtig definieren

> Entferne nicht Information, sondern unnötige Entscheidungslast, redundante Darstellung und dekorative Konkurrenz.

Eine professionelle Trading-, Health- oder Operations-App kann dicht sein. Gute Dichte bedeutet: konsistente Spalten, tabellarische Zahlen, stabile Gruppierung, progressive Details, Filter, verständliche Semantik und Nutzervoreinstellungen. Schlechte Dichte bedeutet: viele visuell gleich laute Elemente ohne klare Reihenfolge.

---

## 5. Mobile UX Hygiene

Die folgenden Punkte sind **grundlegende Hygiene**. Fehlen sie, ist die App unabhängig von visueller Qualität nicht fertig.

### 5.1 Interaktion und Geometrie

- [ ] Touch Targets erfüllen 44 × 44 pt auf iOS beziehungsweise 48 × 48 dp auf Android als produktiven Mindeststandard.[S02][S19]
- [ ] Sichtbar kleine Icons besitzen eine vergrößerte, nicht überlappende Hit Area.
- [ ] Häufige Aktionen liegen nicht vollständig in System-Gesture-Inset-Zonen.[S18]
- [ ] Safe Areas, Status Bar, Kameraausschnitte und Home Indicator werden dynamisch berücksichtigt.[S03][S18]
- [ ] Scrollbare Inhalte enden nicht verdeckt unter fixen Bottom Actions.
- [ ] Pull-to-refresh existiert nur bei sinnvoll aktualisierbaren Feeds/Listen und ist nicht die einzige Refresh-Möglichkeit.
- [ ] Swipe und Long Press beschleunigen, ersetzen aber keine sichtbare Kernfunktion.
- [ ] Back verhält sich vorhersehbar; Android Predictive Back wird nicht durch unnötige eigene Callbacks gebrochen.[S24]

### 5.2 Keyboard und Formulare

- [ ] Das aktive Feld und die nächste relevante Aktion bleiben über der Tastatur sichtbar.
- [ ] Tastaturtyp, Return-Key, Autofill und AutoComplete passen zur Eingabe.
- [ ] „Next“ bewegt den Fokus logisch; „Done“ schließt oder schickt nur, wenn die Wirkung klar ist.
- [ ] Keyboard-Dismissal ist möglich, ohne Eingabe zu verlieren.
- [ ] Labels bleiben nach Eingabe sichtbar; Placeholder ist nie das einzige Label.[S10]
- [ ] Validierung erklärt Problem und Lösung, nicht internen Fehlercode.
- [ ] Lange Formulare bewahren Eingaben bei Navigation, Rotation, App-Wechsel und Netzwerkfehler.

### 5.3 Zustände und Daten

- [ ] Loading, Empty, No Results, Offline, Partial Failure, Permission Denied, Session Expired und Success sind gestaltet.
- [ ] Cache/Offline-Inhalt kennzeichnet Aktualität, ohne funktionierende Inhalte unnötig zu blockieren.
- [ ] Retry ist lokal zur fehlgeschlagenen Operation; bereits geladene Bereiche bleiben nutzbar.
- [ ] Optimistische Änderungen sind sicher rückrollbar oder klar als ausstehend markiert.
- [ ] Refresh zerstört keine Scrollposition, Auswahl oder ungespeicherte Arbeit.
- [ ] Session-Ablauf bewahrt Drafts und führt nach erneuter Anmeldung sinnvoll zurück.
- [ ] Destruktive, nicht rückholbare Vorgänge zeigen Objekt, Konsequenz und eindeutiges Verb.

### 5.4 Accessibility und Anpassung

- [ ] Jeder Control hat semantischen Namen, Rolle, Wert und Zustand.
- [ ] Screen-Reader-Reihenfolge folgt der visuellen und fachlichen Reihenfolge.
- [ ] Text skaliert bis mindestens 200 %, ohne Verlust wesentlicher Inhalte oder Funktionen.[S02][S25]
- [ ] Große Schrift erzeugt Reflow statt Clip, Überlappung oder unkontrollierte Ellipsis.
- [ ] Fokus ist sichtbar und wird nicht von Sticky Bars oder Overlays verdeckt.[S25]
- [ ] Informationen hängen nicht ausschließlich von Farbe, Position, Sound, Haptik oder Bewegung ab.
- [ ] Reduced Motion ersetzt große Translation/Zoom/Blur-Bewegung durch Fade oder unmittelbaren Wechsel.[S02][S07]
- [ ] Light, Dark und idealerweise Increased/High Contrast sind geprüft.
- [ ] RTL, lange Übersetzungen, große Zahlen, Zeitzonen und lokale Datums-/Zahlenformate funktionieren.

### 5.5 Permissions, System und Privacy UX

- [ ] Nur notwendige Berechtigungen werden im Nutzungskontext angefragt.[S09][S15]
- [ ] Vor dem Systemdialog wird der konkrete Nutzen erklärt, wenn er nicht selbsterklärend ist.
- [ ] Ablehnung führt zu Graceful Degradation und einem später verständlichen Weg in Settings.
- [ ] Scoped Picker/Share Sheet wird umfassender Datenfreigabe vorgezogen.
- [ ] Status Bar, System Bars, Clipboard-, Camera- und Microphone-Indikatoren werden nicht optisch verschleiert.
- [ ] Notification-Opt-in kommt nach erkennbarem Wert, nicht beim ersten Launch.

### 5.6 Landscape, große Displays und Fenster

- [ ] Portrait Lock wird nur fachlich begründet verwendet.
- [ ] Auf großen Breiten werden Inhalte nicht bloß gestreckt; Navigation, Pane-Struktur und Max-Widths passen sich an.[S17]
- [ ] Fold-Hinge, Split View, Desktop Windowing und wechselnde Aspect Ratios führen nicht zu abgeschnittenen Aktionen.
- [ ] Tablets nutzen gegebenenfalls List-Detail oder Supporting Pane statt einer überbreiten Einspaltenansicht.

---

## 6. Informationsarchitektur und Navigation

### 6.1 Navigation beginnt beim mentalen Modell

Bevor ein Navigationsmuster gewählt wird:

1. Welche 3–5 Ziele beschreiben die wiederkehrenden Hauptjobs?
2. Welche Objekte bilden die Domäne: Personen, Projekte, Reisen, Konten, Aktivitäten?
3. Welche Ziele müssen jederzeit erreichbar sein?
4. Welche Zustände sollen pro Ziel bewahrt werden?
5. Welche Routen müssen deep-linkbar, teilbar oder wiederherstellbar sein?
6. Welche Navigation ist global, welche nur innerhalb eines Objekts?

### 6.2 Pattern-Auswahl

| Pattern | Geeignet für | Regeln | No-Gos |
|---|---|---|---|
| Bottom Navigation / Tab Bar | 3–5 gleichrangige Top-Level-Ziele | stabile Position, Label + Icon, State je Tab bewahren | Aktionen als Tab; wechselnde Tabs je Screen |
| Navigation Stack | hierarchische Exploration und Tasks | klare Titel, erwartbares Back, Deep Links | zyklische oder unklare Hierarchie |
| Top Tabs | 2–4 eng verwandte Ansichten eines Kontexts | kurze Labels, Swipe nur ergänzend | globale IA in lokale Tabs pressen |
| Scrollable Tabs | viele stabile Kategorien | ausgewählte Kategorie sichtbar halten | dynamische Aktionen oder sehr lange Labels |
| Segmented Control | 2–4 alternative Darstellungen desselben Inhalts | sofortiger Wechsel, gleiche Hierarchieebene | Navigation zu unabhängigen Bereichen |
| Search-driven | große, bekannte Kataloge/Objekte | Recent, Suggestions, Toleranz, No Results | einzige Navigation bei unbekanntem Vokabular |
| Navigation Drawer | viele seltene Top-Level-Ziele, Enterprise/komplex | auf Compact bewusst; auf Large als Rail/Sidebar erwägen | Standardersatz für priorisierte IA |
| Context Menu / Overflow | seltene objektspezifische Aktionen | sichtbare Kernaktion bleibt | essentielle Aktion nur im Menü |
| Modal Navigation | kurzer fokussierter Task mit Rückkehr | Cancel/Done, Draft-Regel, klare Modalität | lange Informationsarchitektur im Modal |

Android empfiehlt 3–5 Ziele in einer Navigation Bar; auf großen Screens soll diese zu Rail/Sidebar beziehungsweise adaptiver Navigation werden. Apple definiert Tab Bars als Navigation zwischen Top-Level-Sektionen, nicht als Aktionsleiste, und empfiehlt Labels.[S17][S15]

### 6.3 Tabs

- Bottom Tabs: 3–5, möglichst ein Wort, stabile Reihenfolge.
- Top Tabs: meist 2–4 gleichzeitig sichtbar; bei mehr Kategorien scrollable, aber aktive Auswahl nie außerhalb des sichtbaren Bereichs lassen.
- Filter-Chips sind keine Navigationstabs: Sie verändern ein Resultset und brauchen aktive Zustände, Count und Reset.
- Segmented Controls wechseln Ansicht oder Modus innerhalb desselben Kontexts; keine tiefe Navigation.
- Ein Tab darf leer sein. Erkläre den Zustand, statt ihn temporär aus der Navigation zu entfernen; sonst wird die IA instabil.[S15]
- Badge nur für relevante, zählbare oder dringliche Änderungen; nicht als dauernder Engagement-Druck.

### 6.4 Back Behavior

**iOS:** Back folgt dem Stack; Edge Swipe darf nicht durch horizontale App-Gesten blockiert werden. Modals besitzen Cancel/Close und bewahren oder verwerfen Drafts nach klarer Regel.

**Android:** System Back ist Teil des Nutzervertrags. Predictive Back soll Ziel und Übergang vor Abschluss sichtbar machen. Custom Gestures und Full-screen Surfaces müssen Gesture Insets respektieren.[S24]

**Universal:**

- Back bedeutet „zum vorherigen Navigationszustand“, nicht „zur willkürlich definierten Startseite“.
- Ein Tap auf den aktiven Root-Tab kann je Plattform/Produkt nach oben scrollen; ein zweiter Tap darf nicht überraschend Daten löschen.
- Deep Links brauchen einen sinnvollen Back-/Up-Pfad auch ohne vorherigen In-App-Stack.
- Unsaved Changes: Autosave bevorzugen; andernfalls nur beim tatsächlichen Verlust warnen.

### 6.5 Navigations-No-Gos

- mehr als fünf gleich gewichtete Bottom Tabs;
- Hamburger-Menü, obwohl drei klare Kernziele existieren;
- dieselbe Information gleichzeitig als Tab, Card und Floating Action;
- Tab Bar auf Detailseiten zufällig ein-/ausblenden;
- Back-Button für Submit oder Logout missbrauchen;
- verschachtelte Bottom Navigation in Bottom Navigation;
- unbeschriftete, proprietäre Navigationsicons;
- neue Screens ohne Titel, Fokusziel oder Deep-Link-Strategie;
- horizontale Swipe-Navigation, die System Back oder Content-Carousels konfliktträchtig überlagert.

---

## 7. Layout, Screen-Architektur und Spacing

### 7.1 Vertikale Screen-Struktur

Ein belastbarer Standardscreen besteht aus:

1. **System-/Navigationsebene:** Safe Area, Top Bar, Titel, Back, globale Actions.
2. **Orientierung:** optionaler Kontext, Status oder Summary; kein dekorativer Hero ohne Informationswert.
3. **Primärer Arbeitsbereich:** wichtigste Information/Aktion im ersten sinnvollen Viewport.
4. **Sektionen:** nach Aufgabe und Semantik, nicht nach Datenbanktabellen.
5. **Sekundärdetails:** progressive Disclosure, Detail-Screen oder expandierbare Bereiche.
6. **Abschluss/Actions:** inline, sticky bottom oder Toolbar je Task.
7. **Systemabstand:** Scroll-Inset für Tab Bar, Home Indicator, Keyboard und Overlays.

### 7.2 Header, Titel und Hero

| Element | Nutzen | Verwenden wenn | Vermeiden wenn |
|---|---|---|---|
| Large Title | starke Orientierung am Root einer Section | Screen häufig neu betreten wird und Platz vorhanden ist | Task eng, keyboardlastig oder Daten dicht sind |
| Compact Title | maximale Arbeitsfläche | Detail-, Formular-, Map- oder Utility-Screen | Kontext sonst unklar bleibt |
| Hero | Value, Bild, Status oder Primäraktion trägt | Content emotional/visuell entdeckt wird | nur Branding/Whitespace erzeugt |
| Sticky Header | Filter, Search oder Kontext beim Scrollen nötig | lange Listen und Zustandswechsel | große Fläche dauerhaft blockiert |
| Collapsing Header | Orientierung oben, Dichte beim Scrollen | Root-/Detail-Kombination | Bewegungsaufwand ohne Nutzen |

Große Typografie ist kein Modernitätsbeweis. Wenn eine Headline bei typischer Gerätegröße mehr als etwa ein Viertel des ersten nutzbaren Viewports belegt und weder Marke noch Orientierung wesentlich trägt, sollte sie verkleinert oder kollabierbar werden.

### 7.3 Cards, Listen und Sections

**Card verwenden, wenn mindestens zwei Kriterien erfüllt sind:**

- eigenständiges Objekt oder Vorschau;
- mehrere zusammengehörige Datentypen;
- eigene Aktion(en) oder Navigation;
- visuelle Abgrenzung zu heterogenem Umfeld nötig;
- kann als Einheit sortiert, verschoben, geteilt oder entfernt werden.

**Liste verwenden, wenn:**

- Einträge homogen sind;
- schnelles Scannen/Vergleichen wichtig ist;
- viele Items auftreten;
- Zeile hauptsächlich Label, Meta, Status und Disclosure enthält.

**Section ohne Container verwenden, wenn:**

- nur semantische Gruppierung nötig ist;
- Überschrift, Abstand und Alignment bereits ausreichend trennen.

**Card entfernen, wenn:** sie nur einen Textblock umrandet, die gesamte Screenfläche ohnehin eine Surface ist, verschachtelte Cards entstehen oder der Container weder Handlung noch Objektgrenze kommuniziert.

### 7.4 Full-bleed, Container und Whitespace

- Backgrounds, Media, Maps und scrollender Content dürfen edge-to-edge zeichnen; Text und tappbare Controls brauchen Insets.[S18]
- Full-bleed Media kann Orientierung und Immersion stärken; Metadaten und Actions liegen auf lesbaren Surfaces oder mit geprüftem Kontrast.
- Whitespace ist Struktur. Innerhalb einer Gruppe weniger, zwischen Gruppen mehr.
- Mehr Raum ist nicht automatisch ruhiger: zu große Abstände zerstören Zusammenhang und erhöhen Scrollkosten.
- Auf großen Screens Max-Width statt Strecken: Formulare grob 480–640, längerer Lesetext 600–760, arbeitsreiche Inhalte als Pane/Grid. Werte sind Defaults und müssen mit Schrift, Sprache und Aufgabe geprüft werden.

### 7.5 Sticky, Fixed und Floating Actions

**Sticky Bottom Action:** sinnvoll bei linearem Formular, Checkout, Composer oder klarer finaler Handlung. Sie muss Keyboard, Safe Area und Scrollende berücksichtigen; Content darf nicht verdeckt werden.

**Floating Action Button:** sinnvoll für eine hochfrequente, klar erkennbare Erstellaktion über listen-/kartenbasiertem Inhalt. Nicht sinnvoll, wenn mehrere konkurrierende Aktionen bestehen, das Symbol unklar ist oder die Aktion nur auf einem Teil der Screens gilt.

**Contextual Action:** erscheint bei Auswahl oder bestimmtem Zustand. Sie reduziert Dauerclutter, muss aber durch Auswahlzustand und klare Transition verständlich sein.

### 7.6 Spacing-System

Ein mögliches modernes Raster:

| Token | Wert | Typische Nutzung |
|---|---:|---|
| `space.0` | 0 | bewusst kein Abstand |
| `space.0_5` | 2 | optische Korrektur, nie Hauptlayout |
| `space.1` | 4 | Icon-interne/engste Beziehungen |
| `space.2` | 8 | Icon–Text, Label–Supporting Text |
| `space.3` | 12 | kompakte Row-/Control-Innenabstände |
| `space.4` | 16 | Standard Screen-/Card-Padding |
| `space.5` | 20 | großzügige Card, Zwischenstufe |
| `space.6` | 24 | Section Gap, ruhiges Screen Padding |
| `space.8` | 32 | große Section-Trennung |
| `space.10` | 40 | Screenbereiche/Hero-Abstand |
| `space.12` | 48 | große strukturelle Trennung |
| `space.16` | 64 | seltene Display-/Editorial-Abstände |

**Regeln:**

- 4er-Raster als Hauptsystem; 2er-Werte nur für optische Feinjustierung.
- Component Padding ist Teil des Components, Layout Gap Teil des Containers.
- Abstände über semantische Tokens (`space.section`, `space.control.inline`) statt zufällige Zahlen ausdrücken.
- Responsive Varianten ändern Rolle und Komposition, nicht jeden Wert proportional.
- Compact/Comfortable darf als Dichte-Modus existieren; Accessibility-Hit-Areas bleiben unverändert.

### 7.7 Alignment und Rhythmus

- Wenige starke vertikale Kanten sind besser als viele lokale Zentrierungen.
- Text in datenreichen Screens meist start-align; Zahlen bei Vergleich rechtsbündig/tabular.
- Baselines und optische Icon-Ausrichtung prüfen, nicht nur mathematische Boxzentrierung.
- Wiederkehrende Section-Abstände bleiben stabil; Ausnahme braucht semantische Begründung.
- Nested Padding vermeiden: Screen 16 + Card 16 + Inner Card 16 kann Inhalt unnötig auf eine schmale Spalte drücken.

---

## 8. Visuelles System

### 8.1 Typografie

Apple empfiehlt für iOS 17 pt als Default und nennt 11 pt als absolute Mindestgröße; zugleich sollen alle Dynamic-Type-Größen funktionieren. Diese 11 pt sind keine Empfehlung für regulären Fließtext.[S04] Android-Typografie muss `sp` und Systemeinstellungen respektieren.[S20]

| Rolle | Synthetisierter Startbereich | Line Height | Anwendung |
|---|---:|---:|---|
| Display | 32–40 | 1.1–1.25 | seltene Hero-/Editorial-Momente |
| Large Title | 28–34 | 1.15–1.3 | Root-Orientierung |
| Title | 20–24 | 1.2–1.35 | Screen/Section |
| Headline | 17–20 | 1.25–1.4 | Card-/Row-Hierarchie |
| Body | 16–17 | 1.4–1.6 | Standardinhalt |
| Secondary | 14–15 | 1.35–1.55 | Meta/Supporting |
| Caption | 12–13 | 1.3–1.5 | kurze, nicht kritische Zusatzinfo |
| Button/Label | 14–17 | control-basiert | klare Verben und Labels |

**Systemfont vs. Custom Font:** Systemfonts bieten Plattformfit, Sprachabdeckung, variable optische Größen und robuste Skalierung. Custom Fonts sind sinnvoll, wenn Brand Voice messbar profitiert und alle Schriftsysteme, Ziffern, Gewichte, Dynamic Type und Performance abgedeckt sind. Häufig genügt eine Brand-Display-Schrift plus Systemfont für UI und Body.

**Regeln:**

- meist eine Familie, höchstens 3–4 Gewichte und 5–7 semantische Rollen;
- Body nicht künstlich klein machen, um mehr Inhalt „above the fold“ zu pressen;
- große Headlines nur für Orientierung oder Markenwirkung, nicht auf jedem Utility-Screen;
- Uppercase nur für kurze, kulturell passende Labels; Tracking und Screen Reader prüfen;
- Ziffern in Tabellen, Timern und animierten Kennzahlen tabular;
- Zeilen nicht übermäßig lang: auf Tablet Textbreite begrenzen;
- Text nicht in fixe Höhen zwingen; bei Skalierung reflowen;
- kritische Information nie als niedrig kontrastierte Caption.

**Typische Fehler:** zu viele Größen/Gewichte, Light-Weights bei kleinen Größen, enge Line Height, Ellipsis ohne Detailzugang, zentrierte Langtexte, zu viel Copy in Cards, unskalierte Icons neben skaliertem Text.

### 8.2 Farbe

Farbe erfüllt vier Rollen: Brand, Hierarchie, Semantik und Personalisierung. Android empfiehlt rollenbasierte Tokens, Light/Dark/Contrast-Schemes und warnt vor zu vielen dekorativen oder semantischen Farben.[S20] Apple empfiehlt adaptive Systemfarben und separate Light/Dark/Increase-Contrast-Varianten.[S05]

**Token-Ebenen:**

```text
palette.blue.500                  # Rohwert
color.action.primary             # semantische Rolle
button.primary.background        # Komponentenrolle
color.text.primary / secondary
color.surface.base / raised / overlay
color.status.success / warning / danger / info
```

**Regeln:**

- Primärfarbe für wichtigste Interaktion und ausgewählte Zustände reservieren.
- Destruktivrot nicht für Branding oder neutrale Aufmerksamkeit verwenden.
- Status nie nur über Hue; Icon/Text/Form ergänzen.
- Textkontrast nach WCAG AA: 4.5:1 normal, 3:1 groß; nicht-textuelle UI-Komponenten und relevante Grafiken 3:1.[S25][S26]
- Brandfarbe darf angepasst werden, wenn sie als Text/Control keinen Kontrast erreicht.
- Borders/Separators sollen Struktur geben, nicht jeden Container einfassen.
- Dynamic Color auf Android ist optional und braucht eine statische Brand-Fallback-Scheme.[S20]

### 8.3 Dark Mode

- semantische Tokens statt mechanischer Inversion;
- meist dunkles Grau für große Flächen, echtes Schwarz gezielt für OLED/Media oder Kontrast;
- erhöhte Surfaces im Dark Mode häufig heller, nicht schattenstärker;
- gesättigte Farben abdimmen, damit sie nicht flimmern oder überstrahlen;
- Bilder mit Scrim/Outline prüfen; transparente Assets brauchen beide Modi;
- Borders und Shadows separat abstimmen;
- System Appearance als Default respektieren, optional Light/Dark Override;
- Light, Dark und Increased Contrast einzeln testen.[S13]

### 8.4 Formen, Radius, Borders und Tiefe

| Rolle | Startbereich | Regel |
|---|---:|---|
| kleine Controls/Chips | 8–12 | Form nicht größer als Inhalt wirken lassen |
| Inputs/Buttons | 10–16 oder pill | innerhalb einer Familie konsistent |
| Cards | 12–20 | eigenständige Objektgrenze nötig |
| Sheets/Modals | 20–32 oben | Plattformkomponente bevorzugen |
| Full pill | Höhe/2 | Chips, Tags, kompakte Actions; nicht jeder Container |

- Konzentrische Radien: Außenradius ungefähr Innenradius + Padding.
- Borders für Struktur, Fokus und Status; Shadows/Elevation für tatsächliche Überlagerung.
- Flache Listen brauchen oft Separator oder Abstand, keine Card-Shadows.
- Mehr als drei gleichzeitig erkennbare Surface-Ebenen ist auf kleinen Screens meist zu viel.
- Stark unterschiedliche Shapes können M3 Expressive unterstützen, müssen aber Semantik oder Branding tragen.[S16]

### 8.5 Blur, Glass und Translucency

**Funktional sinnvoll:** Navigation/Controls schweben über scrollendem Content, Kontext bleibt sichtbar, Modalität/Layering wird verständlich. **Problematisch:** wechselnder Hintergrund zerstört Kontrast, mehrere Glass-Layer vermischen Hierarchie, GPU-/Battery-Kosten steigen, Reduce Transparency/High Contrast werden ignoriert.

Apple positioniert Liquid Glass als eigene funktionale Ebene für Navigation und Controls und rät vom Einsatz als Content-Layer ab.[S06] Daraus folgt:

- Glass nie als Standard-Card-Stil für Listen und Formulare;
- Fallback auf opake/standard Material Surface bei Reduce Transparency oder unzureichendem Kontrast;
- Texte und kleine Icons nicht direkt auf unkontrolliertem Bildmaterial;
- maximal eine klare Glass-Ebene je Interaktionskontext;
- Performance auf Low-End-Geräten und während Scroll/Keyboard testen.

### 8.6 Icons

- SF Symbols auf Apple und Material Symbols auf Android bevorzugen, wenn Semantik passt.
- Standardgröße meist 20–24 pt/dp; Navigation 24; sichtbare Größe ist nicht Hit Area.
- pro Surface ein kohärentes Set und optisches Stroke Weight.
- Outline als Default und Filled als Selected kann Zustände verstärken.
- Icons allein nur bei universell bekannten, risikoarmen Aktionen (Back, Close, Search, Play); sonst Textlabel oder Accessibility-Label plus sichtbare Erklärung.
- proprietäre Icons in Navigation immer beschriften.
- RTL-spiegelbare Richtungsicons korrekt behandeln; Logos, Mediensteuerung und Uhrzeiger nicht blind spiegeln.
- Statusicons brauchen Text oder zugänglichen Namen.

---

## 9. Komponenten und Aktionen

### 9.1 Button-Hierarchie

| Typ | Zweck | Sichtbarkeit |
|---|---|---|
| Primary | wichtigste nächste Handlung | meist eine pro Zustand/Viewport |
| Secondary | relevante Alternative | 1–2, visuell ruhiger |
| Tertiary/Text | niedrigere Priorität | kontextuell/inline |
| Destructive | irreversible oder schädliche Wirkung | semantisch rot, klare Benennung |
| Icon Button | kompakte bekannte Aktion | Tooltip/Label für Unklares, große Hit Area |
| FAB | hochfrequentes Erstellen | nur bei klarer, screenübergreifender Relevanz |

**Labels:** Verb + Objekt oder eindeutiges Ergebnis: „Bericht exportieren“, „Änderungen speichern“, „Konto löschen“. Vermeide „OK“, „Ja“, „Weiter“, wenn Wirkung unklar ist. Bei Zahlung/Veröffentlichung benennt der Button die Konsequenz.

**Loading Button:** Label möglichst stabil halten oder in konkrete Aktivität ändern; Breite nicht springen lassen; Doppeltaps sperren, ohne global alles zu blockieren. Fehler erscheint nahe Action/Content. Disabled Buttons brauchen verständlichen Grund; oft ist enabled + Validierung hilfreicher als ein unerklärlich deaktivierter Button.

### 9.2 Primary-Action-Regel

- Eine dominante Aktion je Entscheidungssituation.
- Zwei gleich gewichtete Aktionen nur bei echter Wahl ohne klare Priorität, etwa „Foto aufnehmen“/„Aus Mediathek“.
- Destruktiv und sicher nie gleich visuell gewichten.
- Primäraktion darf kontextuell erscheinen, sobald Auswahl/Validität sie sinnvoll macht; Layoutsprung vermeiden.
- Häufige Row-Aktion kann sichtbar sein; seltene Aktionen ins Overflow.

### 9.3 Cards versus Lists — Entscheidungsalgorithmus

1. Sind Items homogen und vergleichbar? → Liste.
2. Braucht jedes Item Bild, mehrere Metadaten und eigene Actions? → Card oder rich row.
3. Reicht Überschrift + Abstand zur Gruppierung? → Section, kein Container.
4. Entsteht Card-in-Card? → äußere oder innere Ebene entfernen.
5. Verkleinert der Container nutzbare Breite ohne neue Semantik? → entfernen.
6. Ist die gesamte Card tappbar? → klare Pressed State, Accessibility-Rolle und keine widersprüchlichen Nested Targets.

### 9.4 Komponenten-Grundzustände

Jede interaktive Komponente definiert mindestens: `default`, `pressed`, `focused`, `selected` (falls relevant), `disabled`, `loading`, `error`, `success`; Hover nur für Pointer-Kontexte. Material empfiehlt mehrere visuelle Indikatoren für States.[S16]

---

## 10. Formulare, Auswahl, Datum und Zeit

### 10.1 Mobile Form UX

Apple empfiehlt minimale Eingabe, passende Auswahlkomponenten, Systemdaten/Defaults und dynamische Validierung.[S10]

**Regeln:**

- Nur Informationen erfragen, die für den aktuellen Job notwendig sind.
- Persistentes Label oberhalb oder als echtes Floating Label; Placeholder nur Beispiel/Format.[S10]
- Helper Text vor Fehler, wenn Format nicht erwartbar ist.
- Fehler nach plausibler Eingabe/Blur oder Submit, nicht aggressiv beim ersten Zeichen.[S33]
- Fehlertext: was ist falsch + wie beheben; Fokus/Screen Reader ankündigen.
- passende Tastatur und Autofill; Paste, Password Manager und OTP AutoFill nicht blockieren.
- Währung/Telefon/Datum lokal formatieren, Rohwert sauber speichern; Cursor darf nicht springen.
- „Next“ führt zum nächsten Feld, Submit zur sichtbaren Handlung.
- lange Prozesse in logisch zusammenhängende Schritte teilen, nicht zwanghaft ein Feld pro Screen.
- Pflicht/optional klar; seltene optionale Felder progressiv offenlegen.[S37]

### 10.2 Auswahlkomponenten

| Bedarf | Pattern | Hinweise |
|---|---|---|
| binäre sofortige Einstellung | Switch | Wirkung direkt, Label beschreibt Zustand |
| eine von 2–5 sichtbaren Optionen | Radio / Segmented | Radio bei erklärungsbedürftigen Labels |
| mehrere unabhängige Optionen | Checkbox | Select-all und Teilzustand bei langen Listen |
| wenige Filter | Chips | aktive Auswahl und Clear sichtbar |
| 5–10 kompakte Optionen | native Select/Sheet | Kontext entscheidet |
| viele bekannte Optionen | Searchable Select | Recent, Query-Toleranz, Tastatur |
| bildhafte Optionen | Grid/visual choices | Label und Selected State ergänzen |
| lange mobile Auswahl | Bottom Sheet/Full Screen | Search, Done/Apply, Auswahl bewahren |

Baymard fand im E-Commerce Drop-downs bei weniger als etwa fünf oder mehr als etwa zehn Optionen häufig problematisch; das ist Kontextforschung, keine universelle Zahl. Radios, Autocomplete oder Texteingabe können besser sein.[S36]

**Switch vs. Checkbox:** Switch verändert eine Einstellung sofort. Checkbox markiert Auswahl für einen späteren Submit oder eine unabhängige Aussage. Segmented Control ist kein Ersatz für lange Radiolisten.

### 10.3 Date und Time Picker

| Aufgabe | Bevorzugt | Warum |
|---|---|---|
| Termin nahe heute | Kalender | Wochentage und Verfügbarkeit sichtbar |
| Datumsbereich Reise | Range Calendar | Beziehung Start/Ende sichtbar |
| Geburtstag/historisches Datum | direkte lokalisierte Eingabe + native Unterstützung | jahrelanges Scrollen vermeiden |
| Uhrzeit | nativer Time Picker oder kompakte Eingabe | 12/24 h und Accessibility automatisch |
| relative Deadline | Quick Picks + Kalender | „Heute“, „Morgen“, „Nächste Woche“ schnell |
| wiederkehrender Slot | strukturierte Auswahl | Zeitzone, Wiederholung und Konflikte zeigen |

Kalender eignen sich besonders für nahe Daten und Ranges; weit entfernte Daten brauchen direkte Eingabe oder schnellen Jahreswechsel.[S38] Wheel Picker nur für kleine, lineare Wertebereiche und bekannte Plattformkonvention. Split-Dropdowns für Tag/Monat/Jahr erzeugen unnötige Schritte.

**Immer:** Locale, Zeitzone, DST, Min/Max, disabled dates, Start/End-Regeln, Fehler, Screen Reader und große Schrift testen. Relative Anzeige („morgen“) mit absolutem Datum ergänzen, wenn Konsequenz hoch ist.

---

## 11. Search, Filter und Sortierung

### 11.1 Search

- Prominente Search Bar bei search-first Produkten; Icon genügt nur bei sekundärer Suche.
- Query sichtbar und editierbar halten; Clear-Button, Cancel-Verhalten und Keyboard stimmen.
- Recent Searches nur mit Nutzen, löschbar und privacy-bewusst.
- Suggestions unterscheiden Query, Kategorie, Person oder Aktion visuell/semantisch.
- Instant Search nur, wenn Ergebnisse schnell und stabil sind; sonst Debounce + Progress.
- No Results zeigt Query, aktive Filter, Korrektur, alternative Begriffe und Reset.
- Ergebnis-Snippets erklären Match; Ranking/Personalisierung darf nicht täuschen.
- Voice/Image Search nur, wenn Inputmodalität echten Nutzen bietet.

### 11.2 Filter

- häufigste 2–4 Filter als Chips/Promoted Filters; Vollmenge in Sheet/Screen;
- aktive Filter oberhalb der Resultate sichtbar und einzeln entfernbar;
- Filter-Button zeigt Count; „Alle zurücksetzen“ erreichbar;
- Instant Apply bei schnellen, lokal verständlichen Änderungen;
- Apply-Button bei teuren Queries, mehreren abhängigen Wahlen oder wenn Nutzer erst kombinieren sollen;
- Result Count im Filterkontext aktualisieren, sofern performant;
- gleiche Facette meist OR, unterschiedliche Facetten meist AND; Produktlogik klar machen;
- Filterzustand bei Detailnavigation bewahren.

Baymard bestätigt für mobile Produktlisten sichtbare aktive Filter und vorsichtige Promoted Filters als Orientierungshilfe.[S35]

### 11.3 Sortierung

- Sortierung getrennt von Filter benennen.
- aktuelles Sortierkriterium sichtbar;
- Optionen mit Nutzerbegriffen („Preis: niedrig nach hoch“), nicht internen Feldern;
- „Relevanz“ nur, wenn Ranking plausibel ist;
- neue Sortierung bewahrt Filter und erklärt Positionswechsel nicht mit unnötigem Toast.

---

## 12. Sheets, Modals und Dialoge

### 12.1 Sheet vs. Screen vs. Dialog

| Pattern | Verwenden | Nicht verwenden |
|---|---|---|
| Bottom Sheet | kontextuelle Auswahl/Details, Hauptkontext soll sichtbar bleiben | tiefer mehrstufiger Workflow |
| Full-screen Sheet/Modal | fokussierter Create/Edit-Task mit Cancel/Done | normale Hierarchie/Detailnavigation |
| Neuer Screen | tiefer Inhalt, Deep Link, Teilen, lange Form, eigene Navigation | triviale 2-Optionen-Auswahl |
| Alert/Dialog | kritische Entscheidung oder kurze Blockade | Information, die inline lösbar ist |
| Action Sheet | kleine Menge objektbezogener Aktionen | lange unsortierte Befehlsliste |

Bottom Sheets sind progressive Disclosure und bewahren Kontext; sie sind nicht automatisch „besser erreichbar“ und verdecken Inhalt.[S32]

### 12.2 Bottom-Sheet-Regeln

- Detents nur, wenn jede Stufe funktional sinnvoll ist.
- Drag Handle ist Affordance, ersetzt aber keinen Close/Done-Pfad bei komplexem Inhalt.
- Dismiss per Swipe/Tap-outside nur, wenn kein wichtiger Draft verloren geht.
- Nested Scrolling eindeutig: Sheet expandiert, dann Content scrollt.
- Keyboard verschiebt/resized sinnvoll; Fokusfeld bleibt sichtbar.
- Modal Sheet braucht Scrim, Fokusfalle/Screen-Reader-Modalität und Restore Focus.
- Persistent Sheet darf Hauptinhalt nicht unerreichbar machen.

### 12.3 Confirmation Fatigue

Bestätige nur, wenn Aktion schwer rückgängig, hoher Schaden plausibel oder Wirkung außerhalb des sichtbaren Kontexts ist. NN/g warnt vor Übernutzung von Confirmations.[S34]

**Bevorzugte Reihenfolge:** Prevent → constrain → preview → reversible action + Undo → Confirmation → doppelte Bestätigung nur bei extremem, nicht behebbaren Risiko.

---

## 13. Onboarding, Authentication, Permissions und Settings

### 13.1 Onboarding

| Pattern | Nutzen | Risiko |
|---|---|---|
| Zero Onboarding | selbsterklärender Job, schneller Wert | unbekannte Konzepte bleiben verborgen |
| Progressive Onboarding | Lehre im Moment des Bedarfs | Tooltips können überhandnehmen |
| First-run Setup | zwingende Konfiguration | frühe Abbruchrate |
| Feature Tour | neues mentales Modell | wird oft übersprungen/vergessen |
| Personalization Questions | sofort relevantere Defaults | Datensammlung und Friktion |

- Value vor Account/Permission zeigen, soweit fachlich möglich.
- Skip für nicht zwingende Einführung.
- Kein Carousel, das nur Marketingtexte wiederholt.
- Permission Priming direkt vor Feature-Nutzung.[S21]
- Erfolg durch erste echte Handlung, nicht „Tour abgeschlossen“.
- Guest Mode oder Preview, wenn Kernwert ohne Account erlebbar ist.

### 13.2 Authentication

- Account nur verlangen, wenn Kernfunktion ihn braucht; Sign-in möglichst spät.[S11]
- Passkeys als bevorzugte moderne Methode; alternative Recovery anbieten.[S11][S21][S46]
- Anbieterbuttons plattformgerecht und korrekt gebrandet.
- OTP: AutoFill/Paste, Ablaufzeit, Resend-Timer, Zieladresse editierbar.
- Password: Manager, Show/Hide, Anforderungen vor Eingabe, kein Paste-Verbot.
- Fehler neutral gegen Account Enumeration, aber für echte Nutzer handlungsfähig.
- Session-Ablauf bewahrt lokale Arbeit und erklärt Re-Auth.
- Logout, Account Delete und Datenexport klar unterscheiden.

### 13.3 Permissions

Apple und Android empfehlen kontextuelle, minimale Anfragen; Ablehnung muss respektiert und funktional degradiert werden.[S09][S15]

1. Prüfen, ob Picker/Intent/scoped Alternative ohne Permission genügt.
2. Nutzer startet Feature.
3. Konkreten Nutzen und Umfang erklären, falls nicht offensichtlich.
4. Systemdialog zeigen.
5. Bei Ablehnung Alternative oder Settings-Weg anbieten, nicht drängen.
6. Später nur erneut fragen, wenn der Kontext echten neuen Wert liefert.

### 13.4 Notifications

- Opt-in nach erlebtem Nutzen; Kategorien und Frequenz erklären.
- granular steuerbar; Systemsettings respektieren.
- Nachricht ist zeitnah, relevant und handlungsfähig.
- keine „Wir vermissen dich“-Pushes ohne direkten Wert; Android rät explizit davon ab.[S22]
- Marketing nie als zeitkritisch markieren; Apple trennt Passive, Active, Time Sensitive und Critical.[S14]
- In-App Inbox nur, wenn Nachrichten dauerhaft/recherchierbar sein müssen.
- Badge nicht als Schuld-/Engagementmechanik.

### 13.5 Settings

- seltene Präferenzen in Settings; häufige Actions in ihren Kontext.[S22]
- Gruppen: Account, Notifications, Privacy/Security, Appearance, Support/About, Danger Zone.
- Switch-Zeile beschreibt Zustand, Supporting Text Wirkung.
- Unterseiten bei mehr als ca. 5–7 Optionen oder eigener Erklärung.
- systemweite Präferenzen nicht unnötig duplizieren.
- Sign out separat; Delete Account in klarer Danger Zone mit Konsequenz/Recovery.

---

## 14. Empty, Loading, Error und Feedback States

### 14.1 Empty States

| Zustand | Inhalt |
|---|---|
| First use | Wert, kurze Orientierung, primäre Create/Import-Aktion |
| Keine Daten nach Nutzung | sachliche Erklärung, ggf. Filter/Zeitraum prüfen |
| No Results | Query/Filter sichtbar, Vorschläge, Reset |
| Offline ohne Cache | Status, benötigte Verbindung, Retry |
| Permission fehlt | betroffene Funktion, Alternative, Settings-Aktion |
| Inhalt gelöscht/nicht verfügbar | was geschah, wohin weiter, ggf. Restore |

Illustration nur, wenn sie Ton, Orientierung oder Verständnis verbessert. Kein riesiges Artwork, das die einzige sinnvolle CTA unter den Fold drückt.

### 14.2 Loading-Auswahl

| Erwartung | Pattern |
|---|---|
| <100 ms | kein Loader; direkter State |
| ca. 100–500 ms | Pressed/inline feedback; Loader verzögert einblenden, um Flackern zu vermeiden |
| ca. 0.5–3 s, Struktur bekannt | Skeleton oder lokale Progress-Anzeige |
| >3 s, Fortschritt messbar | determinate Progress + Phase/Restinformation |
| langlaufend | Hintergrundtask, Notification/Task Center, Cancel wenn möglich |
| unbekannt/kompakt | Spinner + konkrete Statuscopy, nicht Full-screen wenn Teilinhalt nutzbar |

NN/g beschreibt etwa 0.1 s als Grenze für direkte Manipulation und betont sichtbaren Systemstatus.[S34] Schwellen sind Orientierungswerte, keine SLA.

**Skeleton:** spiegelt finale Struktur, animiert dezent, bleibt nicht bei Fehler stehen. **Optimistic UI:** nur bei hoher Erfolgswahrscheinlichkeit und sicherem Rollback. **Pull to refresh:** erhält vorhandenen Inhalt, zeigt Aktualisierung lokal.

### 14.3 Error Handling

- Inline Error für Feld/Objekt; Banner für Screenbereich; Full-screen nur wenn Screen nicht nutzbar.
- Toast nicht für Formfehler, Session-Ablauf oder dauerhafte Recovery.
- technische IDs optional hinter „Details“, nicht als Haupttext.
- Partial Failure lässt erfolgreiche Teile bestehen.
- Retry idempotent; Doppelerstellung verhindern.
- Offline ist eigener Betriebszustand, nicht pauschal „Unbekannter Fehler“.
- Copy: „Konnte nicht gespeichert werden. Deine Eingabe bleibt erhalten. Erneut versuchen.“

### 14.4 Toast, Snackbar, Banner, Inline

| Kanal | Geeignet | Muss vermeiden |
|---|---|---|
| Toast | unkritische, rein informative Bestätigung | Aktion/Undo, lange oder wichtige Info |
| Snackbar | kurze Bestätigung mit optionalem Undo | mehrere gestapelte Meldungen |
| Banner | persistenter screenweiter Zustand | triviale Erfolge |
| Inline | Feld-/Objektstatus und Recovery | globale Systemstörung |
| Modal | blockierendes hohes Risiko | Routinefehler |
| Haptic/Sound | ergänzende Bestätigung/Warnung | einziger Informationskanal |

---

## 15. Motion, Gesten und Haptics

### 15.1 Motion-System

| Kategorie | Startbereich | Zweck |
|---|---:|---|
| Press/Color/Opacity | 80–150 ms | unmittelbares Feedback |
| Expand/Collapse | 160–250 ms | Zustandsbeziehung |
| Sheet/Modal | 240–400 ms | räumlicher Kontext |
| Navigation | systemdefiniert, grob 250–400 ms | Kontinuität |
| seltene inszenierte Transition | 400–600 ms | nur wenn Story/Orientierung profitiert |

- Motion erklärt Ursache, Ziel, Hierarchie oder Status; Dekoration allein reicht nicht.[S07]
- Interaktionen bleiben während Animation abbrechbar/unterbrechbar.
- Enter deutlicher, Exit kürzer/ruhiger.
- High-frequency Interactions ohne eigene Showanimation.
- Shared Element nur bei echter Objektkontinuität.
- Spring ohne übermäßigen Bounce bei produktiven Controls.
- Reduced Motion: Translation/Scale/Parallax/Blur reduzieren oder durch Fade ersetzen.[S02]
- Motion nie einziger State-Indikator.

### 15.2 Gesten

| Geste | Gute Nutzung | Schutzregel |
|---|---|---|
| Tap | primäre Aktivierung | große Hit Area, pressed State |
| Long Press | Preview/Context Menu | sichtbare Alternative |
| Swipe | Navigation/Bulk- oder Row-Shortcut | Undo, klare Schwelle, Alternative |
| Drag | Reorder/Spatial manipulation | Handle, Screen-Reader-Alternative |
| Pinch | Zoom von Media/Maps | +/- oder Reset zugänglich |
| Pull | Refresh/Reveal | nicht einzige Aktualisierung |
| Edge Swipe | System Back | nicht mit App-Geste konkurrieren |

### 15.3 Haptics

Apple und Android empfehlen systemdefinierte, kurze, konsistente Haptics; Android fasst „less is more“ ausdrücklich zusammen.[S08][S23]

- Selection: leichter Tick bei Snap/Picker, nicht bei jedem Scrollpixel.
- Success/Warning/Error: selten und semantisch stabil.
- Impact: physische Manipulation, Drag-Drop oder Grenzpunkt.
- Stärke korreliert mit Wichtigkeit, Häufigkeit umgekehrt.
- visuelles Feedback immer ergänzen; Haptics abschaltbar.
- Buzzy/Long vibrations vermeiden; lieber keine als schlechte Haptik.[S23]

---

## 16. Content Design und Informationsreduktion

### 16.1 Microcopy

- Nutzerbegriffe statt Backend-/Unternehmenssprache.
- Buttons als konkrete Verben; Headlines als Orientierung/Ergebnis.
- Helper Text beantwortet eine wahrscheinliche Frage.
- Error: Problem + Ursache, wenn bekannt + nächste Handlung.
- Confirm: Objekt + irreversible Konsequenz + eindeutiges Verb.
- Settings: Label beschreibt Präferenz, Supporting Text Wirkung.
- Ton ruhig, respektvoll, nicht schuld- oder angstinduzierend.
- Text entfernen, wenn bekannte Control-Semantik und Kontext eindeutig sind; Accessibility-Name bleibt.

### 16.2 Informationsreduktion — fünf Fragen

Für jedes Element:

1. Unterstützt es den primären Job oder eine notwendige Entscheidung?
2. Muss es jetzt sichtbar sein?
3. Ist dieselbe Information bereits durch Struktur/State erkennbar?
4. Kann es in Detail, Tooltip, Sheet oder nächsten Screen verschoben werden, ohne Recall zu erhöhen?
5. Welche Fehler entstehen, wenn es fehlt?

**Entfernen:** redundante Labels, dekorative Divider, doppelte Statuscopy, Metriken ohne Entscheidung, leere Cards, permanente Tutorials. **Behalten:** Preis/Risiko/Konsequenz, Status, aktive Filter, notwendige Vergleichswerte, Recovery und Datenschutzwirkung.

### 16.3 Textmenge

- Cards: ein klares Thema, kurze Summary, Details auf Nachfrage.
- Empty State: 1 Headline, 1–2 Sätze, 1 primäre Aktion; sekundär nur bei echtem Bedarf.
- Onboarding: Nutzen und Handlung, keine Feature-Inventarliste.
- Tooltips: für unbekannte, nicht selbsterklärende Konzepte; nicht als Pflaster für schlechte Labels.

---

## 17. Dashboards und Datenvisualisierung

### 17.1 Mobile Dashboard

- Summary first: wichtigste 1–3 Antworten, nicht alle verfügbaren KPIs.
- Jede Kennzahl braucht Frage, Zeitraum, Einheit und bei Trend eine Referenzbasis.
- Detail on demand: Tap führt zu Erklärung, Verlauf oder Treibern.
- KPI-Card nur, wenn die Kennzahl eigenständig und handlungsrelevant ist.
- Desktop-Grid nicht schrumpfen; auf Mobile priorisieren, stapeln oder in Tabs/Details teilen.
- Charts nur, wenn Form/Trend leichter erkennbar wird als in Zahl + Text.
- Personalisierung sinnvoll, wenn Rollen/Jobs stark variieren; Defaults bleiben brauchbar.

### 17.2 Chart-Auswahl

| Frage | Chart | Mobile-Regel |
|---|---|---|
| Verlauf | Line | wenige Serien, klare Zeitachse, Punktdetails per Tap |
| Kategorien vergleichen | Bar | sortieren, Labels direkt, horizontal bei langen Namen |
| Teil-vom-Ganzen | Bar/100%-Bar | Donut nur wenige deutliche Segmente |
| Zielerreichung | Progress Bar/Ring | Zahl und Ziel zusätzlich zeigen |
| kompakter Trend | Sparkline | Start/End/Delta oder Kontext ergänzen |
| Verteilung | Histogram/Box nur Expert:innen | Erklärung und zugängliche Tabelle |

**No-Gos:** 3D-Charts, viele Donutsegmente, duale Achsen ohne zwingenden Grund, Legende weit vom Datenpunkt, rote/grüne Bedeutung ohne zweite Kodierung, winzige Tap-Punkte, abgeschnittene Nullachse ohne Kennzeichnung.

### 17.3 Accessible Data Viz

- Textsummary mit Kernaussage und Zeitraum;
- Datenwerte als zugängliche Tabelle oder strukturierte Liste;
- Kontrast 3:1 für bedeutungstragende grafische Elemente soweit WCAG anwendbar.[S25]
- Linie zusätzlich durch Pattern/Marker unterscheiden;
- Tooltip keyboard-/screen-reader-erreichbar; nicht nur Hover;
- große Schrift darf Chart nicht überdecken; ggf. Detail-Screen.

---

## 18. Accessibility, Dark Mode und adaptive Layouts

Accessibility ist Bestandteil von Informationsarchitektur, Komponenten und Definition of Done. WCAG 2.2 ergänzt native Plattformregeln; WCAG ist weborientiert, viele Kriterien sind dennoch ein belastbarer Mindestbezug für Hybrid- und Native-UX.[S25]

### 18.1 Konkrete Mindestanforderungen

| Bereich | Mindestanforderung |
|---|---|
| Textkontrast | 4.5:1 normal, 3:1 groß nach WCAG AA[S26] |
| UI-/Grafikkontrast | 3:1 für bedeutungstragende Komponenten/Grafiken |
| Target Web/Hybrid | WCAG AA 24 × 24 CSS px oder definierter Abstand[S27] |
| Target Native | bevorzugt 44 × 44 pt iOS, 48 × 48 dp Android[S02][S19] |
| Text Scaling | bis 200 % ohne Funktions-/Informationsverlust[S25] |
| Fokus | sichtbar, logisch, nicht durch Sticky/Overlay verdeckt |
| Screen Reader | Name, Rolle, Wert, Zustand; sinnvolle Gruppen |
| Motion | Reduce Motion respektieren; kein Informationsverlust |
| Farbe | nie einziger Bedeutungsträger |
| Auth | Password Manager/Paste/Passkeys; keine kognitiven Rätsel |

### 18.2 VoiceOver/TalkBack

- visuell zusammengehörige, aber einzeln unnütze Fragmente als sinnvolle Einheit gruppieren;
- Controls nicht aus reinem Layouttext ableiten;
- dynamische Statusänderungen dosiert ankündigen;
- Fokus nach Navigation auf Titel/Primärinhalt, nach Modal-Schluss zum Auslöser;
- Reihenfolge nicht über absolute Positionstricks verfälschen;
- Custom Controls benötigen Standardaktionen und vergleichbare Bedienung;
- Bilder: informativer Alternativtext; dekorativ aus Accessibility Tree entfernen.

### 18.3 Dynamic Type und große Schrift

- Textcontainer wachsen; fixe Zeilenhöhen vermeiden.
- horizontale Button-Gruppen dürfen vertikal reflowen.
- Icon-only Controls skalieren Hit Area und bei semantisch wichtigen Symbolen auch Glyph.[S04]
- bei Accessibility-Größen Side-by-side Layout in Stack/Panes umwandeln.
- Truncation nur für wirklich sekundäre, anderweitig erreichbare Inhalte.
- Settings, Forms, Tab Labels und Charts auf maximale Kategorien prüfen.

### 18.4 Kleine, große und faltbare Displays

Android beschreibt `reflow`, `reveal` und `presentation change` als adaptive Strategien und empfiehlt Max-Widths statt Stretching.[S17]

| Größe/Kontext | Strategie |
|---|---|
| kleines Phone/Cover | primären Job priorisieren, kompakte Header, keine Pflicht-Zweispaltigkeit |
| großes Phone | mehr sichtbare Details, aber nicht automatisch größere UI |
| Landscape | Controls reflowen, Media/Map ggf. splitten, Keyboard testen |
| Tablet/Foldable | List-detail, Navigation Rail/Sidebar, Supporting Pane |
| Split View/Window | verfügbare Fenstergröße statt Geräteklasse verwenden |
| große Schrift | Layoutklasse unabhängig von Gerätegröße reduzieren/reflowen |

---

## 19. iOS und Android

Gemeinsame Brand-Sprache ist sinnvoll; Interaktionsvertrag bleibt plattformnah.

| Thema | iOS | Android | Gemeinsamer Kern |
|---|---|---|---|
| Back | Navigation-Bar Back + Edge Swipe | System/Predictive Back | Stack und Drafts korrekt |
| Primary Navigation | Tab Bar/Sidebar-adaptiv | Navigation Bar/Rail/Drawer-adaptiv | 3–5 Top-Level-Ziele |
| Top Bars | Navigation Title/Toolbar | Top App Bar/Toolbar | Titel, Kontextactions |
| Sheets | System Sheet/Detents | Modal/Persistent Bottom Sheet | Dismiss/Draft/Keyboard |
| Icons | SF Symbols | Material Symbols | semantisch, beschriftet |
| Typografie | SF/Dynamic Type | Roboto/Brand + `sp` | Systemskalierung |
| Farbe | semantische adaptive Systemfarben | M3 Rollen/Dynamic Color | rollenbasierte Tokens |
| Datum/Zeit | native Pickers | Material/native Pickers | Locale/Timezone |
| Permissions | Systemdialog im Kontext | Runtime Permission im Kontext | minimieren/degradieren |
| Haptics | UIFeedback/Core Haptics | HapticFeedbackConstants | kurz, systemisch |
| Material 2026 | Liquid Glass Control-Layer | M3 Expressive | Nutzen vor Trend |

**Plattformnah umsetzen:** Back, Navigation, Systemdialoge, Permissions, Picker, Keyboard, Context Menus, Share Sheets, Haptics, Safe Areas und Accessibility. **Gemeinsam branden:** Contentstruktur, Tonalität, Illustration, Brandfarbe, ausgewählte Typografie, Datenvisualisierung und semantische Komponenten.

---

## 20. Design System und Komponentenbibliothek

### 20.1 Token-Architektur

Die DTCG-Spezifikation definiert Tokens als benannte Designentscheidungen und unterstützt Referenzen, Gruppen und Typen.[S29]

```text
Primitive:   color.blue.600, space.4, radius.3
Semantic:    color.text.primary, color.action.danger, space.section
Component:   button.primary.bg, input.border.error
Modes:       light, dark, highContrast, compact
Platform:    ios, android, largeScreen
```

Tokens für: Farbe, Typografie, Spacing, Radius, Border, Shadow/Elevation, Opacity, Motion, Haptics und Breakpoints. Semantische Namen verhindern, dass „blue500“ fachliche Bedeutung trägt.

### 20.2 Komponenten-API

Jede Komponente dokumentiert:

- Zweck und Nicht-Zweck;
- Varianten, Größen und Slots;
- Default/Pressed/Focused/Selected/Disabled/Loading/Error/Success;
- Content Limits und Localization;
- Accessibility Name/Role/Value/Actions;
- Dark/Contrast/Reduced Motion;
- Keyboard/Pointer/Touch;
- Plattformabweichung;
- Beispiele, Gegenbeispiele und Tests.

### 20.3 Referenzbibliothek

| Komponente | Varianten/States | Accessibility/No-Go |
|---|---|---|
| Button | primary, secondary, tertiary, danger, loading | klares Label; kein winziger Target |
| IconButton | default, selected, destructive | Name/Tooltip; keine proprietäre Kernaktion |
| TextField/TextArea | default, focus, filled, error, disabled | persistentes Label, Helper/Error-Verknüpfung |
| SearchField | idle, typing, loading, no results | Clear/Cancel; Query erhalten |
| ListRow | navigation, selection, toggle, action | ganze Row-Semantik; Nested Targets sparsam |
| Card | content, action, selection | Objektgrenze; keine Card-in-Card |
| Checkbox/Radio/Switch | checked, mixed, disabled | Control-Typ korrekt zur Wirkung |
| Chips/Tabs | filter, input, navigation | Selected nicht nur Farbe |
| TopBar/TabBar | compact, large, contextual | Safe Area, Labels, stabile IA |
| Sheet/Dialog | detents, modal/fullscreen | Fokus, Dismiss, Draft, Keyboard |
| Snackbar/Banner | info, success, warning, error | Dauer/Action zugänglich |
| Skeleton/Progress | determinate/indeterminate | Reduced Motion, finaler Shape |
| Empty/Error State | first-use/no-data/offline | konkrete Recovery |
| Avatar/Media | image/initial/fallback | Alt/Semantik, privacy |
| Date/Time Picker | date/range/time | Locale, Screen Reader |
| Chart | line/bar/progress | Summary + zugängliche Daten |

### 20.4 States Matrix

| State | Visuell | Semantisch | Verhalten |
|---|---|---|---|
| default | normale Hierarchie | enabled | aktivierbar |
| pressed | unmittelbare Reaktion | unverändert | nicht doppelt auslösen |
| focused | klarer Fokusindikator | focused | Tastaturaktion |
| selected | Form/Farbe/Icon | selected/checked | Auswahl erkennbar |
| disabled | reduziert, aber lesbar | disabled | Grund erreichbar |
| loading | Progress ohne Sprung | busy | Doppelsubmit verhindern |
| error | Text + Icon/Farbe | invalid + Message | Recovery/Fokus |
| success | ruhig bestätigt | Statusankündigung | weiter nutzbar |
| empty | Ursache + nächster Schritt | sinnvolle Überschrift | CTA/Reset |

---

## 21. Benchmark moderner Apps

### 21.1 Kategorien und Muster

| App/Kategorie | Öffentlich dokumentiertes Muster | Übertragbare Lehre | Risiko bei blinder Kopie |
|---|---|---|---|
| Revolut / Finance | konsolidierte Finanz-Home, schnelle Kontozugänge | Summary + häufige Money Actions | Home kann mit Cross-Sell überladen |
| Notion / Productivity | 2026 neuer Mobile-Home für Home, Chats, Meetings, Inbox[S43] | komplexes Produkt braucht mobile Startpriorisierung | Desktop-Funktionsdichte schrumpfen |
| WhatsApp / Communication | Android-Navigation nach unten, Chatfilter oben[S39] | Reachability plus Scanfilter | neue Tabs ohne klare Kernjobs |
| Strava / Fitness | Record-Flow vereinfacht; Live Map + Stats[S42] | aktive Aufgabe priorisiert Live-Status | während Aktivität zu viele Daten |
| Uber / Mobility | vereinfachtes Home, Saved Places, Activity Hub, Live Activities[S41] | Kontext/History und glanceable Status | Personalisierung verdrängt vorhersehbare IA |
| Airbnb / Travel | Homes/Experiences/Services, Trips-Itinerary, Messages[S40] | Discovery getrennt von Reiseausführung | visuelle Inszenierung erhöht Dichte |
| Amazon/Commerce | search-first, dichte Listen, starke Checkout-Konvention | funktionale Dichte bei bekannten Jobs | Homepage-/Promo-Overload |
| Spotify / Media | content-first Home, Player als persistenter Kontext | Zustand und Resume über Navigation | Personalisierung kann Exploration verschleiern |
| Duolingo / Learning | progressive Lektion, klares nächstes Ziel, starke Feedbackloops | Fortschritt sichtbar, kleine Schritte | Gamification/Schuld passt nicht überall |
| Apple Health/Fitness / Health | Summary, Trends, Detail-on-demand | Datenhierarchie und Plattformfit | KPI-Menge ohne Entscheidung |
| ChatGPT / AI Tool | Composer als Kern, Streaming, Voice im Chat[S44] | multimodaler Input + fortlaufender Kontext | Chat als Universalpattern für strukturierte Tasks |
| Google Maps / Utility | Map als Content, Bottom Sheet, kontextuelle Actions | Sheet bewahrt räumlichen Kontext | Gesten/Overlays können Accessibility erschweren |

### 21.2 Gemeinsame Qualitätsmuster

- Bottom Navigation für stabile Kernziele, lokale Tabs/Filter für Kontext.
- Primärer Job im ersten Viewport: Record, Search, Composer, Destination oder Summary.
- Details in Sheet/Screen, nicht alle im Root.
- Persistenter laufender Zustand: Ride, Player, Workout, Upload, AI Task.
- Systemflächen außerhalb der App: Live Activities, Notifications, Widgets.
- Personalisierung als Beschleuniger, nicht als Ersatz für verständliche IA.
- visuelle Apps nutzen Media/Animation stärker; funktionale Apps nutzen Alignment, Listen und kompakte Statusdarstellung.

### 21.3 Funktional vs. inszeniert

| Funktional/datenreich | Visuell inszeniert |
|---|---|
| stabile Rows, Tabellen, kompakte Controls | Full-bleed Media, große Type, expressive Transition |
| hohe Vergleichbarkeit | hohe Entdeckung/Emotion |
| restrained Motion | Motion als räumliche Erzählung |
| wenige dekorative Farben | Brand-/Content-Farbe stärker |
| Detail über Drill-down | Detail über immersive Card/Sheet |

Beide brauchen Accessibility, klare Actions und robuste States. Ein Banking-Flow sollte nicht wie ein Entertainment-Feed wirken; ein Reise-Discovery-Flow darf emotionaler sein als Settings.

---

## 22. Aktuelle Trends 2024–2026

| Trend | Vorteil | Nachteil | Geeignet | Einordnung |
|---|---|---|---|---|
| Liquid Glass/Translucency | Control-Layer, Kontext, Plattformfit Apple | Kontrast/Performance/Unruhe | Navigation über Content | Current platform trend; funktionaler Kern langlebig[S06] |
| M3 Expressive | Emotion, flexible Shapes/Type/Motion | kann Utility-Dichte schwächen | Consumer, wellbeing, media | Current platform direction[S16] |
| Floating Navigation | Content bleibt sichtbar, moderne Tiefe | verdeckt Content/Systemgesten | immersive Feeds/Media | Context dependent |
| große Typografie | Hierarchie, Brand | Platzverbrauch, Skalierungsprobleme | Root/Editorial | langlebiges Werkzeug, trendig übernutzt |
| Bento Layout | modulare Übersicht | Card-/Dashboard-Overload | heterogene Highlights, große Screens | Current trend |
| Gradients/Soft Surfaces | Atmosphäre, Fokus | Kontrast und visuelle Konkurrenz | Brand/Media | visuelle Mode mit selektivem Nutzen |
| Minimal Interfaces | Fokus, Ruhe | Discoverability/fehlender Kontext | simple High-frequency Jobs | langlebig nur als Complexity Reduction |
| Contextual UI | weniger Dauerclutter | Feature Discovery | Editor, Selection, State Actions | langlebiges Pattern |
| Adaptive/Personalized UI | Relevanz, Effizienz | Unvorhersehbarkeit, Filter Bubble | wiederkehrende Nutzung | Strong but context dependent |
| Motion-rich | Kontinuität, Delight | Ablenkung, Motion Sensitivity | seltene Übergänge/Media | Trend; restriktiv |
| Conversational UI | flexible natürliche Eingabe | unpräzise, schlecht scanbar | offene Wissens-/Assistenzjobs | Context dependent |
| Generative UI | task-spezifische Controls | Konsistenz, Vertrauen, Testbarkeit | AI Workflows | Experimental |

**Trend-Gate:** Verbessert es Verständnis, Geschwindigkeit, Fehlerquote oder emotionale Passung? Funktioniert es in Dark/Contrast/Reduced Motion? Gibt es Plattform-/Low-end-Fallback? Bleibt IA stabil? Wenn nicht, nicht einsetzen.

---

## 23. AI App UX

Apple fordert klare AI-Kennzeichnung, menschliche Kontrolle, Privacy, Fallbacks, Erwartungsmanagement und Schutz vor Halluzinationen.[S12] Microsoft HAX strukturiert 18 evidenzbasierte Leitlinien über erste Nutzung, Interaktion, Fehler und Langzeitnutzung.[S45]

### 23.1 AI ist kein Standardfeature

AI nur einsetzen, wenn sie einen konkreten Job messbar besser erfüllt: Zeit spart, komplexe Eingabe vereinfacht, relevante Transformation ermöglicht oder große Informationsmengen sinnvoll erschließt. Deterministische Regeln bleiben für rechtlich/finanziell/sicherheitskritische Entscheidungen oft geeigneter.

### 23.2 Chat und Prompt Input

- Capability und Scope in einem Satz; diverse Suggested Prompts als Beispiele, nicht starre Menüs.
- Composer unterstützt Edit, Attach, Voice nur bei Nutzen; Send/Stop klar.
- Streaming zeigt Fortschritt, darf aber nicht als Qualitätsbeweis wirken.
- lange Antwort: Struktur, Quellen, Copy, Edit/Follow-up, Collapse.
- Prompt editieren und erneut ausführen; ursprüngliche Version nachvollziehbar.
- „Regenerate“ nicht allein: Alternativen wie „kürzer“, „mit Quellen“, „anders erklären“.

### 23.3 Vertrauen und Kontrolle

- AI-Inhalt kennzeichnen; nie Human-Autorenschaft vortäuschen.[S12]
- Quellen direkt an Behauptungen; Datum und Scope sichtbar.
- Unsicherheit konkret kommunizieren, nicht mit scheinpräzisen Prozenten erfinden.
- irreversible/externe Actions als Preview; Nutzer bestätigt Ziel, Parameter und Wirkung.
- Undo/Revert, Cancel und Version History.
- Datenfreigabe minimieren; On-device bevorzugen, wo sinnvoll; Server-/Training-Nutzung offenlegen.[S12]
- Feedback freiwillig, granular und nicht störend.

### 23.4 Long-running Tasks

1. Task angenommen und Scope zusammengefasst.
2. sichtbarer Phasenstatus statt endloser „Thinking“-Animation.
3. App darf verlassen werden; Background/Notification nach Einwilligung.
4. Cancel/Pause, wenn technisch und fachlich sicher.
5. Partial Results nutzbar; Fehler pro Teil.
6. Ergebnis mit Quellen, Grenzen und nächsten Actions.

### 23.5 AI-Fehler

- Blocked Request erklärt Kategorie und bietet zulässige Umformulierung.
- Tool-/Netzwerkfehler von Modellunsicherheit unterscheiden.
- keine erfundene Quelle oder „Confidence“.
- High-stakes Ergebnisse verlangen Review, verifizierte Daten und Human-in-the-loop.
- non-AI Fallback, wenn AI nur ergänzend ist.[S12]

---

## 24. No-Gos und Anti-Patterns

### 24.1 No-Gos

- Cards um jeden Textblock; Nested Cards; Border plus Shadow plus Glass ohne Layerzweck.
- mehr als eine dominante Primary Action pro Entscheidung.
- Touch Targets unter Plattformstandard; überlappende Hit Areas.
- Placeholder als einziges Label; Fehler nur als roter Rand.
- wichtige Aktion nur per Swipe/Long Press; unbeschriftete proprietäre Icons.
- Hamburger-Menü ohne IA-Grund; wechselnde Tab-Reihenfolge; Back mit Überraschung.
- Desktop-Dashboard auf Phone schrumpfen; volle Breite auf Tablet strecken.
- Dropdown für 2 Optionen oder ungesuchte Hunderterliste.
- Kalender für Geburtstag ohne schnellen Jahreswechsel.
- Spinner für lokale Sofortaktion; Full-screen Loader trotz brauchbarem Cache.
- Toast für kritischen Fehler oder Undo; mehrere Toasts nacheinander.
- Confirmation bei jeder Kleinigkeit; zugleich keine Confirmation bei irreversibler hoher Wirkung.
- langes Pflicht-Onboarding; Permissions im ersten Launch ohne Kontext.
- Dark Mode als Inversion; niedrig kontrastiertes Grau als „modern“.
- Animation als einziger State; Custom Motion trotz Reduced Motion.
- Glass/Blur über wechselndem Inhalt ohne Kontrast-Fallback.
- Hardcoded Höhen, Farben, Safe Areas, Textlängen oder Gerätebreiten.
- fehlende Empty/Error/Offline/Expired-Session States.
- AI ohne Kennzeichnung, Quellen, Stop, Edit oder Undo.
- manipulative Badges, künstliche Dringlichkeit, Schuldcopy und Notification Spam.

### 24.2 Anti-Pattern-Katalog

| Anti-Pattern | Warum problematisch | Typisches Beispiel | Bessere Alternative | Ausnahme |
|---|---|---|---|---|
| Card soup | schwache Hierarchie, wenig Breite | Settings in 12 Cards | grouped list | visuelle Objektgalerie |
| Zwei Primary Buttons | unklare Priorität | „Speichern“ und „Teilen“ gleich | eine primär, eine sekundär | echte gleichwertige Wahl |
| Icon-only IA | Recall/Mehrdeutigkeit | 5 unbekannte Tab-Icons | Labels + Icons | universelles Back/Play |
| Disabled mystery | kein Recovery | grauer Submit | inline Anforderungen | rechtlich gesperrter Zustand mit Grund |
| Premature validation | Stress/Clutter | Fehler beim ersten Zeichen | nach Blur/Parse/Submit | harte Zeichengrenze |
| Spinner wall | Kontextverlust | ganzer Screen für Refresh blockiert | vorhandener Inhalt + inline Progress | initiale sichere Sperre |
| Modal maze | Kontext-/Back-Probleme | Sheet öffnet Dialog öffnet Sheet | eigener Screen | kurze Systemauswahl |
| Gesture-only delete | nicht auffindbar | nur Swipe | Menü + optional Swipe/Undo | keine |
| Fake personalization | unvorhersehbar | Navigation sortiert sich selbst | stabile IA, personalisierte Inhalte | Nutzer steuert Reihenfolge |
| Glass everywhere | Lesbarkeit/Layerchaos | alle Cards translucent | Glass nur Control-Layer | immersive Spezialfläche |
| Dashboard vanity | Daten ohne Entscheidung | 20 KPIs | 3 Antworten + Detail | Expert:innenmodus |
| One field per screen | unnötige Schritte | Name, Vorname separat je Screen | logisch gebündelte Schritte | hoch komplexe adaptive Frage |
| Hidden active filters | Orientierung verloren | Filter nur im Sheet | Chips/Count/Reset | kein aktiver Filter |
| Dark inversion | semantische Fehler | Weiß→Schwarz automatisch | eigene semantische Scheme | monochromes Asset |
| AI certainty theater | Automation Bias | erfundene 97 % | Quellen/Grenzen/Review | kalibrierte validierte Modelle |

---

## 25. Entscheidungsregeln für AI Coding Agents

### 25.1 Struktur und Priorität

- Wenn der primäre Job nicht in einem Satz benennbar ist, kläre IA vor Styling.
- Wenn mehrere Elemente maximale visuelle Betonung haben, priorisiere neu.
- Wenn Sekundärinfo den ersten Viewport verdrängt, verschiebe sie nach unten oder in Detail-on-demand.
- Wenn mehrere Cards nur Text gruppieren, ersetze sie durch Sections oder Rows.
- Wenn Card-in-Card entsteht, entferne mindestens eine Container-Ebene.
- Wenn ein Element keinen funktionalen, semantischen oder hierarchischen Zweck hat, entferne es.
- Wenn Nutzer eine Kennzahl nicht in eine Entscheidung übersetzen können, reduziere oder erkläre sie.

### 25.2 Navigation und Aktionen

- Wenn 3–5 stabile Top-Level-Jobs existieren, prüfe Bottom Navigation/Tab Bar.
- Wenn ein Tab eine Aktion statt Ziel ist, verschiebe sie in Toolbar/FAB/Context Action.
- Wenn eine häufige Aktion mehrere Screens benötigt, prüfe kontextuelle Quick Action ohne Businessregeln zu umgehen.
- Wenn eine essentielle Aktion nur über Geste erreichbar ist, ergänze sichtbaren Pfad.
- Wenn Back Zustand verliert, implementiere Draft/Autosave oder gezielte Warnung.
- Wenn ein Modal einen tiefen Flow enthält, verwende einen Screen.
- Wenn ein Sheet nicht auf Hintergrundkontext angewiesen ist, prüfe Screen/Dialog.

### 25.3 Layout und visuelles System

- Wenn zufällige Einzelabstände auftreten, mappe auf Spacing Tokens.
- Wenn Tablet nur gestrecktes Phone ist, reflowe zu Pane/Grid mit Max-Width.
- Wenn Titel viel Fläche ohne Orientierungswert verbraucht, komprimiere/kollabiere.
- Wenn Farbe sowohl interaktiv als auch dekorativ dasselbe signalisiert, trenne Rollen.
- Wenn Border nur Tiefe simuliert, nutze Surface/Elevation; wenn Struktur nötig, Border behalten.
- Wenn Glass keinen Layer erklärt, entferne es.
- Wenn ein Icon ohne Kontext mehrdeutig ist, ergänze Text.

### 25.4 Forms und Auswahl

- Wenn Daten aus System/Account sicher verfügbar sind, frage nicht erneut.
- Wenn weniger als etwa fünf Optionen sichtbar passen, prüfe Radio/Segmented statt Dropdown.
- Wenn viele Optionen bekannt und suchbar sind, nutze Searchable Select.
- Wenn Datum weit von heute liegt, biete direkte Eingabe/schnellen Jahrwechsel.
- Wenn Fehler erst am Ende erscheinen, validiere früher; wenn sie beim Tippen stören, später.
- Wenn Keyboard Feld/CTA verdeckt, korrigiere Insets und Fokusfluss.

### 25.5 States, Performance und Accessibility

- Wenn Operation sofort lokal reflektierbar und rückrollbar ist, prüfe optimistic UI.
- Wenn finale Struktur bekannt ist, nutze passenden Skeleton statt generischem Spinner.
- Wenn Teilinhalt funktioniert, blockiere nicht den ganzen Screen.
- Wenn Fehler lokal ist, zeige ihn lokal und bewahre erfolgreiche Daten.
- Wenn Text bei 200 % clippt, reflowe; verkleinere nicht gegen Nutzerpräferenz.
- Wenn State nur durch Farbe/Motion/Haptic erkennbar ist, ergänze statischen Kanal.
- Wenn sichtbares Icon kleiner als Target ist, erweitere Hit Area ohne Überschneidung.

### 25.6 Content und AI

- Wenn Text nur die UI wiederholt, kürze ihn.
- Wenn Erklärung für Konsequenz nötig ist, entferne sie nicht zugunsten „cleaner UI“.
- Wenn AI-Aktion extern/irreversibel ist, zeige Preview und verlange Bestätigung.
- Wenn AI-Antwort faktisch ist, biete Quellen und Aktualitätskontext.
- Wenn AI nur Trendwert hat, implementiere sie nicht.

---

## 26. Framework für Redesign und Review

### 26.1 Screen Review Framework: JOBS

**J — Job und Journey**

- primärer Zweck, Nutzerabsicht, Einstieg, Erfolg, nächster Schritt;
- Häufigkeit, Dringlichkeit, Nutzung mit einer Hand/unterwegs;
- Business- und Safety-Constraints.

**O — Order und Objects**

- primäre/sekundäre Information;
- Reihenfolge, Gruppierung, Objektmodell, Redundanz;
- Cards/Lists/Panes und progressive Disclosure.

**B — Behavior**

- Navigation, Back, Actions, Gesten, Keyboard;
- Default/Loading/Empty/Error/Offline/Success;
- Undo, Cancel, Retry, Deep Link, Session Recovery.

**S — System quality**

- Tokens, Typografie, Spacing, Farbe, Platform Fit;
- Screen Reader, Text Scaling, Kontrast, Reduced Motion;
- Performance, Localization, Privacy und Analytics-Feedback.

### 26.2 Ablauf

1. Aktuellen Screen und alle Zustände inventarisieren.
2. Primären Job und Erfolgskriterium definieren.
3. Informations- und Action-Priorität markieren.
4. Redundanz, Verschachtelung und unnötige Schritte entfernen.
5. Navigation/Back/Deep Links prüfen.
6. Layout für klein, groß, Landscape, große Schrift skizzieren.
7. Zustandsmatrix und Accessibility ergänzen.
8. Plattformkonvention gegen Brand abgleichen.
9. Prototyp mit realistischen Daten, langen Texten und Fehlern testen.
10. Wirkung messen; rein kosmetische Änderungen separat priorisieren.

### 26.3 Review-Fragen

- Ist Screen ohne Anleitung verständlich?
- Was tut Nutzer wahrscheinlich zuerst, und ist das sichtbar?
- Fehlen Aktionen oder sind welche zu dominant?
- Können Schritte/Entscheidungen reduziert werden?
- Sind Reihenfolge, Dichte und Component Choice begründet?
- Bleiben Funktionalität und Businesslogik erhalten?
- Funktionieren alle States, Plattformen und Accessibility-Einstellungen?

---

## 27. Priorisierung von Verbesserungen

### 27.1 Bewertungsmodell

Bewerte 1–5:

| Faktor | Frage | Gewicht |
|---|---|---:|
| Usability Impact | verbessert Task-Erfolg/Verständnis? | 3 |
| Frequency | wie oft tritt es auf? | 2 |
| Effort Reduction | wie viel Nutzerarbeit entfällt? | 2 |
| Error/Risk | verhindert Fehler/Schaden? | 3 |
| Accessibility | beseitigt Ausschluss? | 3 |
| Consistency | löst systemisches Problem? | 2 |
| Visual Impact | verbessert Hierarchie/Vertrauen? | 1 |
| Evidence Confidence | wie stark ist Evidenz? | 2 |
| Implementation Complexity | Aufwand/Risiko | Abzug 1–5 × 2 |

`Priorität = Summe(Score × Gewicht) – Komplexität × 2`

**P0:** Blocker, Datenverlust, Safety, Accessibility-Ausschluss. **P1:** häufige Task-/Navigations-/Fehlerprobleme. **P2:** Konsistenz, Dichte, wahrgenommene Performance. **P3:** isoliertes Polish/Trend.

Kosmetik darf hoch priorisiert werden, wenn Vertrauen/Brand Kernwert ist; sie verdrängt aber keine blockierenden UX- oder Accessibility-Defekte.

---

## 28. Recommended Modern Mobile Defaults

Alle Werte sind **Startwerte**, keine universellen Gesetze.

| Bereich | Default |
|---|---|
| Screen Padding | 16 kompakt; 20–24 ruhig/großzügig |
| Spacing Scale | 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 |
| Card Padding | 16; 20 bei Editorial; 12 bei dichter Utility |
| Section Gap | 24–32 |
| Icon–Text | 8–12 |
| Touch Target | 44 pt iOS / 48 dp Android |
| Button Height | 48–56 |
| Input Height | 48–56, mehr bei Supporting/Error |
| List Row | 48–64, intrinsisch bei Wrap |
| Body | 16–17; Line Height 1.4–1.6 |
| Secondary | 14–15 |
| Caption | 12–13, nie kritische Info |
| Title | 20–24; Large 28–34 |
| Icons | 20–24; Navigation 24 |
| Radius | 8 klein, 12–16 standard, 20–32 overlay, full pill selektiv |
| Borders | 1 px/Pixel-aligned, semantisch |
| Shadow | 0–2 ruhige Ebenen; Plattformmaterial bevorzugen |
| Bottom Nav | 3–5 Ziele, Label + Icon |
| Tabs | 2–4 sichtbar; scrollable nur bei stabilen Kategorien |
| Motion | 80–150 state; 160–250 component; 240–400 nav/sheet |
| Modal | kurze kritische/fokussierte Entscheidung |
| Sheet | kontextuelle Auswahl/Details; Keyboard/Detents geprüft |
| Content Max Width | Form 480–640; Lesetext 600–760 auf großen Fenstern |

---

## 29. Screen Design Checklist

### UX

- [ ] Primärer Job und Erfolg sind klar.
- [ ] Eine dominante Primary Action; unnötige Schritte entfernt.
- [ ] Back, Cancel, Undo und Retry sind sinnvoll.
- [ ] Recognition statt Recall; aktive Zustände sichtbar.

### Layout

- [ ] Safe Areas/Keyboard/Sticky Insets korrekt.
- [ ] Alignment, Section Gaps und Density konsistent.
- [ ] Cards/Lists/Sections fachlich begründet.
- [ ] klein, groß, Landscape und Split View geprüft.

### Typography und Content

- [ ] klare Hierarchie, wenige Rollen/Gewichte.
- [ ] Labels bleiben sichtbar; Copy handlungsorientiert.
- [ ] lange Übersetzung, große Zahl und 200 % Text getestet.
- [ ] keine kritische Info in Caption/Truncation.

### Color und Components

- [ ] Kontrast AA; State nicht nur Farbe.
- [ ] Light/Dark/High Contrast geprüft.
- [ ] Touch Targets und Component States vollständig.
- [ ] Icons verständlich/beschriftet.

### States und Interaction

- [ ] Loading, Empty, Error, Offline, Success, Permission denied.
- [ ] Pressed/Focused/Selected/Disabled sichtbar.
- [ ] Gesten haben sichtbare Alternative.
- [ ] Animation kurz, unterbrechbar, Reduced Motion.

### Accessibility und Performance

- [ ] VoiceOver/TalkBack-Reihenfolge und Labels geprüft.
- [ ] Fokus nach Navigation/Modal korrekt.
- [ ] initiale Reaktion unmittelbar; Teilinhalt nicht blockiert.
- [ ] Skeleton/Progress entspricht realer Warteart.

### Platform und Polish

- [ ] native Back/Picker/Permission/Share-Konvention.
- [ ] optische Icon-/Baseline-/Radius-Ausrichtung.
- [ ] keine Layoutsprünge oder verdeckten Actions.
- [ ] reale Inhalte statt Lorem Ipsum getestet.

---

## 30. App-wide Checklist

- [ ] IA und Top-Level-Navigation decken Hauptjobs ab.
- [ ] Design Tokens und Komponenten sind Single Source of Truth.
- [ ] gleiche Begriffe/Actions/States sind appweit konsistent.
- [ ] Onboarding demonstriert Wert und ist überspringbar, wo möglich.
- [ ] Auth nutzt moderne Methoden, Recovery und Draft-Erhalt.
- [ ] Settings enthalten seltene Präferenzen, Privacy, Support und Danger Zone.
- [ ] Error-/Offline-/Sync-Modell ist appweit kohärent.
- [ ] Permissions minimal, kontextuell und degradierbar.
- [ ] WCAG/native Accessibility, Dark/Contrast/Reduced Motion sind Release Gates.
- [ ] Localization: RTL, Plural, Datum, Zahl, lange Sprache.
- [ ] Notifications sind wertvoll, granular und nicht manipulativ.
- [ ] Loading/Progress/Background Tasks folgen einem System.
- [ ] Analytics misst Task-Erfolg, Fehler, Abbruch und Accessibility-relevante Probleme; keine Dark Patterns.
- [ ] Privacy UX erklärt Datenzweck, Minimierung, Export/Löschung und Kontrolle.[S28]
- [ ] Deep Links, Session Expiry, Upgrade/Migration und Datenverlustfälle getestet.
- [ ] Low-end Device, schlechtes Netz, Offline, kleiner Speicher und Energiesparmodus geprüft.

---

## 31. Kontextabhängige Anwendung

### 31.1 Relevanzfilter

Erstelle vor Nutzung dieses Dokuments ein Projektprofil:

| Faktor | Leitfrage | Folge |
|---|---|---|
| Kategorie | Finance, Social, Health, Media, Tool? | Dichte, Vertrauen, Inszenierung |
| Zielgruppe | Expertise, Alter, Einschränkungen? | Sprache, Defaults, Accessibility |
| Häufigkeit | täglich oder selten? | Shortcuts vs. Erklärung |
| Primary Jobs | erstellen, überwachen, entdecken? | IA und Hauptkomponenten |
| Plattform | iOS, Android, beide, Tablet? | native Abweichungen |
| Brand | ruhig, expressiv, premium, spielerisch? | Type, Motion, Farbe |
| Datenmenge | wenige Objekte oder Katalog? | Search, Filter, Virtualisierung |
| Nutzungskontext | unterwegs, einhändig, stressig? | Target, Dichte, Offline |
| Risiko | finanziell, gesundheitlich, öffentlich? | Confirmation, Audit, Sprache |
| Technik | offline, latency, device range? | States und Performance |

### 31.2 Auswahlprozess

1. Binding Requirements und Businesslogik erfassen.
2. Nutzerjobs und Risikozustände priorisieren.
3. Relevante Fundamental/Platform/Hygiene-Regeln auswählen.
4. Context-dependent Patterns als Hypothesen markieren.
5. Trends nur nach Trend-Gate zulassen.
6. Defaults in Tokens übersetzen, nicht als verstreute Pixelwerte.
7. mit realen Daten und Nutzern validieren.
8. Abweichungen dokumentieren.

---

## 32. How AI Coding Agents Should Use This Document

1. Dieses Dokument ist **kein Auftrag, jedes Pattern einzubauen**.
2. Zuerst Produkt, Zielgruppe, bestehende Funktionen, Businesslogik, Plattform und technische Grenzen verstehen.
3. Projektspezifikation und bestehende Designsystemregeln haben Vorrang vor allgemeinen Defaults.
4. Bestehende UI darf kritisch verändert werden: Texte reduzieren/ergänzen, Komponenten ersetzen, Features neu ordnen, IA und Navigation verbessern, unnötige Elemente entfernen.
5. Neue UI nur ergänzen, wenn sie einen konkreten UX-Zweck erfüllt.
6. Funktionalität und Datenzugang dürfen nicht für visuelle Modernisierung verloren gehen.
7. Native Plattformkonventionen schlagen Trends, wenn sie kollidieren.
8. Accessibility ist Definition of Done.
9. Vor Änderungen alle States und relevante Datenflüsse inventarisieren.
10. Behavioral Changes mit Tests am höchsten sinnvollen Seam absichern.
11. Annahmen, Evidenzstärke, verworfene Alternativen und nicht verifizierte Bereiche dokumentieren.
12. Ein Agent soll nicht nur stylen, sondern fragen: Ist diese Information nötig? Ist die Reihenfolge richtig? Ist das Pattern verständlich? Kann Arbeit entfallen?

---

## 33. Quellenverzeichnis

### Offizielle Plattformrichtlinien

- **[S01]** Apple, [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/), abgerufen 2026-09-02.
- **[S02]** Apple, [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), Touch Targets, Text Scaling, Contrast, Reduced Motion.
- **[S03]** Apple, [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), Safe Areas, adaptive Layouts.
- **[S04]** Apple, [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), Systemfonts und Dynamic Type.
- **[S05]** Apple, [Color](https://developer.apple.com/design/human-interface-guidelines/color), semantische/adaptive Farben.
- **[S06]** Apple, [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), Liquid Glass und Content Layer.
- **[S07]** Apple, [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), zweckgebundene, abbrechbare Motion.
- **[S08]** Apple, [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics).
- **[S09]** Apple, [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy), kontextuelle Permissions.
- **[S10]** Apple, [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data) und [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields).
- **[S11]** Apple, [Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts), Passkeys und Account-Lifecycle.
- **[S12]** Apple, [Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai), Transparenz, Kontrolle, Privacy und Outputs.
- **[S13]** Apple, [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode).
- **[S14]** Apple, [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications).
- **[S15]** Apple, [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars).
- **[S16]** Google, [Material Design 3](https://m3.material.io/), inklusive M3 Expressive und Component/State Guidance.
- **[S17]** Android Developers, [Layouts and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns) und [Adapt layouts](https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout).
- **[S18]** Android Developers, [Edge-to-edge design](https://developer.android.com/design/ui/mobile/guides/layout-and-content/edge-to-edge).
- **[S19]** Android Developers, [Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views), 48-dp-Touch-Targets.
- **[S20]** Android Developers, [Color](https://developer.android.com/design/ui/mobile/guides/styles/color) und [Themes](https://developer.android.com/design/ui/mobile/guides/styles/themes).
- **[S21]** Android Developers, [Authentication & Onboarding](https://developer.android.com/design/ui/mobile/guides/patterns/onboarding) und [Passkeys](https://developer.android.com/design/ui/mobile/guides/patterns/passkeys).
- **[S22]** Android Developers, [Notifications](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications) und [Settings](https://developer.android.com/design/ui/mobile/guides/patterns/settings).
- **[S23]** Android Developers, [Haptics design principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles).
- **[S24]** Android Developers, [Predictive back design](https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back).

### Standards und Research

- **[S25]** W3C WAI, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/).
- **[S26]** W3C WAI, [Understanding SC 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **[S27]** W3C WAI, [Understanding SC 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) und [2.5.5 Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced).
- **[S28]** W3C, [Privacy Principles](https://www.w3.org/TR/privacy-principles/), Data Minimization und Kontrolle.
- **[S29]** Design Tokens Community Group, [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/).
- **[S30]** Nielsen Norman Group, [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/), zuletzt geprüft 2024.
- **[S31]** Nielsen Norman Group, [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/).
- **[S32]** Nielsen Norman Group, [Bottom Sheets: Definition and UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/), 2023.
- **[S33]** Nielsen Norman Group, [Indicators, Validations, and Notifications](https://www.nngroup.com/articles/indicators-validations-notifications/), 2024, und [Hostile Patterns in Error Messages](https://www.nngroup.com/articles/hostile-error-messages/).
- **[S34]** Nielsen Norman Group, [Powers of 10: Time Scales in UX](https://www.nngroup.com/articles/powers-of-10-time-scales-in-ux/), [Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/) und [Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/).
- **[S35]** Baymard Institute, [Product List UX Best Practices 2025](https://baymard.com/blog/current-state-product-list-and-filtering) und [Mobile UX Trends 2026](https://baymard.com/blog/mobile-ux-ecommerce).
- **[S36]** Baymard Institute, [Drop-Down Usability](https://baymard.com/blog/drop-down-usability), aktualisiert 2025.
- **[S37]** Baymard Institute, [Checkout UX Best Practices 2025](https://baymard.com/blog/current-state-of-checkout-ux) und [2024 Checkout Research Update](https://baymard.com/blog/checkout-2024-launch).
- **[S38]** Nielsen Norman Group, [Date-Input Form Fields](https://www.nngroup.com/articles/date-input/).
- **[S45]** Microsoft, [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/) und [HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/).
- **[S46]** FIDO Alliance, [UX Guidelines for Passkey Creation and Sign-ins](https://fidoalliance.org/wp-content/uploads/2023/05/FIDO-Alliance-UX-Guidelines-for-Passkey-Creation-and-Sign-ins.pdf).

### Dokumentierte App- und Produktbeispiele

- **[S39]** Meta Design, [Keeping WhatsApp fresh, simple and approachable](https://www.meta.com/design-at-meta/blog/whatsapp-user-interface-update/), 2024.
- **[S40]** Airbnb, [2025 Summer Release](https://news.airbnb.com/product-releases/airbnb-2025-summer-release), all-new app und Trips.
- **[S41]** Uber, [We’re redesigning the Uber App just for you](https://www.uber.com/us/en/newsroom/were-redesigning-the-uber-app-just-for-you/), 2023.
- **[S42]** Strava, [Redesigned Record Experience](https://press.strava.com/pb/articles/strava-launches-redesigned-record-experience), 2025, und [Creating Routes on Mobile](https://support.strava.com/en-us/articles/15401660-creating-routes-on-mobile).
- **[S43]** Notion, [A new home on mobile](https://www.notion.com/en-gb/releases/2026-05-04), 2026.
- **[S44]** OpenAI, [ChatGPT Voice](https://help.openai.com/en/articles/20001274/), mobile multimodale Interaktion und fortlaufender Kontext.

### Quellengebrauch

Plattform- und Accessibility-Angaben sollten vor Implementierung gegen die konkrete OS-/SDK-Version geprüft werden. NN/g liefert langlebige Heuristiken, Baymard starke, aber primär E-Commerce-bezogene empirische Evidenz. App-Beispiele sind Benchmark-Hypothesen. Trends und synthetisierte Defaults benötigen immer Produktvalidierung.
