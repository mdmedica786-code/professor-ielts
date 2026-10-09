/**
 * Official Goethe-Zertifikat Multi-Level (A1, A2, B1, B2, C1) Grading Rules & Specifications
 */

export const GOETHE_LEVEL_SPECS = {
  A1: {
    key: 'A1',
    label: 'Goethe-Zertifikat A1',
    subLabel: 'Start Deutsch 1',
    targetAudience: 'Elementare Sprachverwendung (Anfänger)',
    lesen: {
      timeMinutes: 25,
      totalQuestions: 15,
      maxRaw: 15,
      partsCount: 3,
      passRaw: 9,
      partsDesc: 'Teil 1: 2 kurze Notizen/Mails (R/F) · Teil 2: 2 Kleinanzeigen/Websuche (a/b) · Teil 3: 5 Hinweisschilder/Aushänge (R/F)',
    },
    hoeren: {
      timeMinutes: 20,
      totalQuestions: 15,
      maxRaw: 15,
      partsCount: 3,
      passRaw: 9,
      partsDesc: 'Teil 1: 6 kurze Alltagsgespräche (2×, a/b/c) · Teil 2: 4 Durchsagen Bahnhof/Flughafen (1×, R/F) · Teil 3: 5 Telefonnachrichten (2×, a/b/c)',
    },
    schreiben: {
      timeMinutes: 20,
      partsCount: 2,
      maxPoints: 100,
      partsDesc: 'Teil 1: Formular ergänzen (5 Angaben, 25 Pkt) · Teil 2: Kurze Nachricht/E-Mail (~30 Wörter, 75 Pkt)',
    },
    sprechen: {
      timeMinutes: 15,
      partsCount: 3,
      maxPoints: 100,
      partsDesc: 'Teil 1: Sich vorstellen & buchstabieren · Teil 2: Um Informationen bitten & reagieren · Teil 3: Bitten formulieren & reagieren',
    },
  },
  A2: {
    key: 'A2',
    label: 'Goethe-Zertifikat A2',
    subLabel: 'Grundlegende Kenntnisse',
    targetAudience: 'Elementare Sprachverwendung (Fortgeschrittene Anfänger)',
    lesen: {
      timeMinutes: 30,
      totalQuestions: 20,
      maxRaw: 20,
      partsCount: 4,
      passRaw: 12,
      partsDesc: 'Teil 1: E-Mail / Brief (a/b/c) · Teil 2: Informationsbroschüre (Zuordnung) · Teil 3: Kleinanzeigen (Zuordnung) · Teil 4: Schilder & Notizen',
    },
    hoeren: {
      timeMinutes: 30,
      totalQuestions: 20,
      maxRaw: 20,
      partsCount: 4,
      passRaw: 12,
      partsDesc: 'Teil 1: 5 Alltagsgespräche (2×, a/b/c) · Teil 2: Radio-/Veranstaltungsinfos (1×, Zuordnung) · Teil 3: Kurzdialoge (1×, a/b/c) · Teil 4: Radiointerview (2×, Ja/Nein)',
    },
    schreiben: {
      timeMinutes: 30,
      partsCount: 2,
      maxPoints: 100,
      partsDesc: 'Teil 1: SMS / Kurznachricht (~20-30 Wörter) · Teil 2: Persönliche E-Mail (~40-50 Wörter)',
    },
    sprechen: {
      timeMinutes: 15,
      partsCount: 3,
      maxPoints: 100,
      partsDesc: 'Teil 1: Fragen zur Person austauschen · Teil 2: Von sich erzählen (Monolog) · Teil 3: Gemeinsam etwas aushandeln / planen',
    },
  },
  B1: {
    key: 'B1',
    label: 'Goethe-Zertifikat B1',
    subLabel: 'Selbstständige Sprachverwendung',
    targetAudience: 'Alltag, Beruf & Einbürgerung',
    lesen: {
      timeMinutes: 65,
      totalQuestions: 30,
      maxRaw: 30,
      partsCount: 5,
      passRaw: 18,
      partsDesc: 'Teil 1: Blog/Erfahrungsbericht (R/F & a/b/c) · Teil 2: 2 Presseartikel (a/b/c) · Teil 3: Anzeigenzuordnung A–J · Teil 4: Meinungen (Ja/Nein) · Teil 5: Hausordnung/Richtlinien',
    },
    hoeren: {
      timeMinutes: 40,
      totalQuestions: 30,
      maxRaw: 30,
      partsCount: 4,
      passRaw: 18,
      partsDesc: 'Teil 1: 5 kurze Ansagen (2×, R/F + a/b/c) · Teil 2: Vortrag/Führung (1×, a/b/c) · Teil 3: Gespräch (1×, R/F) · Teil 4: Radiodiskussion „Wer sagt was?“ (2×)',
    },
    schreiben: {
      timeMinutes: 60,
      partsCount: 3,
      maxPoints: 100,
      partsDesc: 'Aufgabe 1: Informelle E-Mail (~80 W, 40 Pkt) · Aufgabe 2: Diskussionsbeitrag Forum (~80 W, 40 Pkt) · Aufgabe 3: Formelle E-Mail (~40 W, 20 Pkt)',
    },
    sprechen: {
      timeMinutes: 15,
      partsCount: 3,
      maxPoints: 100,
      partsDesc: 'Teil 1: Gemeinsam etwas planen (28 Pkt) · Teil 2: 5-Folien-Präsentation (40 Pkt) · Teil 3: Fragen & Feedback (16 Pkt) · Aussprache (16 Pkt)',
    },
  },
  B2: {
    key: 'B2',
    label: 'Goethe-Zertifikat B2',
    subLabel: 'Fortgeschrittenes Deutsch',
    targetAudience: 'Studium, Beruf & Fachsprache',
    lesen: {
      timeMinutes: 65,
      totalQuestions: 30,
      maxRaw: 30,
      partsCount: 5,
      passRaw: 18,
      partsDesc: 'Teil 1: 4 Meinungsbeiträge zuordnen · Teil 2: Lückentext mit Satzeinschüben (a–h) · Teil 3: Sachtext (a/b/c) · Teil 4: Leserbriefe · Teil 5: Studien- oder Arbeitsordnung',
    },
    hoeren: {
      timeMinutes: 40,
      totalQuestions: 30,
      maxRaw: 30,
      partsCount: 4,
      passRaw: 18,
      partsDesc: 'Teil 1: 5 kurze Gespräche/Mitteilungen · Teil 2: Radio-Interview (1×, a/b/c) · Teil 3: Gesprächsrunde mit 3 Personen (1×) · Teil 4: Vortrag/Vorlesung (2×, a/b/c)',
    },
    schreiben: {
      timeMinutes: 75,
      partsCount: 2,
      maxPoints: 100,
      partsDesc: 'Aufgabe 1: Diskussionsbeitrag / Meinungsäußerung (~150 W, 60 Pkt) · Aufgabe 2: Formelle Bitte- oder Beschwerde-E-Mail (~100 W, 40 Pkt)',
    },
    sprechen: {
      timeMinutes: 15,
      partsCount: 2,
      maxPoints: 100,
      partsDesc: 'Teil 1: Vortrag zu einem Thema abwägen (~4 Min, 50 Pkt) · Teil 2: Kontroverse Diskussion mit Partner (~5 Min, 50 Pkt)',
    },
  },
  C1: {
    key: 'C1',
    label: 'Goethe-Zertifikat C1',
    subLabel: 'Fachkundige Sprachkenntnisse',
    targetAudience: 'Akademische Laufbahn & Hochschulzugang',
    lesen: {
      timeMinutes: 70,
      totalQuestions: 22,
      maxRaw: 22,
      partsCount: 3,
      passRaw: 14,
      partsDesc: 'Teil 1: Komplexer Sachtext / Zuordnung · Teil 2: Textrekonstruktion & Zusammenfassung · Teil 3: Wissenschaftlicher / essayistischer Fachtext',
    },
    hoeren: {
      timeMinutes: 40,
      totalQuestions: 20,
      maxRaw: 20,
      partsCount: 2,
      passRaw: 12,
      partsDesc: 'Teil 1: Fachgespräch mit Notiznahme · Teil 2: Ausführliches Fachinterview · Teil 3: Akademischer Vortrag / Vorlesungsmitschrift',
    },
    schreiben: {
      timeMinutes: 80,
      partsCount: 2,
      maxPoints: 100,
      partsDesc: 'Aufgabe 1: Freie strukturierte Stellungnahme mit Leitpunkten (~220 W, 70 Pkt) · Aufgabe 2: Formeller Brief / Stellungnahme (~100 W, 30 Pkt)',
    },
    sprechen: {
      timeMinutes: 15,
      partsCount: 2,
      maxPoints: 100,
      partsDesc: 'Teil 1: Monologischer Fachvortrag (~3-4 Min, 50 Pkt) · Teil 2: Debatte / Argumentativer Diskurs mit Partner (~5 Min, 50 Pkt)',
    },
  },
};

/**
 * Level-aware scoring for Goethe Reading and Listening modules.
 */
export function calculateGoetheReadingListeningScore(rawCorrect, level = 'B1', module = 'lesen') {
  const spec = GOETHE_LEVEL_SPECS[level] || GOETHE_LEVEL_SPECS.B1;
  const maxRaw = spec[module]?.maxRaw || 30;
  const passRaw = spec[module]?.passRaw || 18;

  const raw = Math.max(0, Math.min(maxRaw, parseInt(rawCorrect, 10) || 0));
  const points100 = Math.min(100, Math.round((raw / maxRaw) * 100));
  const passed = raw >= passRaw && points100 >= 60;

  return {
    raw,
    maxRaw,
    points100,
    passed,
    level,
    praedikat: getPraedikat(points100),
  };
}

export function getPraedikat(scoreOutOf100) {
  const s = Math.round(scoreOutOf100);
  if (s >= 90) return { key: 'sehr_gut', label: 'Sehr gut', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (s >= 80) return { key: 'gut', label: 'Gut', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
  if (s >= 70) return { key: 'befriedigend', label: 'Befriedigend', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (s >= 60) return { key: 'ausreichend', label: 'Ausreichend (Bestanden)', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' };
  return { key: 'nicht_bestanden', label: 'Nicht bestanden', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' };
}

export const SCHREIBEN_CHECKLIST = [
  {
    criterion: 'Erfüllung',
    description: 'Sind alle Leitpunkte ausgeführt? Textsorte und Register (du/Sie, Anrede, Gruß) korrekt eingehalten? Wortzahl erreicht?',
    bands: { A: 'Alle Punkte voll erfüllt (10 Pkt)', B: 'Ein Punkt etwas dünn (7.5 Pkt)', C: 'Punkte nur knapp/teilweise (5 Pkt)', D: 'Nur 1 Punkt behandelt (2.5 Pkt)', E: 'Thema verfehlt / <50% Worte (0 Pkt -> Knockout)' },
  },
  {
    criterion: 'Kohärenz',
    description: 'Logischer Aufbau (Einleitung, Übergänge, Schluss)? Abwechslungsreiche Konnektoren?',
    bands: { A: 'Sehr flüssig & logisch verknüpft (10 Pkt)', B: 'Weitgehend logisch, wenige Wortwiederholungen (7.5 Pkt)', C: 'Stellenweise sprunghaft (5 Pkt)', D: 'Kaum Zusammenhalt (2.5 Pkt)', E: 'Völlig unstrukturiert (0 Pkt)' },
  },
  {
    criterion: 'Wortschatz',
    description: 'Passender thematischer Wortschatz zum CEFR-Niveau? Kollokationen und Präzision?',
    bands: { A: 'Breiter differenzierter Wortschatz (10 Pkt)', B: 'Angemessen für Niveau mit kleinen Lücken (7.5 Pkt)', C: 'Unterhalb des Zielniveaus (5 Pkt)', D: 'Stark eingeschränkt (2.5 Pkt)', E: 'Ungenügend (0 Pkt)' },
  },
  {
    criterion: 'Strukturen',
    description: 'Grammatische Richtigkeit, Satzbau, Verbstellung, Tempus- und Kasusformen?',
    bands: { A: '0–1 Fehler pro 20 Wörter (10 Pkt)', B: '2–3 Fehler pro 20 Wörter, Sinn klar (7.5 Pkt)', C: '4–5 Fehler, Lesefluss gestört (5 Pkt)', D: 'Häufige elementare Fehler (2.5 Pkt)', E: 'Kaum korrekte Sätze (0 Pkt)' },
  },
];

export const SPRECHEN_CHECKLIST = [
  {
    part: 'Interaktion mit dem Partner',
    checks: [
      'Aktiv auf die Aussagen und Vorschläge des Partners eingegangen?',
      'Eigene Vorschläge begründet und Gegenargumente höflich formuliert?',
      'Gemeinsame Einigung oder strukturierte Diskussionsführung erzielt?',
      'Rückfragen gestellt („Was meinst du dazu?“, „Wie siehst du das?“)?',
    ],
  },
  {
    part: 'Aufgabenbewältigung & Inhalt',
    checks: [
      'Alle vorgegebenen Leitpunkte oder Themenaspekte behandelt?',
      'Klare inhaltliche Strukturierung mit Einleitung und Fazit?',
      'Angemessene Redezeit eingehalten ohne Monologisieren?',
    ],
  },
  {
    part: 'Ausdruck & Wortschatz',
    checks: [
      'Niveaugerechte Redemittel (Aushandeln, Zustimmen, Widersprechen) genutzt?',
      'Präziser Fach- oder Alltagswortschatz ohne ständige Wiederholungen?',
      'Flüssiger Sprachfluss mit passenden Konnektoren?',
    ],
  },
  {
    part: 'Aussprache & Intonation',
    checks: [
      'Klare Artikulation deutscher Vokale und Umlaute (ä, ö, ü, eu)?',
      'Korrekte Satzmelodie (Frage vs. Aussage vs. Aufforderung)?',
      'Angemessenes Sprechtempo und Betonung?',
    ],
  },
];

export const EIGHT_WEEK_STUDY_PLAN = [
  {
    week: 1,
    title: 'Woche 1: Fundament & Diagnostik',
    focus: 'Lesen Teil 1 & 5 · Hören Teil 1 · Schreiben Aufgabe 3 (Formell) · Sprechen Rahmenstruktur',
    topics: 'C1 Person & Identität, C2 Wohnen, C3 Umwelt',
    grammar: 'Perfekt (haben vs. sein), Verbstellung in Nebensätzen (weil, dass)',
  },
  {
    week: 2,
    title: 'Woche 2: Zuordnen & Planen',
    focus: 'Lesen Teil 3 (Anzeigen) · Hören Teil 3 (Gespräche 1x) · Schreiben Aufgabe 1 (Informell) · Sprechen Teil 1 Planen',
    topics: 'C4 Reisen & Verkehr, C5 Essen & Trinken, C6 Einkaufen',
    grammar: 'Konjunktiv II (könnten, würden, hätten, wären), Modalverben im Präteritum',
  },
  {
    week: 3,
    title: 'Woche 3: Meinungen & Argumentation',
    focus: 'Lesen Teil 4 (Ja/Nein) · Hören Teil 4 (Wer sagt was?) · Schreiben Aufgabe 2 (Forum) · Sprechen Präsentationen',
    topics: 'C7 Dienstleistungen & Behörden, C8 Gesundheit, C9 Arbeit & Beruf',
    grammar: 'Adjektivdeklination, n-Deklination (Kollegen, Herrn, Nachbarn)',
  },
  {
    week: 4,
    title: 'Woche 4: Halbzeit & Zwischentest',
    focus: 'Kompletter Übungssatz unter Realbedingungen simulieren · Fehleranalyse aller 4 Module',
    topics: 'C10 Ausbildung & Schule, C11 Freizeit & Sport',
    grammar: 'Fehlerlog überprüfen, Wortschatzwiederholung',
  },
  {
    week: 5,
    title: 'Woche 5: Vertiefung & Presseartikel',
    focus: 'Lesen Teil 2 (Presseberichte) · Hören Teil 2 (Vortrag 1x) · Schreiben abwechselnd Typ 1 & 2 · Sprechen Teil 3 Q&A',
    topics: 'C12 Medien & Kommunikation, C13 Feste & Feiern',
    grammar: 'Relativsätze (mit Präpositionen), Passiv Präsens & Präteritum, Plusquamperfekt',
  },
  {
    week: 6,
    title: 'Woche 6: Vollständige Prüfungssimulation',
    focus: 'Lesen 65 Min strikt · Hören am Stück · Schreiben 60 Min Volltest · Sprechen Partner-Simulation (15+15 Min)',
    topics: 'C14 Familie & Beziehungen, C15 Gesellschaft & Ehrenamt',
    grammar: 'Zweiteilige Konnektoren (sowohl...als auch, weder...noch, je...desto)',
  },
  {
    week: 7,
    title: 'Woche 7: Tempotraining & Feinschliff',
    focus: 'Lesen im Zeitlimit schaffen · Hören einmaliges Hören trainieren · 3 Schreiben-Sessions zur Fehlerbeseitigung',
    topics: 'Wortschatzkatalog 450 Kernwörter Spaced Repetition',
    grammar: 'Top-3 Wiederholungsfehler gezielt eliminieren',
  },
  {
    week: 8,
    title: 'Woche 8: Endspurt & Generalprobe',
    focus: 'Finaler Modellsatz · Redemittel auswendig festigen · Aussprache-Shadowing · Am Vortag der Prüfung ausruhen!',
    topics: 'Prüfungsstrategie & Zeitmanagement',
    grammar: 'Sichere Standardfloskeln für maximale Kohärenz & Strukturen',
  },
];

