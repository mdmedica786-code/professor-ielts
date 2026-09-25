/**
 * Authentic Goethe-Zertifikat B1 Writing Task Presets
 * Covers Aufgabe 1 (Informal Email), Aufgabe 2 (Forum Opinion), and Aufgabe 3 (Formal Email).
 */

export const GOETHE_WRITING_TASKS = {
  aufgabe1: [
    {
      id: 'a1_wohnung',
      taskNumber: 1,
      title: 'Neue Wohnung bezogen',
      topic: 'Wohnen & Umzug',
      register: 'Informell (du)',
      targetWords: 80,
      timeMinutes: 20,
      maxPoints: 40,
      prompt: `Sie sind vor kurzem in eine neue Wohnung gezogen und haben sich gut eingelebt. Schreiben Sie eine E-Mail an Ihre Freundin Sara.

- Beschreiben Sie Ihre neue Wohnung (Zimmer, Balkon, Lage).
- Begründen Sie, warum Ihnen die neue Nachbarschaft gefällt.
- Machen Sie einen Vorschlag für einen Besuch am Wochenende.

Schreiben Sie mindestens 80 Wörter. Achten Sie auf den Textaufbau (Anrede, Einleitung, Reihenfolge der Inhaltspunkte, Schluss).`,
      leitpunkte: [
        'Neue Wohnung beschreiben (Zimmer, Balkon, Lage)',
        'Begründen, warum die Nachbarschaft gefällt',
        'Vorschlag für einen Besuch am Wochenende machen',
      ],
      modelAnswer: `Liebe Sara,

wie geht es dir? Ich habe schon lange nichts mehr von dir gehört. Stell dir vor: Seit zwei Wochen wohne ich endlich in meiner neuen Wohnung! Sie ist zwar nicht riesig, aber sie hat einen wunderschönen Balkon und eine sehr helle Küche.

Am meisten gefällt mir die Gegend, weil es direkt vor der Haustür einen großen Park und viele gemütliche Cafés gibt. Außerdem brauche ich mit dem Fahrrad nur zehn Minuten zu meiner Arbeit.

Hast du Lust, mich nächsten Samstag zu besuchen? Dann koche ich etwas Leckeres für uns und wir können auf dem Balkon Kaffee trinken. Was meinst du? Schreib mir bald!

Liebe Grüße
Aziz`,
      modelAnalysis: `Wortzahl: ~105 Wörter. Alle 3 Leitpunkte mit je 2+ Sätzen behandelt (Erfüllung A: 10 Pkt). Klare Gliederung mit Anrede, Einleitung, Konnektoren (weil, außerdem, zwar...aber) und Gruß (Kohärenz A: 10 Pkt). Sicherer B1-Wortschatz (Wortschatz A: 10 Pkt) und korrekte Grammatik mit Nebensätzen und Perfekt (Strukturen A: 10 Pkt). Gesamt: 40/40 Punkte (Sehr gut).`,
    },
    {
      id: 'a1_kochkurs',
      taskNumber: 1,
      title: 'Kochkurs am Wochenende',
      topic: 'Essen & Freizeit',
      register: 'Informell (du)',
      targetWords: 80,
      timeMinutes: 20,
      maxPoints: 40,
      prompt: `Sie haben am vergangenen Wochenende an einem Kochkurs teilgenommen. Schreiben Sie Ihrem Freund Jonas eine E-Mail.

- Beschreiben Sie den Kochkurs (Atmosphäre, Teilnehmer, Gerichte).
- Begründen Sie, was Ihnen am besten gefallen hat und warum.
- Schlagen Sie vor, bald zusammen bei Ihnen zu kochen.

Schreiben Sie mindestens 80 Wörter. Behandeln Sie alle drei Leitpunkte.`,
      leitpunkte: [
        'Kochkurs beschreiben (Atmosphäre, Teilnehmer, Gerichte)',
        'Begründen, was am besten gefallen hat und warum',
        'Vorschlag für gemeinsames Kochen machen',
      ],
      modelAnswer: `Lieber Jonas,

danke für deine letzte Nachricht! Ich muss dir unbedingt von meinem aufregenden Wochenende erzählen. Ich habe nämlich zwei Tage lang an einem italienischen Kochkurs teilgenommen. Wir waren zehn Teilnehmer und der Koch war super sympathisch.

Zuerst haben wir frische Pasta selbst zubereitet, danach eine feine Tomatensauce. Am besten hat mir das Tiramisu gefallen, denn es war wirklich kinderleicht und hat trotzdem fantastisch geschmeckt!

Wollen wir nächste Woche zusammen kochen? Du könntest am Freitagabend zu mir kommen und ich zeige dir die Rezepte. Passt dir das?

Viele Grüße
Dilnoza`,
      modelAnalysis: `Wortzahl: ~95 Wörter. Präzise Umsetzung aller Leitpunkte, explizite Begründung mit 'denn', konkreter Vorschlag mit Wochentag. Note: 40/40 Punkte.`,
    },
    {
      id: 'a1_sportverein',
      taskNumber: 1,
      title: 'Neuer Sportverein',
      topic: 'Sport & Gesundheit',
      register: 'Informell (du)',
      targetWords: 80,
      timeMinutes: 20,
      maxPoints: 40,
      prompt: `Sie haben sich vor kurzem in einem Sportverein oder Fitnessstudio angemeldet. Schreiben Sie einem Freund / einer Freundin darüber.

- Beschreiben Sie das Training und die Trainer im Verein.
- Begründen Sie, warum regelmäßiger Sport für Sie persönlich wichtig ist.
- Laden Sie Ihren Freund / Ihre Freundin zu einem kostenlosen Probetraining ein.

Schreiben Sie mindestens 80 Wörter.`,
      leitpunkte: [
        'Training und Trainer beschreiben',
        'Begründen, warum Sport wichtig ist',
        'Zum kostenlosen Probetraining einladen',
      ],
      modelAnswer: `Lieber Tim,

wie läuft es bei dir? Ich wollte dir erzählen, dass ich mich endlich im Sportverein um die Ecke angemeldet habe. Wir trainieren zweimal pro Woche Volleyball in einer sehr netten Gruppe. Der Trainer erklärt alle Übungen mit viel Geduld.

Sport ist mir im Moment besonders wichtig, weil ich den ganzen Tag im Büro vor dem Computer sitze und oft Rückenschmerzen habe. Durch das Training fühle ich mich abends viel fitter und ausgeglichener.

Am Dienstag gibt es ein kostenloses Probetraining für neue Gäste. Hättest du Lust mitzukommen? Schreib mir kurz Bescheid!

Beste Grüße
Lukas`,
      modelAnalysis: `Wortzahl: ~95 Wörter. Alle Leitpunkte souverän abgedeckt, starker Kausalbezug (weil, durch das), einladende Frage mit Konjunktiv II (hättest du Lust).`,
    },
  ],

  aufgabe2: [
    {
      id: 'a2_handy_urlaub',
      taskNumber: 2,
      title: 'Urlaub ohne Smartphone?',
      topic: 'Medien & Freizeit',
      register: 'Öffentlich / Neutral (Forum / Gästebuch)',
      targetWords: 80,
      timeMinutes: 25,
      maxPoints: 40,
      prompt: `Sie haben im Fernsehen eine Sendung zum Thema „Urlaub ohne Smartphone?“ gesehen. Im Online-Gästebuch der Sendung lesen Sie folgenden Kommentar von Paula:

„Im Urlaub schalte ich mein Handy immer komplett aus. Nur so kann ich mich wirklich erholen und den Kopf frei bekommen. Wer ständig E-Mails checkt, hat keinen echten Urlaub.“

Schreiben Sie nun Ihre persönliche Meinung zu diesem Thema (ca. 80 Wörter). Begründen Sie Ihre Ansicht und geben Sie Beispiele aus eigener Erfahrung oder aus Ihrem Heimatland.`,
      leitpunkte: [
        'Bezug auf den Kommentar von Paula nehmen',
        'Eigene Meinung begründen',
        'Vor- und Nachteile sowie Beispiele nennen',
        'Klares Fazit ziehen',
      ],
      modelAnswer: `Ich finde dieses Thema hochaktuell, weil heutzutage fast alle Menschen ständig online sind. Einerseits kann ich Paula gut verstehen: Wer im Urlaub ständig berufliche E-Mails liest, kann sich kaum erholen und steht weiterhin unter Stress.

Andererseits ist das Smartphone auf Reisen extrem nützlich. Man braucht es zum Beispiel für digitale Fahrkarten, Stadtkarten oder zur Hotelsuche. Ich selbst schalte im Urlaub alle Arbeitsnachrichten stumm, nutze das Handy aber gerne für Fotos und Navigation.

Meiner Meinung nach sollte man das Gerät nicht völlig verbannen, sondern es einfach bewusst und sparsam einsetzen.`,
      modelAnalysis: `Wortzahl: ~95 Wörter. Kein privater Briefrahmen (korrekt für Forum!), strukturierte Argumentation mit 'einerseits...andererseits', eigener Kompromissvorschlag. Erfüllung & Kohärenz A.`,
    },
    {
      id: 'a2_homeoffice',
      taskNumber: 2,
      title: 'Homeoffice für alle?',
      topic: 'Arbeit & Beruf',
      register: 'Öffentlich / Neutral (Forum)',
      targetWords: 80,
      timeMinutes: 25,
      maxPoints: 40,
      prompt: `Sie haben in einer Wirtschaftszeitung einen Artikel zum Thema „Homeoffice für alle?“ gelesen. Im Leserforum finden Sie den Kommentar von Markus:

„Zu Hause am Schreibtisch arbeite ich viel konzentrierter und spare täglich zwei Stunden Fahrzeit. Moderne Firmen brauchen eigentlich überhaupt keine Büros mehr.“

Schreiben Sie Ihre Meinung zu diesem Thema (ca. 80 Wörter).`,
      leitpunkte: [
        'Reaktion auf den Kommentar von Markus',
        'Vorteile des Homeoffice erläutern',
        'Mögliche Probleme und Nachteile nennen',
        'Fazit / Kompromiss formulieren',
      ],
      modelAnswer: `Ich stimme der Ansicht von Markus nur teilweise zu. Natürlich hat das Homeoffice große Vorzüge: Man spart wertvolle Fahrzeit, vermeidet Staus im Berufsverkehr und kann sich die Pausen flexibler einteilen.

Trotzdem glaube ich nicht, dass traditionelle Büros überflüssig sind. Der persönliche Austausch mit den Kollegen in der Kaffeeküche lässt sich durch Videoanrufe nicht ersetzen. Außerdem fällt es vielen Menschen schwer, zu Hause die Grenze zwischen Arbeit und Freizeit zu ziehen.

Deshalb halte ich ein hybrides Modell für die beste Lösung: zwei Tage Homeoffice und drei Tage im Büro.`,
      modelAnalysis: `Wortzahl: ~90 Wörter. Klare B1-Konnektoren (natürlich, trotzdem, deshalb), differenzierte Betrachtung beider Seiten. Volle Punktzahl.`,
    },
    {
      id: 'a2_autofrei',
      taskNumber: 2,
      title: 'Autofreie Innenstädte',
      topic: 'Umwelt & Verkehr',
      register: 'Öffentlich / Neutral',
      targetWords: 80,
      timeMinutes: 25,
      maxPoints: 40,
      prompt: `Im Internet diskutieren Bürger über den Vorschlag: „Sollen Innenstädte für private Autos komplett gesperrt werden?“

Schreiben Sie einen Forumsbeitrag und äußern Sie Ihre Meinung dazu (ca. 80 Wörter).`,
      leitpunkte: [
        'Eigene Haltung zur autofreien Stadt darlegen',
        'Argumente für Umwelt und Lebensqualität',
        'Herausforderungen für Pendler oder Geschäfte',
        'Schlussfolgerung',
      ],
      modelAnswer: `Die Idee einer autofreien Innenstadt halte ich grundsätzlich für sehr sinnvoll. Ohne Autoverkehr wird die Luft spürbar sauberer und es entsteht mehr Platz für Fußgänger, Radfahrer und Straßencafés. Städte wie Kopenhagen zeigen bereits, wie attraktiv das sein kann.

Allerdings darf man ältere Menschen und Familien nicht vergessen, die auf das Auto angewiesen sind. Auch die kleinen Einzelhändler befürchten oft Kundenverluste.

Damit ein solches Konzept funktioniert, muss die Stadt zuerst preiswerte Busse und Bahnen ausbauen. Nur mit gutem Nahverkehr ist eine autofreie City gerecht für alle Bürger.`,
      modelAnalysis: `Wortzahl: ~90 Wörter. Hohe sprachliche Genauigkeit, Bedingungssatz mit 'damit', prägnantes Fazit.`,
    },
  ],

  aufgabe3: [
    {
      id: 'a3_zahnarzt',
      taskNumber: 3,
      title: 'Terminabsage beim Zahnarzt',
      topic: 'Gesundheit & Termine',
      register: 'Formell (Sie)',
      targetWords: 40,
      timeMinutes: 15,
      maxPoints: 20,
      prompt: `Sie haben morgen um 10:00 Uhr einen Termin in der Zahnarztpraxis von Dr. Klein. Wegen einer dringenden Prüfung an der Universität können Sie den Termin leider nicht wahrnehmen.

Schreiben Sie eine formelle Nachricht an die Praxis:
- Entschuldigen Sie sich höflich für die kurzfristige Absage.
- Nennen Sie den Grund für Ihre Absage.
- Bitten Sie um einen neuen Termin in der nächsten Woche am Nachmittag.

Vergessen Sie nicht die passende Anrede und Grußformel (ca. 40 Wörter)!`,
      leitpunkte: [
        'Formelle Anrede & Entschuldigung',
        'Grund nennen (Prüfung an der Universität)',
        'Um Ersatztermin nächste Woche nachmittags bitten',
        'Formeller Gruß mit vollständigem Namen',
      ],
      modelAnswer: `Sehr geehrte Damen und Herren,

leider muss ich meinen morgigen Behandlungstermin um 10 Uhr absagen, da ich kurzfristig eine wichtige Universitätsprüfung habe. Das tut mir sehr leid.

Könnten Sie mir freundlicherweise einen neuen Termin für nächste Woche vorschlagen? Am besten würde mir ein Termin am Nachmittag passen.

Vielen Dank im Voraus für Ihr Verständnis.

Mit freundlichen Grüßen
Aziz Karimov`,
      modelAnalysis: `Wortzahl: ~45 Wörter. Exakte Einhaltung der Form: Sehr geehrte Damen und Herren, Kleinschreibung nach dem Komma (leider...), Konjunktiv II der Höflichkeit (Könnten Sie mir freundlicherweise...), korrekter Gruß. 20/20 Punkte.`,
    },
    {
      id: 'a3_heizung_vermieter',
      taskNumber: 3,
      title: 'Heizungsausfall beim Vermieter melden',
      topic: 'Wohnen & Reparatur',
      register: 'Formell (Sie)',
      targetWords: 40,
      timeMinutes: 15,
      maxPoints: 20,
      prompt: `In Ihrer Mietwohnung funktioniert die Heizung seit drei Tagen nicht mehr und es ist sehr kalt. Schreiben Sie an Ihren Vermieter, Herrn Braun.

- Berichten Sie über das Problem.
- Bitten Sie um eine rasche Reparatur durch einen Handwerker.
- Teilen Sie mit, wann Sie tagsüber in der Wohnung erreichbar sind.

Schreiben Sie ca. 40 Wörter mit passender Anrede und Gruß.`,
      leitpunkte: [
        'Anrede an Herrn Braun (-r beachten!)',
        'Heizungsausfall seit drei Tagen schildern',
        'Um schnellen Techniker/Handwerker bitten',
        'Erreichbarkeitszeit nennen',
      ],
      modelAnswer: `Sehr geehrter Herr Braun,

ich schreibe Ihnen, weil in meiner Wohnung seit drei Tagen die Heizung nicht mehr funktioniert und es sehr kalt ist.

Wären Sie so freundlich, schnellstmöglich einen Handwerker zur Reparatur zu schicken? Ich bin täglich ab 16:00 Uhr zu Hause erreichbar.

Vielen Dank für Ihre Hilfe.

Mit freundlichen Grüßen
Dilnoza Rahimova`,
      modelAnalysis: `Wortzahl: ~45 Wörter. Sehr geehrter Herr Braun (-r Endung), präzise Schilderung, Höflichkeitsbitte mit Konjunktiv II (Wären Sie so freundlich...). 20/20 Punkte.`,
    },
    {
      id: 'a3_kursleiter_krank',
      taskNumber: 3,
      title: 'Krankmeldung an die Kursleiterin',
      topic: 'Schule & Kurs',
      register: 'Formell (Sie)',
      targetWords: 40,
      timeMinutes: 15,
      maxPoints: 20,
      prompt: `Sie können wegen einer starken Erkältung heute und morgen nicht am Deutschunterricht teilnehmen. Schreiben Sie Ihrer Kursleiterin, Frau Meyer.

- Entschuldigen Sie Ihr Fehlen höflich.
- Bitten Sie um die Hausaufgaben und Kursunterlagen per E-Mail.
- Kündigen Sie an, wann Sie voraussichtlich wieder am Unterricht teilnehmen können.

Schreiben Sie ca. 40 Wörter.`,
      leitpunkte: [
        'Anrede an Frau Meyer',
        'Krankheitsbedingtes Fehlen entschuldigen',
        'Um Hausaufgaben per Mail bitten',
        'Rückkehrankündigung',
      ],
      modelAnswer: `Sehr geehrte Frau Meyer,

leider bin ich an einer starken Erkältung erkrankt und kann heute sowie morgen nicht am Unterricht teilnehmen. Ich bitte um Entschuldigung.

Könnten Sie mir die heutigen Hausaufgaben und Übungen per E-Mail zuschicken? Am Montag bin ich voraussichtlich wieder fit.

Beste Grüße
Jasur Alimov`,
      modelAnalysis: `Wortzahl: ~45 Wörter. Höflich, voll funktional, fehlerfreie Grammatik. 20/20 Punkte.`,
    },
  ],
};
