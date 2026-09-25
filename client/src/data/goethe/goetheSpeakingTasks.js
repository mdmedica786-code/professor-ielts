/**
 * Authentic Goethe-Zertifikat B1 Speaking Tasks
 * Covers Teil 1 (Planen, 28 pts), Teil 2 (5-Slide Presentation, 40 pts), and Teil 3 (Q&A, 16 pts).
 */

export const GOETHE_SPEAKING_TASKS = {
  teil1: [
    {
      id: 'sp1_abschiedsfeier',
      title: 'Abschiedsfeier für Frau Müller planen',
      context: 'Ihre geschätzte Deutschlehrerin, Frau Müller, verlässt die Sprachschule zum Monatsende. Sie und Ihr Prüfungspartner möchten eine schöne Überraschungs-Abschiedsfeier für sie organisieren.',
      leitpunkte: [
        'Wann feiern? (Tag, Uhrzeit nach dem Unterricht oder am Wochenende)',
        'Wo feiern? (Im Kursraum, in einem Restaurant oder im Park)',
        'Geschenk und Karte? (Was schenken, wie viel Geld pro Person einsammeln)',
        'Wer übernimmt welche Aufgaben? (Tisch reservieren, Geschenk kaufen, kleine Rede halten)',
        'Eigene Ideen: (Musik, Kuchen backen, Fotoalbum gestalten)',
      ],
      sampleDialogue: `Partner A: "Wollen wir anfangen? Wir müssen die Abschiedsfeier für Frau Müller planen. Wann könnten wir feiern?"
Partner B: "Ich schlage vor, dass wir am Freitagabend nach dem Unterricht feiern, so gegen 18:30 Uhr."
Partner A: "Freitagabend ist super. Und wo? Vielleicht im Kursraum oder lieber in einem italienischen Restaurant?"
Partner B: "Der Kursraum ist ein bisschen ungemütlich. Wir könnten in die Pizzeria neben der Schule gehen."
Partner A: "Gute Idee! Was schenken wir ihr? Blumen finde ich etwas zu wenig. Was hältst du von einem Fotobuch mit Bildern unseres Kurses?"
Partner B: "Das ist ein wunderbares Geschenk! Ich sammle zehn Euro von jedem ein und gestalte das Album."
Partner A: "Perfekt, und ich reserviere morgen den Tisch für fünfzehn Personen. Dann haben wir alles!"`,
    },
    {
      id: 'sp1_krankenbesuch',
      title: 'Besuch bei einem Mitschüler im Krankenhaus',
      context: 'Ein Kursteilnehmer aus Ihrer Gruppe, Anton, hatte einen Fahrradunfall und liegt im städtischen Krankenhaus. Planen Sie gemeinsam mit Ihrem Partner einen Besuch und wie Sie ihm danach helfen können.',
      leitpunkte: [
        'Wann hingehen? (Besuchszeiten beachten, Wochentag auswählen)',
        'Wie hinkommen? (Mit dem Bus, der Bahn oder mit dem Fahrrad)',
        'Was mitbringen? (Obst, Buch, Zeitschriften, Genesungskarte vom ganzen Kurs)',
        'Wie nach der Entlassung helfen? (Einkäufe erledigen, Notizen aus dem Unterricht mitbringen)',
        'Eigene Ideen: (Mit ihm für die anstehende Prüfung lernen)',
      ],
    },
    {
      id: 'sp1_ausflug',
      title: 'Gemeinsamen Wochenendausflug organisieren',
      context: 'Sie und Ihr Partner möchten am kommenden Wochenende mit Ihren Freunden einen Tagesausflug in die Natur oder in eine historische Nachbarstadt unternehmen.',
      leitpunkte: [
        'Wohin fahren? (In die Berge, an einen See oder Stadtbesichtigung)',
        'Verkehrsmittel? (Zugticket, Gruppenticket oder Fahrräder)',
        'Verpflegung? (Picknick mitbringen oder ins Restaurant gehen)',
        'Aktivitäten? (Wandern, Boot fahren, Sehenswürdigkeiten fotografieren)',
        'Eigene Ideen: (Wetterbericht vorab prüfen, Ersatzplan bei Regen)',
      ],
    },
  ],

  teil2: [
    {
      id: 'sp2_online_einkaufen',
      title: 'Online einkaufen – praktisch oder problematisch?',
      slides: [
        {
          number: 1,
          title: 'Thema und Struktur vorstellen',
          instruction: 'Nennen Sie Ihr Thema und stellen Sie die vier Teile Ihrer Präsentation kurz vor.',
          cue: '„Guten Tag! Ich möchte heute über das Thema ... sprechen. Meine Präsentation besteht aus vier Teilen...“',
        },
        {
          number: 2,
          title: 'Eigene persönliche Erfahrung',
          instruction: 'Berichten Sie von Ihren eigenen Erfahrungen mit Online-Bestellungen (Kleidung, Bücher, Lieferzeiten).',
          cue: '„Ich beginne mit meiner eigenen Erfahrung: Ich bestelle ziemlich oft online... Letzten Monat habe ich...“',
        },
        {
          number: 3,
          title: 'Situation im Heimatland (z.B. Usbekistan)',
          instruction: 'Beschreiben Sie, wie Menschen in Ihrem Heimatland einkaufen (Apps, Basare, Stadt vs. Land).',
          cue: '„In meinem Heimatland (z.B. Usbekistan) ist es so, dass junge Leute viele Apps nutzen, während ältere Menschen lieber auf den Basar gehen...“',
        },
        {
          number: 4,
          title: 'Vor- und Nachteile & eigene Meinung',
          instruction: 'Nennen Sie 2 Vorteile (Zeitersparnis, Vergleich) und 2 Nachteile (Verpackungsmüll, kein Anprobieren), begründen Sie Ihre Meinung.',
          cue: '„Ein großer Vorteil ist... Ein wesentlicher Nachteil ist aber... Meiner Ansicht nach sollte man...“',
        },
        {
          number: 5,
          title: 'Abschluss der Präsentation und Dank',
          instruction: 'Fassen Sie kurz zusammen, danken Sie den Zuhörern und fordern Sie zu Fragen auf.',
          cue: '„Ich komme nun zum Schluss: Zusammenfassend kann man sagen... Vielen Dank für Ihre Aufmerksamkeit! Haben Sie noch Fragen?“',
        },
      ],
      sampleScript: `Guten Tag! Ich möchte heute über das Thema „Online einkaufen – praktisch oder problematisch?“ sprechen. Meine Präsentation besteht aus vier Teilen: Zuerst erzähle ich von meiner persönlichen Erfahrung. Danach berichte ich über die Situation in meinem Heimatland. Anschließend nenne ich die wichtigsten Vor- und Nachteile und sage meine Meinung. Am Ende komme ich zum Schluss.

Ich beginne mit meiner eigenen Erfahrung: Ich kaufe recht häufig im Internet ein, vor allem Bücher und Kleidung. Letzten Monat habe ich eine Winterjacke bestellt. Leider war sie zu klein und ich musste sie zurückschicken. Das hat zwei Wochen gedauert. Seitdem achte ich sehr genau auf die Größentabelle.

Damit komme ich zur Situation in meinem Heimatland Usbekistan: In Taschkent bestellen immer mehr junge Leute über Apps und zahlen online. Auf dem Land gehen die meisten Menschen aber weiterhin am liebsten auf den traditionellen Basar, weil sie die Lebensmittel frisch riechen und die Preise direkt verhandeln möchten.

Nun zu den Vor- und Nachteilen: Ein großer Vorteil ist natürlich die Zeitersparnis. Man kann rund um die Uhr bestellen und Preise schnell vergleichen. Ein Nachteil ist jedoch der Verpackungsmüll und das Problem, dass kleine Geschäfte in den Innenstädten schließen müssen. Meiner Meinung nach ist Online-Shopping praktisch, aber man sollte lokale Läden unterstützen.

Ich komme jetzt zum Schluss. Zusammenfassend ist das Internet eine tolle Erleichterung, aber wir sollten bewusst konsumieren. Vielen Dank für Ihre Aufmerksamkeit! Haben Sie Fragen?`,
    },
    {
      id: 'sp2_haustiere',
      title: 'Haustiere – Bereicherung oder zu viel Arbeit?',
      slides: [
        {
          number: 1,
          title: 'Thema und Struktur vorstellen',
          instruction: 'Thema benennen und Gliederungspunkte ankündigen.',
          cue: '„Ich präsentiere heute das Thema: Haustiere – Bereicherung oder Belastung?...“',
        },
        {
          number: 2,
          title: 'Eigene Erfahrung',
          instruction: 'Hatten oder haben Sie selbst Tiere? Erfahrungen aus Kindheit oder Gegenwart.',
          cue: '„Als Kind hatte ich eine Katze...“',
        },
        {
          number: 3,
          title: 'Situation im Heimatland',
          instruction: 'Wie ist die Haltung von Hunden/Katzen im Heimatland? Gibt es Unterschiede zwischen Wohnungen und Häusern mit Garten?',
          cue: '„In Usbekistan halten viele Menschen im Privathaus Wachhunde...“',
        },
        {
          number: 4,
          title: 'Vor- und Nachteile & eigene Meinung',
          instruction: 'Vorteile: Freundschaft, weniger Einsamkeit, Bewegung. Nachteile: Tierarztkosten, Urlaubsorganisation, Haare/Schmutz.',
          cue: '„Tiere tun der Seele gut, aber man trägt große Verantwortung...“',
        },
        {
          number: 5,
          title: 'Abschluss & Dank',
          instruction: 'Fazit ziehen, Dank und Einladung zu Fragen.',
          cue: '„Zusammenfassend... Herzlichen Dank fürs Zuhören! Haben Sie Fragen?“',
        },
      ],
    },
    {
      id: 'sp2_stadt_land',
      title: 'Leben in der Großstadt oder auf dem Land?',
      slides: [
        {
          number: 1,
          title: 'Thema und Struktur',
          instruction: 'Thema und Aufbau erklären.',
          cue: '„Mein heutiges Thema lautet: Stadt oder Land?...“',
        },
        {
          number: 2,
          title: 'Eigene Erfahrung',
          instruction: 'Wo sind Sie aufgewachsen? Wo leben Sie jetzt?',
          cue: '„Ich bin in einer Kleinstadt aufgewachsen, lebe aber jetzt in einer Metropole...“',
        },
        {
          number: 3,
          title: 'Situation im Heimatland',
          instruction: 'Zieht die Jugend in die Großstadt? Wie lebt man auf dem Land?',
          cue: '„Viele junge Menschen ziehen wegen der Universitäten in die Hauptstadt...“',
        },
        {
          number: 4,
          title: 'Vor- und Nachteile & Meinung',
          instruction: 'Stadt: Kultur, Jobs, Verkehrsmittel vs. Lärm, teure Mieten. Land: Ruhe, Natur vs. weite Wege.',
          cue: '„In der Stadt ist alles erreichbar, aber die Hektik ist anstrengend...“',
        },
        {
          number: 5,
          title: 'Abschluss & Fragen',
          instruction: 'Kernaussage, Danksagung, Übergang zu Teil 3.',
          cue: '„Vielen Dank für Ihr Interesse! Ich beantworte nun gerne Ihre Fragen.“',
        },
      ],
    },
  ],

  teil3: {
    instructions: 'Nach der Präsentation Ihres Partners: (1) Geben Sie kurzes, wertschätzendes Feedback zum Vortrag. (2) Stellen Sie eine gezielte, offene W-Frage. (3) Wenn Sie präsentieren: Beantworten Sie die Frage Ihres Partners und die Prüferfrage ausführlich in 2-3 Sätzen mit Begründung.',
    sampleQuestions: [
      {
        topic: 'Online einkaufen',
        partnerFeedback: 'Vielen Dank für deine klare Präsentation. Besonders spannend fand ich den Vergleich zwischen Taschkent und den ländlichen Basaren.',
        partnerQuestion: 'Was kaufst du persönlich niemals im Internet und aus welchem Grund?',
        examinerQuestion: 'Glauben Sie, dass in Zukunft der Bargeldverkehr in Deutschland oder Usbekistan komplett abgeschafft wird?',
      },
      {
        topic: 'Haustiere',
        partnerFeedback: 'Deine Präsentation war sehr lebendig gestaltet. Ich fand die Anekdote über deine Katze sehr sympathisch.',
        partnerQuestion: 'Was machst du mit deinem Haustier, wenn du zwei Wochen in den Urlaub fliegen möchtest?',
        examinerQuestion: 'Sollte die Haltung von bestimmten Hunderassen in Mietskasernen verboten werden?',
      },
    ],
  },
};
