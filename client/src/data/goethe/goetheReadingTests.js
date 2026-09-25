/**
 * Authentic Goethe-Zertifikat B1 Reading Mock Tests
 * 5 Teile, 30 Items, 65 Minutes, Max 100 Points (raw score * 3.33)
 * Pass threshold: >= 18 / 30 items (>= 60 points)
 */

export const GOETHE_READING_TESTS = [
  {
    id: 'b1_lesen_test_1',
    title: 'Goethe B1 Modellsatz Lesen 1',
    timeMinutes: 65,
    totalItems: 30,
    passingItems: 18,
    parts: [
      {
        partNumber: 1,
        title: 'Teil 1: Korrespondenz & Blog lesen',
        instruction: 'Lesen Sie den Blogbeitrag von Julian und die Aufgaben 1–6. Wählen Sie für jede Aufgabe: Richtig oder Falsch.',
        recommendedMinutes: 10,
        text: `Hallo Leute,

endlich finde ich Zeit, euch von unserem aufregenden Umzug nach Freiburg zu berichten! Eigentlich wollten wir schon am Samstagvormittag mit dem gemieteten Transporter losfahren, aber weil der Motor gestreikt hat, sind wir erst am Sonntagnachmittag losgekommen. 

Mein bester Freund Marco wollte uns beim Kisten-Schleppen helfen, aber er lag leider mit einer Grippe im Bett. Zum Glück kamen zwei Kolleginnen von meiner Frau spontan vorbei und haben tatkräftig mit angepackt. Gegen 21 Uhr war alles im dritten Stock – zum Glück gibt es einen Aufzug!

Unsere neue Wohnung ist zwar etwas kleiner als die alte in Hamburg, aber dafür haben wir einen herrlichen Blick auf den Schwarzwald. Vor allem gefällt mir die ruhige Lage: Vor dem Haus fahren kaum Autos und die Kinder können gefahrlos im Hof spielen. Nächste Woche müssen wir noch die Küche fertig einbauen, aber wir fühlen uns jetzt schon pudelwohl.

Herzliche Grüße,
Julian`,
        questions: [
          {
            number: 1,
            statement: 'Julian und seine Familie sind am Samstag nach Freiburg abgefahren.',
            correct: 'falsch',
            explanation: 'Falsch: Sie wollten zwar am Samstag fahren, fuhren aber wegen des kaputten Transporters erst am Sonntagnachmittag los.',
          },
          {
            number: 2,
            statement: 'Marco hat der Familie beim Tragen der Umzugskartons geholfen.',
            correct: 'falsch',
            explanation: 'Falsch: Marco lag krank mit Grippe im Bett. Stattdessen halfen zwei Kolleginnen von Julians Frau.',
          },
          {
            number: 3,
            statement: 'Das Wohnhaus in Freiburg verfügt über einen Fahrstuhl.',
            correct: 'richtig',
            explanation: 'Richtig: Der Text sagt: „Gegen 21 Uhr war alles im dritten Stock – zum Glück gibt es einen Aufzug!“',
          },
          {
            number: 4,
            statement: 'Die neue Wohnung in Freiburg hat mehr Wohnfläche als die Hamburger Wohnung.',
            correct: 'falsch',
            explanation: 'Falsch: Sie ist „etwas kleiner als die alte in Hamburg“.',
          },
          {
            number: 5,
            statement: 'Julian stört sich am dichten Straßenverkehr vor dem neuen Haus.',
            correct: 'falsch',
            explanation: 'Falsch: Ihm gefällt die ruhige Lage, „vor dem Haus fahren kaum Autos“.',
          },
          {
            number: 6,
            statement: 'Die Arbeiten an der Küche sind bereits komplett abgeschlossen.',
            correct: 'falsch',
            explanation: 'Falsch: „Nächste Woche müssen wir noch die Küche fertig einbauen“.',
          },
        ],
      },

      {
        partNumber: 2,
        title: 'Teil 2: Zwei Presseartikel verstehen',
        instruction: 'Lesen Sie die beiden Zeitungsberichte und lösen Sie die Aufgaben 7–12. Wählen Sie jeweils a, b oder c.',
        recommendedMinutes: 20,
        textA: `Text 1: Stadtbibliothek öffnet am Wochenende

Die Stadtbibliothek im Herzen von Augsburg geht neue Wege: Ab dem 1. Oktober können Bücherfreunde die Räumlichkeiten auch am Sonntag nutzen – allerdings zunächst nur für einen befristeten Testzeitraum von vier Monaten. Während dieser Sonntagsöffnung von 11 bis 17 Uhr wird kein reguläres Fachpersonal für die Ausleihe anwesend sein; stattdessen stehen Selbstbedienungsterminals und studentische Aufsichtskräfte bereit.

Bibliotheksleiter Dr. Thomas Weber betont: „Viele Familien und Berufstätige haben unter der Woche kaum Ruhe zum Stöbern. Wir wollen sehen, wie dieses Angebot angenommen wird, bevor wir über eine dauerhafte Finanzierung entscheiden.“ Bei erfolgreicher Testphase soll das Modell ab Sommer fest etabliert werden.`,
        questionsA: [
          {
            number: 7,
            stem: 'Die Stadtbibliothek Augsburg …',
            options: [
              { key: 'a', text: 'ist ab jetzt dauerhaft an jedem Sonntag geöffnet.' },
              { key: 'b', text: 'erprobt für vier Monate eine Sonntagsöffnung.' },
              { key: 'c', text: 'schließt sonntags bereits um 11 Uhr.' },
            ],
            correct: 'b',
            explanation: 'Richtig ist b: Der Text spricht von einem „befristeten Testzeitraum von vier Monaten“.',
          },
          {
            number: 8,
            stem: 'Wer die Bibliothek sonntags besucht, …',
            options: [
              { key: 'a', text: 'kann Fragen an das reguläre Fachpersonal stellen.' },
              { key: 'b', text: 'darf an diesem Tag keine Bücher ausleihen.' },
              { key: 'c', text: 'muss Bücher an Automaten selbst verbuchen.' },
            ],
            correct: 'c',
            explanation: 'Richtig ist c: Es ist kein Fachpersonal da, sondern „Selbstbedienungsterminals“.',
          },
          {
            number: 9,
            stem: 'Hauptziel der Bibliotheksleitung ist es, …',
            options: [
              { key: 'a', text: 'Berufstätigen und Familien mehr Besuchszeit zu ermöglichen.' },
              { key: 'b', text: 'Geld für studentische Aushilfen einzusparen.' },
              { key: 'c', text: 'unter der Woche die Öffnungszeiten zu kürzen.' },
            ],
            correct: 'a',
            explanation: 'Richtig ist a: „Viele Familien und Berufstätige haben unter der Woche kaum Ruhe zum Stöbern.“',
          },
        ],
        textB: `Text 2: Jugendlicher erfindet App gegen Lebensmittelverschwendung

Der 17-jährige Gymnasiast Felix Schneider aus Ulm hat eine preisgekrönte Smartphone-App entwickelt, die Bäckereien und Supermärkte mit Verbrauchern vernetzt. Täglich ab 18 Uhr können Nutzer übrig gebliebene Backwaren und frische Produkte zu einem Drittel des ursprünglichen Ladenpreises reservieren und vor Feierabend abholen.

Bereits über 40 Geschäfte in der Region Ulm beteiligen sich an dem Projekt. „Mir tat es im Herzen weh zu sehen, wie viele genießbare Brote jeden Abend in der Mülltonne landeten“, erklärt Felix. Die App ist für Kunden kostenlos nutzbar; die teilnehmenden Betriebe spenden einen kleinen Teil des Erlöses an die örtliche Tafel.`,
        questionsB: [
          {
            number: 10,
            stem: 'Die von Felix entwickelte App …',
            options: [
              { key: 'a', text: 'hilft dabei, genießbare Lebensmittel vor dem Wegwerfen zu bewahren.' },
              { key: 'b', text: 'verkauft ausschließlich neue Backwaren am Vormittag.' },
              { key: 'c', text: 'funktioniert derzeit nur in Bäckereien.' },
            ],
            correct: 'a',
            explanation: 'Richtig ist a: Ziel ist der Kampf gegen Lebensmittelverschwendung.',
          },
          {
            number: 11,
            stem: 'Kunden erhalten die Lebensmittel über die App …',
            options: [
              { key: 'a', text: 'völlig umsonst als Spende.' },
              { key: 'b', text: 'zu einem deutlich reduzierten Verkaufspreis.' },
              { key: 'c', text: 'nur, wenn sie vorher eine Gebühr für die App bezahlen.' },
            ],
            correct: 'b',
            explanation: 'Richtig ist b: „zu einem Drittel des ursprünglichen Ladenpreises“.',
          },
          {
            number: 12,
            stem: 'Die teilnehmenden Bäckereien und Supermärkte …',
            options: [
              { key: 'a', text: 'unterstützen mit einem Teil des Geldes eine soziale Einrichtung.' },
              { key: 'b', text: 'müssen Felix jeden Monat ein Gehalt zahlen.' },
              { key: 'c', text: 'dürfen keine frischen Produkte mehr verkaufen.' },
            ],
            correct: 'a',
            explanation: 'Richtig ist a: Betriebe spenden einen Teil des Erlöses an die Tafel.',
          },
        ],
      },

      {
        partNumber: 3,
        title: 'Teil 3: Anzeigen zuordnen (A–J)',
        instruction: 'Lesen Sie die 7 Situationen (13–19) und die 10 Anzeigen (A–J). Finden Sie für jede Situation die passende Anzeige. Für eine Situation gibt es keine passende Anzeige – markieren Sie in diesem Fall 0.',
        recommendedMinutes: 10,
        situations: [
          {
            number: 13,
            person: 'Marta sucht einen Salsa-Tanzkurs für absolute Einsteiger am Wochenende.',
            correct: 'F',
            explanation: 'Anzeige F: Salsa für Anfänger samstags 10-12 Uhr.',
          },
          {
            number: 14,
            person: 'David möchte am Abend sein gebrochenes Smartphone-Display reparieren lassen.',
            correct: 'A',
            explanation: 'Anzeige A: Handy-Sofortreparatur bis 20 Uhr Express.',
          },
          {
            number: 15,
            person: 'Frau Bauer sucht eine günstige 1-Zimmer-Wohnung mit Balkon im Grünen.',
            correct: 'H',
            explanation: 'Anzeige H: Ruhiges 1-Zimmer-Appartement am Stadtwald mit Südbalkon.',
          },
          {
            number: 16,
            person: 'Lukas möchte am Sonntagvormittag sein gebrauchtes Fahrrad auf einem Flohmarkt verkaufen.',
            correct: 'C',
            explanation: 'Anzeige C: Riesen-Rad- und Trödelmarkt jeden Sonntag ab 8 Uhr für private Verkäufer.',
          },
          {
            number: 17,
            person: 'Elena möchte einen Deutsch-Konversationskurs auf C1-Niveau für Mediziner belegen.',
            correct: '0',
            explanation: 'Keine Anzeige passt: Die Sprachschulen bieten nur B1/B2 oder allgemeines Deutsch an, keinen Fachsprachkurs C1 Medizin -> daher "0".',
          },
          {
            number: 18,
            person: 'Herr Weber sucht einen Ganztagsbetreuungsplatz für seinen 2-jährigen Sohn.',
            correct: 'B',
            explanation: 'Anzeige B: Private Kinderkrippe "Zwergenland" für Kleinkinder von 1 bis 3 Jahren, 7-17 Uhr.',
          },
          {
            number: 19,
            person: 'Julia möchte Bio-Gemüse direkt vom Bauernhof im Umland abonnieren.',
            correct: 'E',
            explanation: 'Anzeige E: Bio-Kiste frisch vom Hof direkt nach Hause geliefert.',
          },
        ],
        ads: [
          { key: 'A', text: 'SmartRepair Express: Display-, Akku- und Wasserschadenservice für alle Marken. Mo–Sa bis 20:00 Uhr ohne Voranmeldung!' },
          { key: 'B', text: 'Kita & Krippe Zwergenland: Liebevolle Ganztagsbetreuung für Kinder von 1–3 Jahren. Freie Plätze ab November. Mo–Fr 7:00–17:00 Uhr.' },
          { key: 'C', text: 'Großer Sonntagsflohmarkt auf dem Messegelände: Private Verkäufer von Fahrrädern, Kleidung und Trödel willkommen! So 8–15 Uhr.' },
          { key: 'D', text: 'Tango Argentino für Fortgeschrittene: Meisterkurs mit Gastlehrer aus Buenos Aires. Donnerstags 20:00 Uhr.' },
          { key: 'E', text: 'Öko-Hof Sonnenschein: Wöchentliche Bio-Gemüsekiste frisch geerntet aus der Region. Flexible Lieferung bis an Ihre Haustür.' },
          { key: 'F', text: 'Tanzstudio Ritmo: Salsa für Einsteiger ohne Vorkenntnisse! Samstagskurs 10:00–12:00 Uhr. Einstieg jederzeit möglich.' },
          { key: 'G', text: 'Sprachenkolleg: Vorbereitungskurse Goethe B2 und TestDaF. Abendunterricht Mo & Mi.' },
          { key: 'H', text: 'Schöne 1-Zi.-Wohnung in Waldnähe: 38 qm, Kochnische, sonniger Südbalkon, ruhig im Grünen gelegen. 420 € warm.' },
          { key: 'I', text: 'Werkstatt Schrauberglück: Reparatur von Waschmaschinen und Haushaltsgeräten vor Ort.' },
          { key: 'J', text: 'Second-Hand-Boutique Vintage Chic: Hochwertige Markenkleidung zu fairen Preisen. Di–Sa 10–18 Uhr.' },
        ],
      },

      {
        partNumber: 4,
        title: 'Teil 4: Leserbriefe & Meinungen (Ja/Nein)',
        instruction: 'In einer Zeitschrift lesen Sie Kommentare zu der Frage: „Sollte man privates Feuerwerk zu Silvester komplett verbieten?“ Wählen Sie für jede Person Ja (für ein Verbot) oder Nein (gegen ein Verbot).',
        recommendedMinutes: 15,
        centralQuestion: 'Ist die Person für ein Verbot von privatem Silvesterfeuerwerk?',
        items: [
          {
            number: 20,
            author: 'Sabine (42), Tierärztin',
            comment: 'Jedes Jahr erlebe ich am 31. Dezember die pure Panik bei Hunden, Katzen und Wildtieren. Dazu kommen hunderte verletzte Finger in den Notaufnahmen. Eine traditionelle Lasershow der Stadt wäre tausendmal schöner und sicherer.',
            correct: 'ja',
            explanation: 'Sabine ist für ein Verbot (Ja): Weist auf Tierquälerei und Verletzungen hin und fordert städtische Lasershows.',
          },
          {
            number: 21,
            author: 'Markus (28), Kaufmann',
            comment: 'Natürlich muss man vorsichtig sein. Aber Silvester ohne Knaller und Raketen ist für mich einfach kein richtiger Jahreswechsel. Das gehört seit Jahrhunderten zu unserer Kultur. Man kann doch nicht alles Schöne im Leben verbieten!',
            correct: 'nein',
            explanation: 'Markus ist gegen ein Verbot (Nein): Sieht Feuerwerk als jahrhundertealte Tradition und warnt vor Verboten.',
          },
          {
            number: 22,
            author: 'Monika (65), Rentnerin',
            comment: 'Die Straßen sind am Neujahrsmorgen voller giftigem Plastikmüll und die Feinstaubbelastung ist enorm gesundheitsschädlich. Wer sein Geld unbedingt verbrennen will, soll es lieber für bedürftige Kinder spenden.',
            correct: 'ja',
            explanation: 'Monika ist für ein Verbot (Ja): Kritisiert Müll und Feinstaub, fordert Spenden statt Böllerei.',
          },
          {
            number: 23,
            author: 'Florian (35), Familienvater',
            comment: 'Ich kaufe jedes Jahr mit meinen beiden Söhnen ein kleines Jugendfeuerwerk. Die leuchtenden Augen der Kinder um Mitternacht sind unbezahlbar. Wenn man sich an die Altersgrenzen hält, ist das völlig harmlos.',
            correct: 'nein',
            explanation: 'Florian ist gegen ein Verbot (Nein): Erfreut sich an Kinderfeuerwerk und hält es bei Einhaltung der Regeln für harmlos.',
          },
          {
            number: 24,
            author: 'Tobias (30), Rettungssanitäter',
            comment: 'In der Silvesternacht werden meine Kollegen und ich regelmäßig mit Böllern attackiert. Wir kommen kaum hinterher mit dem Verbinden von Verbrennungen. Ein privates Verkaufsverbot ist längst überfällig.',
            correct: 'ja',
            explanation: 'Tobias ist für ein Verbot (Ja): Angriffe auf Rettungskräfte und schwere Verletzungen; Verbot überfällig.',
          },
          {
            number: 25,
            author: 'Karin (51), Unternehmerin',
            comment: 'Ein striktes Verbot treibt die Leute nur dazu, illegale und gefährliche Böller auf dem Schwarzmarkt im Ausland zu kaufen. Sinnvoller wären kontrollierte Zonen, wo gefeiert werden darf.',
            correct: 'nein',
            explanation: 'Karin ist gegen ein Verbot (Nein): Warnt vor Schwarzmarkt und bevorzugt erlaubte Zonen statt Komplettverbot.',
          },
          {
            number: 26,
            author: 'Daniel (24), Student',
            comment: 'Es ist absurd, wie viele Millionen Euro innerhalb von dreißig Minuten in Rauch aufgehen, während wir gleichzeitig über Klimaschutz debattieren. Private Böllerei gehört schlicht abgeschafft.',
            correct: 'ja',
            explanation: 'Daniel ist für ein Verbot (Ja): Geldverschwendung und Klimaschutz sprechen für eine Abschaffung.',
          },
        ],
      },

      {
        partNumber: 5,
        title: 'Teil 5: Hausordnung & Vorschriften verstehen',
        instruction: 'Lesen Sie den Auszug aus der Haus- und Brandschutzordnung eines Studentenwohnheims und lösen Sie die Aufgaben 27–30. Wählen Sie jeweils a, b oder c.',
        recommendedMinutes: 10,
        text: `Haus- und Brandschutzordnung der Wohnanlage Campusblick

§ 3 Ruhezeiten und Lärmschutz
(1) Im gesamten Gebäude und auf dem Außengelände gilt tägliche Nachtruhe von 22:00 bis 07:00 Uhr. In diesem Zeitraum sind Feiern, laute Musik und ruhestörende Tätigkeiten strengstens untersagt. 
(2) Während der akademischen Prüfungsmonate (Januar/Februar und Juni/Juli) ist auf den Wohnetagen ganztägig auf Zimmerlautstärke zu achten.

§ 7 Brandschutz und Fluchtwege
(1) Das Abstellen von Fahrrädern, Kartons oder Schuhen auf den Fluren und in den Treppenhäusern ist ausnahmslos verboten, da diese als Fluchtwege dienen. Zuwiderhandlungen werden nach einmaliger Verwarnung mit einer Räumungsgebühr von 50 € geahndet.
(2) Offenes Feuer, einschließlich Kerzen und Shisha-Pfeifen, ist in den Studentenzimmern streng untersagt. Grillen ist ausschließlich auf dem ausgewiesenen Grillplatz im Garten gestattet.`,
        questions: [
          {
            number: 27,
            stem: 'Während der Prüfungsmonate im Januar und Juni …',
            options: [
              { key: 'a', text: 'gilt die Nachtruhe erst ab 24:00 Uhr.' },
              { key: 'b', text: 'müssen die Bewohner den ganzen Tag über leise sein.' },
              { key: 'c', text: 'sind Partys im Garten erlaubt.' },
            ],
            correct: 'b',
            explanation: 'Richtig ist b: „...ist auf den Wohnetagen ganztägig auf Zimmerlautstärke zu achten.“',
          },
          {
            number: 28,
            stem: 'Gegenstände im Treppenhaus …',
            options: [
              { key: 'a', text: 'dürfen dort unter keinen Umständen gelagert werden.' },
              { key: 'b', text: 'sind erlaubt, wenn sie mit einem Namensschild versehen sind.' },
              { key: 'c', text: 'dürfen nur am Wochenende abgestellt werden.' },
            ],
            correct: 'a',
            explanation: 'Richtig ist a: Das Abstellen ist „ausnahmslos verboten, da diese als Fluchtwege dienen.“',
          },
          {
            number: 29,
            stem: 'Wer Gegenstände nicht aus dem Flur wegräumt, …',
            options: [
              { key: 'a', text: 'verliert sofort seinen Wohnheimplatz.' },
              { key: 'b', text: 'erhält sofort ein Bußgeld von 50 € ohne Vorwarnung.' },
              { key: 'c', text: 'muss nach einer ersten Mahnung eine Gebühr bezahlen.' },
            ],
            correct: 'c',
            explanation: 'Richtig ist c: „nach einmaliger Verwarnung mit einer Räumungsgebühr von 50 € geahndet.“',
          },
          {
            number: 30,
            stem: 'Das Anzünden von Kerzen im eigenen Zimmer …',
            options: [
              { key: 'a', text: 'ist nur in Anwesenheit anderer Bewohner erlaubt.' },
              { key: 'b', text: 'ist aus Brandschutzgründen verboten.' },
              { key: 'c', text: 'ist überall im Wohnheim gestattet.' },
            ],
            correct: 'b',
            explanation: 'Richtig ist b: „Offenes Feuer, einschließlich Kerzen..., ist in den Studentenzimmern streng untersagt.“',
          },
        ],
      },
    ],
  },
];
