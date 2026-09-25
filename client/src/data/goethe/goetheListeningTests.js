/**
 * Authentic Goethe-Zertifikat B1 Listening Mock Tests
 * 4 Teile, 30 Items, ~40 Minutes, Max 100 Points (raw score * 3.33)
 * Pass threshold: >= 18 / 30 items (>= 60 points)
 */

export const GOETHE_LISTENING_TESTS = [
  {
    id: 'b1_hoeren_test_1',
    title: 'Goethe B1 Modellsatz Hören 1',
    timeMinutes: 40,
    totalItems: 30,
    passingItems: 18,
    parts: [
      {
        partNumber: 1,
        title: 'Teil 1: Kurze Alltagsdurchsagen (wird 2× gehört)',
        instruction: 'Sie hören fünf kurze Texte. Sie hören jeden Text zweimal. Zu jedem Text lösen Sie zwei Aufgaben (eine Richtig/Falsch-Aufgabe und eine Multiple-Choice-Aufgabe a, b oder c).',
        plays: 2,
        recommendedMinutes: 10,
        tracks: [
          {
            trackNumber: 1,
            title: 'Text 1: Anrufbeantworter vom Freund',
            audioScript: `Hallo Lena, hier ist Tom. Du, mit unserem Kinobesuch heute Abend um acht klappt es leider doch nicht. Mein Chef hat mir kurzfristig noch eine wichtige Präsentation auf den Tisch gelegt und ich muss mindestens bis halb neun im Büro bleiben. Wie sieht es denn morgen bei dir aus? Da könnte ich ab halb acht vor dem Kino sein. Ruf mich bitte kurz zurück, wenn du das hörst!`,
            items: [
              {
                number: 1,
                type: 'tf',
                statement: 'Tom sagt die heutige Verabredung mit Lena ab.',
                correct: 'richtig',
                explanation: 'Richtig: Er muss länger im Büro arbeiten und kann heute um 20 Uhr nicht ins Kino.',
              },
              {
                number: 2,
                type: 'mc',
                stem: 'Wann schlägt Tom vor, sich morgen zu treffen?',
                options: [
                  { key: 'a', text: 'Um 20:00 Uhr.' },
                  { key: 'b', text: 'Um 19:30 Uhr (halb acht).' },
                  { key: 'c', text: 'Um 20:30 Uhr (halb neun).' },
                ],
                correct: 'b',
                explanation: 'Richtig ist b: „Wie sieht es denn morgen bei dir aus? Da könnte ich ab halb acht vor dem Kino sein.“',
              },
            ],
          },
          {
            trackNumber: 2,
            title: 'Text 2: Bahnhofsdurchsage',
            audioScript: `Achtung an Gleis vier: Intercity-Express 782 nach Hamburg-Altona über Hannover, planmäßige Abfahrt 14 Uhr 25, hat heute circa 25 Minuten Verspätung wegen einer Weichenstörung. Reisende nach Hannover nutzen bitte den Regionalexpress auf Gleis zwei, Abfahrt um 14 Uhr 15. Wir bitten um Entschuldigung.`,
            items: [
              {
                number: 3,
                type: 'tf',
                statement: 'Der Zug nach Hamburg fährt pünktlich um 14:25 Uhr ab.',
                correct: 'falsch',
                explanation: 'Falsch: Er hat circa 25 Minuten Verspätung.',
              },
              {
                number: 4,
                type: 'mc',
                stem: 'Fahrgäste nach Hannover …',
                options: [
                  { key: 'a', text: 'können auf Gleis 2 in einen Regionalexpress steigen.' },
                  { key: 'b', text: 'müssen bis 15:00 Uhr am Gleis 4 warten.' },
                  { key: 'c', text: 'müssen eine neue Fahrkarte am Schalter kaufen.' },
                ],
                correct: 'a',
                explanation: 'Richtig ist a: „Reisende nach Hannover nutzen bitte den Regionalexpress auf Gleis zwei...“',
              },
            ],
          },
          {
            trackNumber: 3,
            title: 'Text 3: Wetterbericht im Radio',
            audioScript: `Und nun das Deutschlandwetter für das Wochenende: Am Samstag bleibt es im Norden und Osten überwiegend bewölkt mit einzelnen Schauern bei milden 18 Grad. Am Sonntag setzt sich dann im gesamten Süden und Westen strahlender Sonnenschein durch. Die Temperaturen klettern auf sommerliche 26 Grad. Ideales Ausflugswetter für die Berge!`,
            items: [
              {
                number: 5,
                type: 'tf',
                statement: 'Am Samstag scheint in ganz Deutschland die Sonne.',
                correct: 'falsch',
                explanation: 'Falsch: Im Norden und Osten ist es bewölkt mit Schauern.',
              },
              {
                number: 6,
                type: 'mc',
                stem: 'Am Sonntag …',
                options: [
                  { key: 'a', text: 'wird es im Süden sonnig und bis zu 26 Grad warm.' },
                  { key: 'b', text: 'regnet es in ganz Süddeutschland.' },
                  { key: 'c', text: 'fallen die Temperaturen überall unter 15 Grad.' },
                ],
                correct: 'a',
                explanation: 'Richtig ist a: Sonnenschein im Süden und Westen bei 26 Grad.',
              },
            ],
          },
          {
            trackNumber: 4,
            title: 'Text 4: Durchsage im Kaufhaus',
            audioScript: `Liebe Kundinnen und Kunden, besuchen Sie heute unsere Frische-Abteilung im Untergeschoss! Nur heute erhalten Sie auf alle Bio-Molkereiprodukte und Schweizer Käsespezialitäten einen Rabatt von 20 Prozent. Außerdem lädt unsere Weinbar zur kostenlosen Verkostung regionaler Weine ein. Wir wünschen Ihnen einen angenehmen Einkauf!`,
            items: [
              {
                number: 7,
                type: 'tf',
                statement: 'Der Käserabatt gilt die ganze Woche lang.',
                correct: 'falsch',
                explanation: 'Falsch: Die Durchsage betont: „Nur heute erhalten Sie... 20 Prozent.“',
              },
              {
                number: 8,
                type: 'mc',
                stem: 'Kunden können im Kaufhaus heute …',
                options: [
                  { key: 'a', text: 'an der Weinbar Weine gratis probieren.' },
                  { key: 'b', text: 'kostenlos frischen Käse nach Hause liefern lassen.' },
                  { key: 'c', text: 'im Erdgeschoss Wein kaufen.' },
                ],
                correct: 'a',
                explanation: 'Richtig ist a: „Außerdem lädt unsere Weinbar zur kostenlosen Verkostung... ein.“',
              },
            ],
          },
          {
            trackNumber: 5,
            title: 'Text 5: Ansage einer Arztpraxis',
            audioScript: `Guten Tag, hier ist die Gemeinschaftspraxis Dr. Lindner und Dr. Franke. Unsere Praxis ist wegen Urlaubs bis einschließlich Freitag, den 18. August, geschlossen. In dringenden medizinischen Notfällen wenden Sie sich bitte an den ärztlichen Bereitschaftsdienst unter der Telefonnummer 116 117 oder an die Praxis Dr. Berger in der Bahnhofstraße 12. Ab Montag, dem 21. August, sind wir ab 8 Uhr wieder für Sie da.`,
            items: [
              {
                number: 9,
                type: 'tf',
                statement: 'Die Praxis von Dr. Lindner hat heute ganz normal geöffnet.',
                correct: 'falsch',
                explanation: 'Falsch: Die Praxis ist wegen Urlaubs bis einschließlich Freitag geschlossen.',
              },
              {
                number: 10,
                type: 'mc',
                stem: 'Wer dringend einen Arzt braucht, …',
                options: [
                  { key: 'a', text: 'kann die Vertretungspraxis Dr. Berger aufsuchen.' },
                  { key: 'b', text: 'muss bis zum 21. August warten.' },
                  { key: 'c', text: 'kann eine Nachricht auf dem Band hinterlassen.' },
                ],
                correct: 'a',
                explanation: 'Richtig ist a: Als Vertretung wird Dr. Berger in der Bahnhofstraße genannt.',
              },
            ],
          },
        ],
      },

      {
        partNumber: 2,
        title: 'Teil 2: Führung / Monolog (wird 1× gehört)',
        instruction: 'Sie hören eine Führung im Technikmuseum. Sie hören den Text einmal. Wählen Sie bei jeder Aufgabe 11–15 die richtige Lösung a, b oder c.',
        plays: 1,
        recommendedMinutes: 6,
        audioScript: `Herzlich willkommen im Städtischen Technikmuseum! Mein Name ist Carsten Vogt und ich freue mich, Ihnen heute unsere Sonderausstellung „Pioniere der Luftfahrt“ vorzustellen. Bevor wir beginnen, zwei wichtige organisatorische Hinweise: Bitte beachten Sie, dass das Fotografieren mit Blitzlicht im gesamten Museum untersagt ist. Normale Fotos ohne Blitz für den privaten Gebrauch sind jedoch überall erlaubt. 

Unsere heutige Führung dauert etwa 45 Minuten. Leider ist das zweite Obergeschoss wegen Renovierungsarbeiten der Deckenbeleuchtung heute für Besucher gesperrt; unsere historische Zeppelin-Gondel können Sie daher heute leider nicht besichtigen. Das Museumscafé im Erdgeschoss und der Souvenirladen sind aber ganz normal bis 18 Uhr geöffnet. 

Wir starten jetzt hier im Erdgeschoss mit der ersten Flugmaschine der Brüder Wright aus dem Jahr 1903...`,
        questions: [
          {
            number: 11,
            stem: 'Im Museum ist das Fotografieren …',
            options: [
              { key: 'a', text: 'generell streng verboten.' },
              { key: 'b', text: 'nur ohne Blitzlicht erlaubt.' },
              { key: 'c', text: 'nur mit einer Sondergenehmigung gestattet.' },
            ],
            correct: 'b',
            explanation: 'Richtig ist b: „Normale Fotos ohne Blitz für den privaten Gebrauch sind jedoch überall erlaubt.“',
          },
          {
            number: 12,
            stem: 'Die Führung durch die Ausstellung dauert …',
            options: [
              { key: 'a', text: 'eine halbe Stunde.' },
              { key: 'b', text: 'ungefähr 45 Minuten.' },
              { key: 'c', text: 'zwei Stunden.' },
            ],
            correct: 'b',
            explanation: 'Richtig ist b: „Unsere heutige Führung dauert etwa 45 Minuten.“',
          },
          {
            number: 13,
            stem: 'Das zweite Obergeschoss …',
            options: [
              { key: 'a', text: 'kann heute wegen Renovierung nicht besichtigt werden.' },
              { key: 'b', text: 'ist nur für Schulklassen reserviert.' },
              { key: 'c', text: 'wurde neu eröffnet.' },
            ],
            correct: 'a',
            explanation: 'Richtig ist a: Zweites OG ist wegen Renovierungsarbeiten gesperrt.',
          },
          {
            number: 14,
            stem: 'Die Besucher können heute nicht sehen: …',
            options: [
              { key: 'a', text: 'Das Museumscafé.' },
              { key: 'b', text: 'Die historische Zeppelin-Gondel.' },
              { key: 'c', text: 'Die Flugmaschine der Gebrüder Wright.' },
            ],
            correct: 'b',
            explanation: 'Richtig ist b: Die Gondel steht im gesperrten 2. Stockwerk.',
          },
          {
            number: 15,
            stem: 'Das Café im Erdgeschoss …',
            options: [
              { key: 'a', text: 'ist heute geschlossen.' },
              { key: 'b', text: 'öffnet erst um 18 Uhr.' },
              { key: 'c', text: 'steht den Gästen regulär offen.' },
            ],
            correct: 'c',
            explanation: 'Richtig ist c: „Das Museumscafé im Erdgeschoss... ist aber ganz normal bis 18 Uhr geöffnet.“',
          },
        ],
      },

      {
        partNumber: 3,
        title: 'Teil 3: Informelles Gespräch zwischen Bekannten (wird 1× gehört)',
        instruction: 'Sie hören ein Gespräch zwischen zwei Bekannten an einer Bushaltestelle. Sie hören den Text einmal. Wählen Sie für die Aufgaben 16–22: Richtig oder Falsch.',
        plays: 1,
        recommendedMinutes: 6,
        audioScript: `Mann: Hallo Sarah! Mensch, wir haben uns ja ewig nicht gesehen. Wie war denn dein großer Umzug letzte Woche?
Frau: Ach Martin, frag lieber nicht! Es war furchtbar anstrengend. Eigentlich wollte mein Bruder Paul mir mit seinem Transporter helfen. Aber er hat sich am Freitag den Fuß verstaucht und konnte überhaupt nicht auftreten.
Mann: Oje, das tut mir leid. Und wie hast du das dann geschafft?
Frau: Zum Glück habe ich spontan zwei Kolleginnen aus meiner Abteilung angerufen. Die sind sofort gekommen und haben den ganzen Samstag mit angepackt. Gegen Abend hatten wir alle Möbel in der Wohnung.
Mann: Und gefällt dir die neue Wohnung?
Frau: Die Wohnung ist ein Traum! Sie hat drei Zimmer und einen großen Südbalkon. Nur die Nachbarn unter mir sind leider etwas schwierig. Sie haben sich schon am zweiten Tag beschwert, weil ich nach 20 Uhr die Waschmaschine eingeschaltet habe.
Mann: Na ja, viele Leute sind da sehr empfindlich wegen der Hausordnung. Musst du denn noch viel renovieren?
Frau: Nein, die Wände waren schon frisch gestrichen. Ich muss nur noch eine passende Lampe für das Wohnzimmer kaufen.`,
        questions: [
          {
            number: 16,
            statement: 'Sarahs Bruder Paul hat ihr beim Tragen der Möbel geholfen.',
            correct: 'falsch',
            explanation: 'Falsch: Paul hat sich den Fuß verstaucht und konnte nicht helfen.',
          },
          {
            number: 17,
            statement: 'Zwei Arbeitskolleginnen haben Sarah beim Umzug unterstützt.',
            correct: 'richtig',
            explanation: 'Richtig: Zwei Kolleginnen aus der Abteilung halfen tatkräftig.',
          },
          {
            number: 18,
            statement: 'Sarahs neue Wohnung hat keinen Balkon.',
            correct: 'falsch',
            explanation: 'Falsch: Sie hat „einen großen Südbalkon“.',
          },
          {
            number: 19,
            statement: 'Die Nachbarn haben sich über Lärm von der Waschmaschine beklagt.',
            correct: 'richtig',
            explanation: 'Richtig: Sie beschwerten sich, weil die Waschmaschine nach 20 Uhr lief.',
          },
          {
            number: 20,
            statement: 'Sarah muss in der Wohnung noch alle Wände neu streichen.',
            correct: 'falsch',
            explanation: 'Falsch: „Die Wände waren schon frisch gestrichen.“',
          },
          {
            number: 21,
            statement: 'Sarah fehlt noch eine Lampe für das Wohnzimmer.',
            correct: 'richtig',
            explanation: 'Richtig: „Ich muss nur noch eine passende Lampe für das Wohnzimmer kaufen.“',
          },
          {
            number: 22,
            statement: 'Martin und Sarah treffen sich fast jeden Tag.',
            correct: 'falsch',
            explanation: 'Falsch: Martin sagt am Anfang: „Mensch, wir haben uns ja ewig nicht gesehen.“',
          },
        ],
      },

      {
        partNumber: 4,
        title: 'Teil 4: Radiodiskussion – Wer sagt was? (wird 2× gehört)',
        instruction: 'Sie hören ein Rundfunkgespräch zum Thema: „Sollen kleine Kinder schon mit einem Jahr in die Kinderkrippe gehen?“ Sie hören den Text zweimal. Wählen Sie bei den Aussagen 23–30: Wer sagt was? (Moderator, Frau Berger oder Herr Dr. Klein).',
        plays: 2,
        recommendedMinutes: 12,
        audioScript: `Moderator: Herzlich willkommen zu unserer Sendung „Familie heute“. Unser Thema heute: Frühe Kinderbetreuung. Bei mir im Studio begrüße ich die zweifache Mutter Frau Sandra Berger und den Kinderpsychologen Herrn Dr. Klein. Frau Berger, Sie haben Ihre beiden Kinder erst mit drei Jahren in den Kindergarten gegeben. Warum?
Frau Berger: Weil ich davon überzeugt bin, dass kleine Kinder im ersten und zweiten Lebensjahr vor allem eine feste Bezugsperson und Geborgenheit zu Hause bei den Eltern brauchen. In großen Krippengruppen mit zehn Babys ist der Lärm und Stresspegel einfach viel zu hoch für ein Einjähriges.
Dr. Klein: Das kann man so pauschal nicht sagen, Frau Berger. Moderne Krippen mit qualifizierten Erzieherinnen bieten enorme Vorteile für die soziale Entwicklung. Kinder, die früh mit Gleichaltrigen in Kontakt kommen, lernen viel schneller zu teilen, Konflikte friedlich zu lösen und entwickeln oft früher sprachliche Fähigkeiten.
Moderator: Gibt es denn wissenschaftliche Belege dafür, dass Krippenkinder im späteren Schulleben sprachlich im Vorteil sind?
Dr. Klein: Ja, zahlreiche Langzeitstudien aus Schweden und Frankreich belegen das eindeutig. Aber natürlich hängt alles von der Qualität der Betreuung ab. Ein guter Betreuungsschlüssel ist unverzichtbar.
Frau Berger: Genau da liegt doch das Problem! In vielen deutschen Städten fehlen tausende Erzieher. Oft muss eine Erzieherin sechs oder sieben Kleinkinder gleichzeitig beaufsichtigen. Wie soll man da auf jedes weinende Kind individuell eingehen?
Dr. Klein: Da stimme ich Ihnen völlig zu, Frau Berger. Die Politik muss dringend mehr Geld in die Ausbildung und faire Bezahlung von Erzieherinnen investieren. Aber Krippenplätze sind auch für Mütter unverzichtbar, um im Beruf zu bleiben und nicht in die Altersarmut abzurutschen.
Moderator: Ein wichtiger Punkt. Wie sieht es mit den Kosten für die Eltern aus? Sind Krippenplätze für Normalverdiener überhaupt bezahlbar?
Frau Berger: In manchen Bundesländern zahlt man bis zu 500 Euro monatlich für einen Platz. Das ist für junge Familien eine enorme finanzielle Belastung. Ich kenne Mütter, deren halbes Gehalt nur für den Krippenplatz draufgeht.
Dr. Klein: Deshalb fordern wir Experten seit Jahren: Bildung und Betreuung müssen von der Krippe bis zur Universität für alle Bürger beitragsfrei sein. Nur so schaffen wir echte Chancengleichheit von Anfang an.
Moderator: Liebe Gäste, ich danke Ihnen für dieses spannende Gespräch. Wir halten fest: Gute Betreuung braucht Qualität, faire Bezahlung und finanzielle Entlastung für Familien.`,
        speakers: [
          { key: 'mod', label: 'Moderator' },
          { key: 'berger', label: 'Frau Berger (Mutter)' },
          { key: 'klein', label: 'Dr. Klein (Psychologe)' },
        ],
        items: [
          {
            number: 23,
            statement: 'Kleine Kinder brauchen in den ersten zwei Jahren vor allem die Geborgenheit der Familie.',
            correct: 'berger',
            explanation: 'Frau Berger vertritt diesen Standpunkt gleich zu Beginn.',
          },
          {
            number: 24,
            statement: 'Früher Kontakt zu anderen Kindern fördert das Teilen und die Sprachentwicklung.',
            correct: 'klein',
            explanation: 'Dr. Klein betont die Vorteile für die soziale und sprachliche Entwicklung.',
          },
          {
            number: 25,
            statement: 'Fragt nach wissenschaftlichen Studien zur Sprachentwicklung von Krippenkindern.',
            correct: 'mod',
            explanation: 'Der Moderator fragt Dr. Klein gezielt nach wissenschaftlichen Belegen.',
          },
          {
            number: 26,
            statement: 'Wegen des Erziehermangels können Fachkräfte nicht individuell auf jedes Kind eingehen.',
            correct: 'berger',
            explanation: 'Frau Berger kritisiert den Personalmangel und den schlechten Betreuungsschlüssel.',
          },
          {
            number: 27,
            statement: 'Krippenplätze sind für Frauen unerlässlich, um Altersarmut zu vermeiden.',
            correct: 'klein',
            explanation: 'Dr. Klein argumentiert, dass Frauen für ihre Rente berufstätig bleiben müssen.',
          },
          {
            number: 28,
            statement: 'Hohe Monatsgebühren von bis zu 500 Euro belasten junge Familien stark.',
            correct: 'berger',
            explanation: 'Frau Berger nennt die 500 Euro Monatskosten und Gehälter.',
          },
          {
            number: 29,
            statement: 'Kinderbetreuung sollte von der Krippe bis zur Hochschule völlig kostenlos sein.',
            correct: 'klein',
            explanation: 'Dr. Klein fordert beitragsfreie Bildung für echte Chancengleichheit.',
          },
          {
            number: 30,
            statement: 'Fasst die Kernpunkte der Diskussion am Ende zusammen und dankt den Gästen.',
            correct: 'mod',
            explanation: 'Der Moderator schließt die Sendung mit einer Zusammenfassung ab.',
          },
        ],
      },
    ],
  },
];
