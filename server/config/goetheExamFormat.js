/**
 * Goethe-Zertifikat exam format — single source of truth for the server.
 *
 * Drives: generator prompts (text type, item type, item count per Teil),
 * grading (raw → 100 scaling, Bestehensgrenze), audio playback rules
 * (maxPlays), writing/speaking rubrics (criteria + max points).
 *
 * Item numbering runs continuously across a module, as on the real exam paper
 * (e.g. B1 Lesen Teil 2 = Aufgaben 7–12). Instruction strings use {from}/{to}
 * placeholders that are filled with those numbers.
 *
 * The client keeps a display-only mirror in
 * client/src/data/goethe/goetheGradingRules.js (GOETHE_LEVEL_SPECS[level].*.parts) —
 * keep counts/titles in sync when editing this file.
 */

// ─── Item types ───────────────────────────────────────────────────────
// Options are fixed for binary/ternary types so the LLM cannot drift.
const ITEM_TYPES = {
  richtig_falsch: { options: ["Richtig", "Falsch"] },
  ja_nein: { options: ["Ja", "Nein"] },
  rfn: { options: ["Richtig", "Falsch", "Nicht im Text"] },
  mcq3: { letters: ["a", "b", "c"] },
  mcq4: { letters: ["a", "b", "c", "d"] },
  zuordnung: {}, // items → labelled texts/options (letters), optional "0"/"X" = keine Lösung
  lueckentext_woerter: {}, // numbered gaps in a text, word bank
  lueckentext_saetze: {}, // numbered gaps in a text, sentences a–h
  wer_sagt_was: {}, // statements → speakers
  kurzantwort: {}, // free short answer, graded against accepted answers
  paar_rf_mcq: {}, // per short text: one Richtig/Falsch item + one a/b/c item
};

const BAND_FACTORS = { A: 1, B: 0.75, C: 0.5, D: 0.25, E: 0 };

// ─── Per-level format ─────────────────────────────────────────────────

const FORMAT = {
  A2: {
    lesen: {
      timeMinutes: 30,
      passRaw: 12,
      parts: [
        {
          teil: 1,
          title: "Zeitungsartikel",
          textKind: "single",
          textSpec: "Ein kurzer Zeitungsartikel (ca. 150–180 Wörter) über ein konkretes Alltagsereignis in einer Stadt (z. B. ein neues Café, ein Stadtfest, ein Sportverein).",
          qType: "mcq3",
          count: 5,
          instruction: "Lesen Sie den Text und die Aufgaben {from} bis {to}. Welche Lösung ist richtig? Kreuzen Sie an: a, b oder c.",
        },
        {
          teil: 2,
          title: "Informationstafel",
          textKind: "single",
          textSpec: "Eine Informationstafel oder ein Wegweiser (z. B. Kaufhaus mit Stockwerken, Volkshochschule mit Räumen, Bürgeramt mit Abteilungen) als übersichtliche Liste mit Etagen/Räumen und Angeboten.",
          qType: "mcq3",
          count: 5,
          instruction: "Lesen Sie die Aufgaben {from} bis {to} und die Informationstafel. Wohin gehen Sie? Kreuzen Sie an: a, b oder c.",
        },
        {
          teil: 3,
          title: "E-Mail",
          textKind: "single",
          textSpec: "Eine persönliche E-Mail (ca. 150 Wörter) an einen Freund / eine Freundin mit Neuigkeiten, Plänen und einer Einladung.",
          qType: "mcq3",
          count: 5,
          instruction: "Lesen Sie die E-Mail und die Aufgaben {from} bis {to}. Welche Lösung ist richtig? Kreuzen Sie an: a, b oder c.",
        },
        {
          teil: 4,
          title: "Anzeigen",
          textKind: "multi",
          textCount: 6,
          textLabels: ["a", "b", "c", "d", "e", "f"],
          textSpec: "Sechs kurze Kleinanzeigen / Internetanzeigen (je 25–40 Wörter) zu einem gemeinsamen Bereich (z. B. Kurse, Wohnungen, Freizeitangebote).",
          qType: "zuordnung",
          count: 5,
          noMatchOption: "X",
          instruction: "Sechs Personen suchen im Internet. Lesen Sie die Aufgaben {from} bis {to} und die Anzeigen a bis f. Welche Anzeige passt zu welcher Person? Für eine Aufgabe gibt es keine passende Anzeige. Markieren Sie hier ein X.",
        },
      ],
    },
    hoeren: {
      timeMinutes: 30,
      passRaw: 12,
      parts: [
        {
          teil: 1,
          title: "Ansagen und Telefonnachrichten",
          scriptKind: "segments",
          segmentCount: 5,
          scriptSpec: "Fünf kurze Hörtexte (je 40–70 Wörter): Telefonansagen, Durchsagen im Kaufhaus oder Bahnhof, Nachrichten auf dem Anrufbeantworter. Jeder Text hat 1–2 Sprecher.",
          qType: "mcq3",
          count: 5,
          maxPlays: 2,
          instruction: "Sie hören fünf kurze Texte. Sie hören jeden Text zweimal. Zu jedem Text gibt es eine Aufgabe. Kreuzen Sie bei jeder Aufgabe die richtige Lösung an: a, b oder c.",
        },
        {
          teil: 2,
          title: "Gespräch",
          scriptKind: "single",
          scriptSpec: "Ein Alltagsgespräch zwischen zwei Personen (ca. 250 Wörter), in dem es um fünf Personen oder fünf Tage geht (z. B. wer was zur Party mitbringt, was jemand an welchem Tag macht).",
          qType: "zuordnung",
          count: 5,
          optionCount: 9,
          maxPlays: 1,
          instruction: "Sie hören ein Gespräch. Sie hören den Text einmal. Wählen Sie für die Aufgaben {from} bis {to} eine passende Lösung aus a bis i. Wählen Sie jeden Buchstaben nur einmal.",
        },
        {
          teil: 3,
          title: "Kurze Gespräche",
          scriptKind: "segments",
          segmentCount: 5,
          scriptSpec: "Fünf kurze Alltagsdialoge (je 50–80 Wörter) an verschiedenen Orten (Bäckerei, Arztpraxis, Bahnhof, Büro, Zuhause).",
          qType: "mcq3",
          count: 5,
          maxPlays: 2,
          instruction: "Sie hören fünf kurze Gespräche. Sie hören jeden Text zweimal. Wählen Sie für die Aufgaben {from} bis {to} die richtige Lösung a, b oder c.",
        },
        {
          teil: 4,
          title: "Interview",
          scriptKind: "single",
          scriptSpec: "Ein Radiointerview (ca. 300 Wörter) mit einer Person über ihr Hobby, ihren Beruf oder ein besonderes Erlebnis. Moderator/in und Gast.",
          qType: "ja_nein",
          count: 5,
          maxPlays: 2,
          instruction: "Sie hören ein Interview. Sie hören den Text zweimal. Wählen Sie für die Aufgaben {from} bis {to} Ja oder Nein.",
        },
      ],
    },
    schreiben: {
      timeMinutes: 30,
      aufgaben: [
        {
          nr: 1,
          type: "sms",
          label: "SMS / Kurznachricht",
          register: "informell",
          words: [20, 30],
          leitpunkte: 3,
          timeHintMinutes: 10,
          maxPoints: 40,
          criteria: [
            { key: "erfuellung", label: "Erfüllung der Aufgabe", max: 20 },
            { key: "kommunikation", label: "Kommunikative Gestaltung", max: 10 },
            { key: "korrektheit", label: "Formale Richtigkeit", max: 10 },
          ],
          instruction: "Schreiben Sie eine SMS. Schreiben Sie zu allen drei Punkten. Schreiben Sie 20–30 Wörter.",
        },
        {
          nr: 2,
          type: "email_informell",
          label: "Persönliche E-Mail",
          register: "informell",
          words: [40, 50],
          leitpunkte: 3,
          timeHintMinutes: 20,
          maxPoints: 60,
          criteria: [
            { key: "erfuellung", label: "Erfüllung der Aufgabe", max: 30 },
            { key: "kommunikation", label: "Kommunikative Gestaltung", max: 15 },
            { key: "korrektheit", label: "Formale Richtigkeit", max: 15 },
          ],
          instruction: "Schreiben Sie eine E-Mail. Schreiben Sie zu allen drei Punkten. Vergessen Sie nicht Anrede und Gruß. Schreiben Sie 40–50 Wörter.",
        },
      ],
    },
    sprechen: {
      timeMinutes: 15,
      ausspracheMax: 16,
      // Vorbereitungszeit in Minuten vor dem Prüfungsgespräch (0 = Karten werden erst in der Prüfung ausgeteilt).
      prepMinutes: 0,
      teile: [
        {
          teil: 1,
          type: "fragen_zur_person",
          mode: "dialogue",
          title: "Fragen zur Person",
          durationSeconds: 180,
          criteria: [
            { key: "erfuellung", label: "Aufgabenerfüllung", max: 8 },
            { key: "wortschatz", label: "Wortschatz", max: 6 },
            { key: "strukturen", label: "Strukturen", max: 6 },
          ],
          instruction: "Sie bekommen vier Karten. Stellen Sie Ihrer Partnerin / Ihrem Partner zu jeder Karte eine Frage. Ihre Partnerin / Ihr Partner antwortet. Danach stellt Ihre Partnerin / Ihr Partner Ihnen Fragen.",
        },
        {
          teil: 2,
          type: "von_sich_erzaehlen",
          mode: "monologue",
          title: "Von sich erzählen",
          durationSeconds: 120,
          criteria: [
            { key: "erfuellung", label: "Aufgabenerfüllung", max: 12 },
            { key: "wortschatz", label: "Wortschatz", max: 8 },
            { key: "strukturen", label: "Strukturen", max: 8 },
          ],
          instruction: "Sie bekommen eine Karte mit einer Frage und vier Stichpunkten. Erzählen Sie etwas über Ihr Leben. Sprechen Sie zu allen Stichpunkten.",
        },
        {
          teil: 3,
          type: "gemeinsam_planen",
          mode: "dialogue",
          title: "Gemeinsam etwas planen (Terminkalender)",
          durationSeconds: 180,
          criteria: [
            { key: "erfuellung", label: "Aufgabenerfüllung", max: 12 },
            { key: "interaktion", label: "Interaktion", max: 8 },
            { key: "wortschatz", label: "Wortschatz", max: 8 },
            { key: "strukturen", label: "Strukturen", max: 8 },
          ],
          instruction: "Sie möchten zusammen etwas unternehmen. Sie haben beide einen Terminkalender. Finden Sie einen Termin, an dem Sie beide Zeit haben.",
        },
      ],
    },
  },

  B1: {
    lesen: {
      timeMinutes: 65,
      passRaw: 18,
      parts: [
        {
          teil: 1,
          title: "Blogbeitrag",
          textKind: "single",
          textSpec: "Ein persönlicher Blogbeitrag (ca. 350–400 Wörter) in der Ich-Form über ein Erlebnis oder eine Lebensveränderung.",
          qType: "richtig_falsch",
          count: 6,
          instruction: "Lesen Sie den Text und die Aufgaben {from} bis {to} dazu. Wählen Sie: Sind die Aussagen Richtig oder Falsch?",
        },
        {
          teil: 2,
          title: "Presseartikel",
          textKind: "multi",
          textCount: 2,
          textLabels: ["Text 1", "Text 2"],
          textSpec: "Zwei kurze Presseartikel (je ca. 200–250 Wörter) aus Zeitung oder Online-Magazin zu zwei verschiedenen gesellschaftlichen Themen. Je 3 Aufgaben pro Artikel, in Textreihenfolge.",
          qType: "mcq3",
          count: 6,
          instruction: "Lesen Sie die Texte und die Aufgaben {from} bis {to} dazu. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b oder c.",
        },
        {
          teil: 3,
          title: "Anzeigen",
          textKind: "multi",
          textCount: 10,
          textLabels: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
          textSpec: "Zehn Anzeigen (je 30–50 Wörter) aus Zeitung oder Internet zu einem Themenfeld (z. B. Kurse, Reisen, Freizeit, Jobs). Für jede Situation passt höchstens eine Anzeige; ähnliche Anzeigen als Distraktoren.",
          qType: "zuordnung",
          count: 7,
          noMatchOption: "0",
          instruction: "Lesen Sie die Situationen {from} bis {to} und die Anzeigen a bis j aus verschiedenen deutschsprachigen Medien. Wählen Sie: Welche Anzeige passt zu welcher Situation? Sie können jede Anzeige nur einmal verwenden. Für eine Aufgabe gibt es keine passende Anzeige. In diesem Fall wählen Sie 0.",
        },
        {
          teil: 4,
          title: "Leserkommentare",
          textKind: "multi",
          textCount: 7,
          textSpec: "Sieben kurze Leserkommentare (je 40–70 Wörter, mit Vorname + Stadt, z. B. „Jana, Graz“) zu einer kontroversen Frage in einer Zeitschrift. Die Kommentare sind teils dafür, teils dagegen. Jede Aufgabe lautet „Ist <Name> für <…>?“.",
          qType: "ja_nein",
          count: 7,
          instruction: "Lesen Sie die Texte {from} bis {to}. Wählen Sie: Ist die Person für das Thema? Ja oder Nein?",
        },
        {
          teil: 5,
          title: "Hausordnung / Regeln",
          textKind: "single",
          textSpec: "Eine Hausordnung, Kursordnung oder Benutzerordnung (ca. 250–300 Wörter) mit Paragraphen/Abschnitten, sachlicher Stil.",
          qType: "mcq3",
          count: 4,
          instruction: "Lesen Sie die Aufgaben {from} bis {to} und den Text dazu. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b oder c.",
        },
      ],
    },
    hoeren: {
      timeMinutes: 40,
      passRaw: 18,
      parts: [
        {
          teil: 1,
          title: "Kurze Texte",
          scriptKind: "segments",
          segmentCount: 5,
          scriptSpec: "Fünf kurze Hörtexte (je 60–90 Wörter): Nachricht auf dem Anrufbeantworter, Durchsage am Bahnhof/Flughafen, Radiowerbung, Verkehrsmeldung, Wetterbericht.",
          qType: "paar_rf_mcq",
          count: 10,
          maxPlays: 2,
          instruction: "Sie hören nun fünf kurze Texte. Sie hören jeden Text zweimal. Zu jedem Text lösen Sie zwei Aufgaben. Wählen Sie bei jeder Aufgabe die richtige Lösung.",
        },
        {
          teil: 2,
          title: "Vortrag / Führung",
          scriptKind: "single",
          scriptSpec: "Ein Monolog (ca. 350 Wörter): Führung durch ein Museum/einen Betrieb oder Ansprache einer Reiseleiterin an eine Gruppe. Eine Sprecherin / ein Sprecher.",
          qType: "mcq3",
          count: 5,
          maxPlays: 1,
          instruction: "Sie hören einen Text. Sie hören den Text einmal. Dazu lösen Sie fünf Aufgaben. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b oder c.",
        },
        {
          teil: 3,
          title: "Gespräch",
          scriptKind: "single",
          scriptSpec: "Ein informelles Gespräch (ca. 400 Wörter) zwischen zwei Bekannten an einem Alltagsort (Café, Bus, Park) über Erlebnisse und Pläne.",
          qType: "richtig_falsch",
          count: 7,
          maxPlays: 1,
          instruction: "Sie hören ein Gespräch. Sie hören das Gespräch einmal. Dazu lösen Sie sieben Aufgaben. Wählen Sie: Sind die Aussagen Richtig oder Falsch?",
        },
        {
          teil: 4,
          title: "Radiodiskussion",
          scriptKind: "single",
          scriptSpec: "Eine Radiodiskussion (ca. 550 Wörter) zu einem kontroversen Alltagsthema mit einer Moderatorin / einem Moderator und zwei Gästen mit unterschiedlichen Meinungen. Die Moderation stellt Fragen und äußert ebenfalls Positionen.",
          qType: "wer_sagt_was",
          count: 8,
          maxPlays: 2,
          instruction: "Sie hören eine Diskussion. Sie hören die Diskussion zweimal. Dazu lösen Sie acht Aufgaben. Ordnen Sie die Aussagen zu: Wer sagt was?",
        },
      ],
    },
    schreiben: {
      timeMinutes: 60,
      aufgaben: [
        {
          nr: 1,
          type: "email_informell",
          label: "Informelle E-Mail",
          register: "informell",
          words: [80, 80],
          leitpunkte: 3,
          timeHintMinutes: 20,
          maxPoints: 40,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 10 },
            { key: "kohaerenz", label: "Kohärenz", max: 10 },
            { key: "wortschatz", label: "Wortschatz", max: 10 },
            { key: "strukturen", label: "Strukturen", max: 10 },
          ],
          instruction: "Schreiben Sie eine E-Mail (circa 80 Wörter). Schreiben Sie etwas zu allen drei Punkten. Achten Sie auf den Textaufbau (Anrede, Einleitung, Reihenfolge der Inhaltspunkte, Schluss).",
        },
        {
          nr: 2,
          type: "forumsbeitrag",
          label: "Diskussionsbeitrag (Forum / Gästebuch)",
          register: "neutral",
          words: [80, 80],
          leitpunkte: 0,
          timeHintMinutes: 25,
          maxPoints: 40,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 10 },
            { key: "kohaerenz", label: "Kohärenz", max: 10 },
            { key: "wortschatz", label: "Wortschatz", max: 10 },
            { key: "strukturen", label: "Strukturen", max: 10 },
          ],
          instruction: "Schreiben Sie nun Ihre Meinung (circa 80 Wörter).",
        },
        {
          nr: 3,
          type: "email_formell",
          label: "Formelle E-Mail",
          register: "formell",
          words: [40, 40],
          leitpunkte: 2,
          timeHintMinutes: 15,
          maxPoints: 20,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 4 },
            { key: "kohaerenz", label: "Kohärenz", max: 4 },
            { key: "wortschatz", label: "Wortschatz", max: 6 },
            { key: "strukturen", label: "Strukturen", max: 6 },
          ],
          instruction: "Schreiben Sie eine E-Mail (circa 40 Wörter). Vergessen Sie nicht die Anrede und den Gruß am Schluss.",
        },
      ],
    },
    sprechen: {
      timeMinutes: 15,
      ausspracheMax: 16,
      // Vorbereitungszeit in Minuten vor dem Prüfungsgespräch (0 = Karten werden erst in der Prüfung ausgeteilt).
      prepMinutes: 15,
      teile: [
        {
          teil: 1,
          type: "gemeinsam_planen",
          mode: "dialogue",
          title: "Gemeinsam etwas planen",
          durationSeconds: 180,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 8 },
            { key: "interaktion", label: "Interaktion", max: 4 },
            { key: "wortschatz", label: "Wortschatz", max: 8 },
            { key: "strukturen", label: "Strukturen", max: 8 },
          ],
          instruction: "Sie möchten zusammen etwas planen. Sprechen Sie über die Punkte unten, machen Sie Vorschläge und reagieren Sie auf die Vorschläge Ihres Gesprächspartners / Ihrer Gesprächspartnerin. Planen und entscheiden Sie gemeinsam, was Sie tun möchten.",
        },
        {
          teil: 2,
          type: "praesentation",
          mode: "monologue",
          title: "Ein Thema präsentieren",
          durationSeconds: 180,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 12 },
            { key: "kohaerenz", label: "Kohärenz", max: 4 },
            { key: "wortschatz", label: "Wortschatz", max: 12 },
            { key: "strukturen", label: "Strukturen", max: 12 },
          ],
          instruction: "Sie sollen Ihren Zuhörern ein aktuelles Thema präsentieren. Dazu finden Sie hier fünf Folien. Folgen Sie den Anweisungen links und schreiben Sie Ihre Notizen und Ideen rechts daneben.",
        },
        {
          teil: 3,
          type: "feedback_fragen",
          mode: "dialogue",
          title: "Über ein Thema sprechen",
          durationSeconds: 120,
          criteria: [{ key: "erfuellung", label: "Erfüllung", max: 16 }],
          instruction: "Nach Ihrer Präsentation: Reagieren Sie auf die Rückmeldung und Fragen der Prüfer/-innen und Ihres Gesprächspartners / Ihrer Gesprächspartnerin. Nach der Präsentation Ihres Partners / Ihrer Partnerin: Geben Sie eine Rückmeldung zur Präsentation und stellen Sie eine Frage.",
        },
      ],
    },
  },

  B2: {
    lesen: {
      timeMinutes: 65,
      passRaw: 18,
      parts: [
        {
          teil: 1,
          title: "Meinungstexte",
          textKind: "multi",
          textCount: 4,
          textLabels: ["a", "b", "c", "d"],
          textSpec: "Vier Meinungsbeiträge (je ca. 120–150 Wörter, mit Name und Kurzbeschreibung der Person) zu einem gesellschaftlichen Thema. Jede Aussage passt genau zu einer Person; Personen können mehrmals gewählt werden.",
          qType: "zuordnung",
          count: 9,
          instruction: "Lesen Sie die Texte und die Aufgaben {from} bis {to}. Auf welche Person trifft die Aussage zu? Die Personen können mehrmals gewählt werden.",
        },
        {
          teil: 2,
          title: "Sachtext",
          textKind: "single",
          textSpec: "Ein journalistischer Sachtext (ca. 500–550 Wörter) aus einer Zeitschrift zu einem Thema aus Wissenschaft, Arbeit oder Gesellschaft.",
          qType: "mcq3",
          count: 6,
          instruction: "Lesen Sie den Text und die Aufgaben {from} bis {to}. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b oder c.",
        },
        {
          teil: 3,
          title: "Lückentext",
          textKind: "gap_sentences",
          sentenceCount: 8,
          textSpec: "Ein Zeitungstext (ca. 400–450 Wörter) mit sechs Lücken, in die jeweils ein ganzer Satz passt. Acht Sätze a–h stehen zur Auswahl; zwei davon passen nicht.",
          qType: "lueckentext_saetze",
          count: 6,
          instruction: "Lesen Sie den Text. Welche Sätze a bis h passen in die Lücken {from} bis {to}? Zwei Sätze passen nicht.",
        },
        {
          teil: 4,
          title: "Leserbriefe",
          textKind: "multi",
          textCount: 3,
          textLabels: ["Brief 1", "Brief 2", "Brief 3"],
          textSpec: "Drei Leserbriefe (je ca. 130–160 Wörter, mit Name und Ort) als Reaktion auf einen Zeitungsartikel, dessen Thema in einem Satz vorangestellt wird. Je 2 Aufgaben pro Brief.",
          qType: "mcq3",
          count: 6,
          instruction: "Lesen Sie die Leserbriefe zu einem Zeitungsartikel und die Aufgaben {from} bis {to}. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b oder c.",
        },
        {
          teil: 5,
          title: "Ordnung / Regeln",
          textKind: "single",
          textSpec: "Eine Betriebs-, Studien- oder Benutzungsordnung (ca. 300–350 Wörter) mit nummerierten Paragraphen in formellem Behördendeutsch.",
          qType: "mcq3",
          count: 3,
          instruction: "Lesen Sie den Text und die Aufgaben {from} bis {to}. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b oder c.",
        },
      ],
    },
    hoeren: {
      timeMinutes: 40,
      passRaw: 18,
      parts: [
        {
          teil: 1,
          title: "Kurze Aussagen",
          scriptKind: "segments",
          segmentCount: 5,
          scriptSpec: "Fünf kurze Hörtexte (je 80–110 Wörter): Radiomeldungen, Ansagen, kurze Äußerungen von Personen zu einem Thema, Mitteilungen auf der Mailbox.",
          qType: "paar_rf_mcq",
          count: 10,
          maxPlays: 1,
          instruction: "Sie hören fünf Texte. Sie hören jeden Text einmal. Zu jedem Text lösen Sie zwei Aufgaben. Wählen Sie bei jeder Aufgabe die richtige Lösung.",
        },
        {
          teil: 2,
          title: "Interview",
          scriptKind: "single",
          scriptSpec: "Ein Radiointerview (ca. 550 Wörter) mit einer Expertin / einem Experten zu einem Thema aus Wissenschaft, Kultur oder Beruf. Moderation und Gast.",
          qType: "mcq3",
          count: 6,
          maxPlays: 2,
          instruction: "Sie hören ein Interview. Sie hören den Text zweimal. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b oder c.",
        },
        {
          teil: 3,
          title: "Gespräch",
          scriptKind: "single",
          scriptSpec: "Ein Gespräch (ca. 500 Wörter) zwischen zwei bis drei Personen (Kolleginnen, Studierende) zu einem beruflichen oder universitären Thema mit unterschiedlichen Ansichten.",
          qType: "richtig_falsch",
          count: 6,
          maxPlays: 1,
          instruction: "Sie hören ein Gespräch. Sie hören den Text einmal. Wählen Sie: Sind die Aussagen Richtig oder Falsch?",
        },
        {
          teil: 4,
          title: "Vortrag",
          scriptKind: "single",
          scriptSpec: "Ein Vortrag (ca. 600 Wörter) einer Referentin / eines Referenten bei einer Fachveranstaltung, klar gegliedert mit Einleitung, Hauptteil und Fazit.",
          qType: "richtig_falsch",
          count: 8,
          maxPlays: 2,
          instruction: "Sie hören einen Vortrag. Sie hören den Text zweimal. Wählen Sie: Sind die Aussagen Richtig oder Falsch?",
        },
      ],
    },
    schreiben: {
      timeMinutes: 75,
      aufgaben: [
        {
          nr: 1,
          type: "forumsbeitrag",
          label: "Forumsbeitrag (Meinungsäußerung)",
          register: "neutral",
          words: [150, 150],
          leitpunkte: 4,
          timeHintMinutes: 50,
          maxPoints: 60,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 15 },
            { key: "kohaerenz", label: "Kohärenz", max: 15 },
            { key: "wortschatz", label: "Wortschatz", max: 15 },
            { key: "strukturen", label: "Strukturen", max: 15 },
          ],
          instruction: "Schreiben Sie einen Diskussionsbeitrag (circa 150 Wörter). Schreiben Sie etwas zu allen vier Punkten. Achten Sie auf den Textaufbau (Einleitung, Reihenfolge der Inhaltspunkte, Schluss).",
        },
        {
          nr: 2,
          type: "email_formell",
          label: "Formelle E-Mail (Bitte / Beschwerde)",
          register: "formell",
          words: [100, 100],
          leitpunkte: 4,
          timeHintMinutes: 25,
          maxPoints: 40,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 10 },
            { key: "kohaerenz", label: "Kohärenz", max: 10 },
            { key: "wortschatz", label: "Wortschatz", max: 10 },
            { key: "strukturen", label: "Strukturen", max: 10 },
          ],
          instruction: "Schreiben Sie eine E-Mail (circa 100 Wörter). Bringen Sie die Inhaltspunkte in eine sinnvolle Reihenfolge. Achten Sie auf Anrede, Einleitung und Gruß am Schluss.",
        },
      ],
    },
    sprechen: {
      timeMinutes: 15,
      ausspracheMax: 16,
      // Vorbereitungszeit in Minuten vor dem Prüfungsgespräch (0 = Karten werden erst in der Prüfung ausgeteilt).
      prepMinutes: 15,
      teile: [
        {
          teil: 1,
          type: "vortrag",
          mode: "monologue",
          title: "Vortrag halten",
          durationSeconds: 240,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 12 },
            { key: "kohaerenz", label: "Kohärenz", max: 10 },
            { key: "wortschatz", label: "Wortschatz", max: 10 },
            { key: "strukturen", label: "Strukturen", max: 10 },
          ],
          instruction: "Halten Sie einen Vortrag von circa vier Minuten. Beschreiben Sie das Thema (ggf. anhand der Grafik), nennen Sie Vor- und Nachteile, äußern Sie Ihre eigene Meinung und begründen Sie sie.",
        },
        {
          teil: 2,
          type: "diskussion",
          mode: "dialogue",
          title: "Diskussion führen",
          durationSeconds: 300,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 12 },
            { key: "interaktion", label: "Interaktion", max: 10 },
            { key: "wortschatz", label: "Wortschatz", max: 10 },
            { key: "strukturen", label: "Strukturen", max: 10 },
          ],
          instruction: "Diskutieren Sie mit Ihrer Partnerin / Ihrem Partner über die Frage auf der Karte. Tauschen Sie Argumente aus, reagieren Sie auf die Äußerungen Ihres Gegenübers und kommen Sie am Ende zu einem Fazit.",
        },
      ],
    },
  },

  C1: {
    lesen: {
      timeMinutes: 70,
      passRaw: 14,
      parts: [
        {
          teil: 1,
          title: "Lückentext (Wörter)",
          textKind: "gap_words",
          wordBankSize: 15,
          textSpec: "Ein anspruchsvoller Sachtext (ca. 350 Wörter) mit zehn Wortlücken. Wortbank mit 15 Wörtern (Konnektoren, Präpositionen, Nomen-Verb-Verbindungen, Fachwörter); fünf davon passen nicht.",
          qType: "lueckentext_woerter",
          count: 10,
          instruction: "Lesen Sie den Text und ergänzen Sie die Lücken {from} bis {to}. Wählen Sie aus der Wortliste das passende Wort. Fünf Wörter bleiben übrig.",
        },
        {
          teil: 2,
          title: "Sachtext",
          textKind: "single",
          textSpec: "Ein komplexer wissenschaftsjournalistischer oder feuilletonistischer Text (ca. 700–800 Wörter) mit Argumentation, Nuancen und Fachbegriffen.",
          qType: "mcq4",
          count: 10,
          instruction: "Lesen Sie den Text und die Aufgaben {from} bis {to}. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b, c oder d.",
        },
        {
          teil: 3,
          title: "Textrekonstruktion",
          textKind: "gap_sentences",
          sentenceCount: 5,
          textSpec: "Ein argumentativer Text (ca. 300 Wörter) mit zwei Lücken, in die jeweils ein ganzer Satz passt. Fünf Sätze a–e stehen zur Auswahl; drei passen nicht (inhaltlich oder wegen der Textverweise).",
          qType: "lueckentext_saetze",
          count: 2,
          instruction: "Lesen Sie den Text. Welche Sätze a bis e passen in die Lücken {from} bis {to}? Drei Sätze passen nicht.",
        },
      ],
    },
    hoeren: {
      timeMinutes: 40,
      passRaw: 12,
      parts: [
        {
          teil: 1,
          title: "Interview",
          scriptKind: "single",
          scriptSpec: "Ein anspruchsvolles Radiointerview (ca. 700 Wörter) mit einer Fachperson zu einem akademischen oder gesellschaftspolitischen Thema. Moderation und Gast.",
          qType: "rfn",
          count: 10,
          maxPlays: 2,
          instruction: "Sie hören ein Interview. Sie hören den Text zweimal. Entscheiden Sie bei den Aufgaben {from} bis {to}: Ist die Aussage richtig, falsch oder steht sie nicht im Text?",
        },
        {
          teil: 2,
          title: "Vortrag",
          scriptKind: "single",
          scriptSpec: "Ein wissenschaftlicher Vortrag (ca. 800 Wörter) mit Zahlen, Beispielen und klarer Gliederung; eine Referentin / ein Referent.",
          qType: "kurzantwort",
          count: 10,
          maxPlays: 1,
          instruction: "Sie hören einen Vortrag. Sie hören den Text einmal. Beantworten Sie beim Hören die Fragen {from} bis {to} in Stichworten.",
        },
      ],
    },
    schreiben: {
      timeMinutes: 80,
      aufgaben: [
        {
          nr: 1,
          type: "eroerterung",
          label: "Strukturierter Aufsatz / Stellungnahme",
          register: "neutral",
          words: [250, 250],
          leitpunkte: 4,
          withChart: true,
          timeHintMinutes: 50,
          maxPoints: 70,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 20 },
            { key: "kohaerenz", label: "Kohärenz", max: 15 },
            { key: "wortschatz", label: "Wortschatz", max: 20 },
            { key: "strukturen", label: "Strukturen", max: 15 },
          ],
          instruction: "Schreiben Sie einen Text (circa 250 Wörter), in dem Sie sich mit dem Thema auseinandersetzen. Gehen Sie auf alle vier Punkte ein und beziehen Sie sich – falls vorhanden – auf die Grafik.",
        },
        {
          nr: 2,
          type: "brief_formell",
          label: "Formeller Brief / Stellungnahme",
          register: "formell",
          words: [150, 150],
          leitpunkte: 4,
          timeHintMinutes: 30,
          maxPoints: 30,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 9 },
            { key: "kohaerenz", label: "Kohärenz", max: 6 },
            { key: "wortschatz", label: "Wortschatz", max: 9 },
            { key: "strukturen", label: "Strukturen", max: 6 },
          ],
          instruction: "Schreiben Sie einen formellen Brief (circa 150 Wörter). Gehen Sie auf alle Punkte ein und achten Sie auf ein angemessenes Register.",
        },
      ],
    },
    sprechen: {
      timeMinutes: 15,
      ausspracheMax: 16,
      // Vorbereitungszeit in Minuten vor dem Prüfungsgespräch (0 = Karten werden erst in der Prüfung ausgeteilt).
      prepMinutes: 15,
      teile: [
        {
          teil: 1,
          type: "vortrag",
          mode: "monologue",
          title: "Vortrag (Pro und Contra)",
          durationSeconds: 210,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 12 },
            { key: "kohaerenz", label: "Kohärenz", max: 10 },
            { key: "wortschatz", label: "Wortschatz", max: 10 },
            { key: "strukturen", label: "Strukturen", max: 10 },
          ],
          instruction: "Halten Sie einen Vortrag von drei bis vier Minuten. Stellen Sie die Problematik dar, wägen Sie Pro- und Contra-Argumente ab und entwickeln Sie einen begründeten eigenen Standpunkt.",
        },
        {
          teil: 2,
          type: "diskussion",
          mode: "dialogue",
          title: "Diskussion",
          durationSeconds: 300,
          criteria: [
            { key: "erfuellung", label: "Erfüllung", max: 12 },
            { key: "interaktion", label: "Interaktion", max: 10 },
            { key: "wortschatz", label: "Wortschatz", max: 10 },
            { key: "strukturen", label: "Strukturen", max: 10 },
          ],
          instruction: "Reagieren Sie auf den Vortrag Ihrer Partnerin / Ihres Partners, diskutieren Sie die Positionen und beantworten Sie die Fragen der Prüferin / des Prüfers ausführlich und differenziert.",
        },
      ],
    },
  },
};

const SUPPORTED_LEVELS = Object.keys(FORMAT);

function sanitizeLevel(lvl) {
  const clean = (lvl || "B1").toString().trim().toUpperCase();
  return FORMAT[clean] ? clean : "B1";
}

function getLevelFormat(level) {
  return FORMAT[sanitizeLevel(level)];
}

/** Reading/listening part with continuous item numbering (from/to) resolved. */
function getReceptivePart(level, module, teil) {
  const mod = getLevelFormat(level)[module];
  const parts = mod.parts;
  const idx = Math.min(Math.max((parseInt(teil, 10) || 1) - 1, 0), parts.length - 1);
  const from = parts.slice(0, idx).reduce((sum, p) => sum + p.count, 0) + 1;
  const part = parts[idx];
  const to = from + part.count - 1;
  return {
    ...part,
    from,
    to,
    totalParts: parts.length,
    instruction: part.instruction.replace("{from}", from).replace("{to}", to),
  };
}

function getModuleMaxRaw(level, module) {
  return getLevelFormat(level)[module].parts.reduce((sum, p) => sum + p.count, 0);
}

function getWritingAufgabe(level, nr) {
  const list = getLevelFormat(level).schreiben.aufgaben;
  return list.find((a) => a.nr === Number(nr)) || list[0];
}

function getSpeakingTeil(level, teil) {
  const list = getLevelFormat(level).sprechen.teile;
  return list.find((t) => t.teil === Number(teil)) || list[0];
}

/**
 * Official scaling: raw items → 100 points; pass needs ≥ 60 points AND, for a
 * complete module, the minimum raw score (Bestehensgrenze).
 */
function scaleReceptive(level, module, raw, maxRaw) {
  const fmt = getLevelFormat(level)[module];
  const moduleMax = getModuleMaxRaw(level, module);
  const max = maxRaw || moduleMax;
  const points100 = max > 0 ? Math.round((raw / max) * 100) : 0;
  const isFullModule = max === moduleMax;
  // For partial practice the raw threshold is applied proportionally.
  const passRaw = isFullModule ? fmt.passRaw : Math.ceil((fmt.passRaw / moduleMax) * max);
  return {
    raw,
    maxRaw: max,
    points100,
    passRaw,
    isFullModule,
    passed: points100 >= 60 && raw >= passRaw,
  };
}

function bandToPoints(band, max) {
  const factor = BAND_FACTORS[String(band || "").trim().toUpperCase()];
  return factor === undefined ? null : Math.round(factor * max * 100) / 100;
}

module.exports = {
  FORMAT,
  ITEM_TYPES,
  BAND_FACTORS,
  SUPPORTED_LEVELS,
  sanitizeLevel,
  getLevelFormat,
  getReceptivePart,
  getModuleMaxRaw,
  getWritingAufgabe,
  getSpeakingTeil,
  scaleReceptive,
  bandToPoints,
};
