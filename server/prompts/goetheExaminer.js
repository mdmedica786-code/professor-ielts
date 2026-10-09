/**
 * Goethe-Zertifikat examiner prompts and rubrics (A2, B1, B2, C1).
 *
 * The rubric for each Schreiben-Aufgabe / Sprechen-Teil is built from the
 * canonical FORMAT (config/goetheExamFormat.js): criteria, max points and the
 * band → points table all come from there. This file only holds the band
 * descriptors and the task-type specific guidance for examiners.
 *
 * Banding: every criterion is rated A/B/C/D/E (factor 1 / 0.75 / 0.5 / 0.25 / 0
 * of its max, see bandToPoints). The server recomputes all points from the
 * bands, so the model's arithmetic is never trusted.
 * Knock-out rule: Erfüllung = E → the whole Aufgabe / Teil scores 0.
 */

const {
  BAND_FACTORS,
  sanitizeLevel,
  getLevelFormat,
  getWritingAufgabe,
  getSpeakingTeil,
  bandToPoints,
} = require("../config/goetheExamFormat");

const BANDS = Object.keys(BAND_FACTORS);

// ─── Level expectations (what "A" means at each level) ────────────────

const LEVEL_EXPECTATIONS = {
  A2: {
    wortschatz: "elementarer Alltagswortschatz (Wortliste A2) für Familie, Wohnen, Einkaufen, Freizeit, Arbeit",
    strukturen: "Hauptsätze mit korrekter Verbzweitstellung, Satzklammer bei Modalverben und Perfekt, einfache Nebensätze mit weil/dass/wenn, Akkusativ/Dativ nach häufigen Präpositionen",
    kohaerenz: "einfache Verknüpfungen mit und, aber, oder, denn, dann",
  },
  B1: {
    wortschatz: "ausreichend breiter Wortschatz zu vertrauten Themen (Wortliste B1), Meinungs- und Planungs-Redemittel",
    strukturen: "Nebensatz-Wortstellung (weil/dass/obwohl/wenn), Perfekt mit haben/sein, Präteritum der Modal- und Hilfsverben, Konjunktiv II bei Bitten und Vorschlägen, Adjektivendungen, Wechselpräpositionen",
    kohaerenz: "abwechslungsreiche Konnektoren (deshalb, trotzdem, außerdem, zuerst … danach), klare Einleitung und Schluss",
  },
  B2: {
    wortschatz: "differenzierter, präziser Wortschatz auch zu abstrakten Themen, Nomen-Verb-Verbindungen, Synonyme statt Wiederholungen",
    strukturen: "sichere komplexe Satzgefüge, Passiv mit Modalverben, Konjunktiv II und I, Partizipialattribute, mehrteilige Konnektoren (zwar … aber, je … desto)",
    kohaerenz: "klar gegliederter Text mit Absätzen, logische Argumentationskette, Textverweise (dieser, dabei, darüber hinaus)",
  },
  C1: {
    wortschatz: "breites, idiomatisches und stilistisch angemessenes Repertoire, Fachwortschatz, präzise Nuancierung, kaum Umschreibungen",
    strukturen: "durchgehend hohe grammatische Korrektheit auch in komplexen Strukturen, Nominalstil, Konjunktiv I in Redewiedergabe, variierter Satzbau; Fehler sind selten und werden oft selbst korrigiert",
    kohaerenz: "souveräne Textorganisation, vielfältige Kohäsionsmittel, Leserführung, dialektische Argumentation mit Synthese",
  },
};

// ─── Band descriptors per criterion ───────────────────────────────────

/** ctx: { level, exp, task } where task is a writing Aufgabe or speaking Teil. */
const CRITERION_BANDS = {
  erfuellung: (ctx) => {
    const lp = ctx.task.leitpunkte;
    const pointsText = lp > 0 ? `alle ${lp} Leitpunkte` : "alle inhaltlichen Anforderungen der Aufgabe";
    return {
      A: `${pointsText} inhaltlich angemessen und ausführlich behandelt; Textsorte, Register und Umfang voll angemessen.`,
      B: `${pointsText} behandelt, einer davon nur knapp; oder kleinere Abweichungen bei Register/Textsorte.`,
      C: `Ein Teil der Anforderungen fehlt oder mehrere Punkte sind nur oberflächlich behandelt; Register stellenweise unpassend.`,
      D: `Nur ein Punkt ansatzweise behandelt; Aufgabe größtenteils nicht erfüllt.`,
      E: `Thema verfehlt, nicht bewertbar oder Umfang unter 50 % der Vorgabe. KNOCK-OUT.`,
    };
  },
  kohaerenz: (ctx) => ({
    A: `Durchgehend klarer, logischer Aufbau; ${ctx.exp.kohaerenz}.`,
    B: `Weitgehend logisch; Verknüpfungen gelegentlich monoton oder holprig.`,
    C: `Stellenweise sprunghaft; wenige Verknüpfungsmittel, Gliederung schwer erkennbar.`,
    D: `Kaum Textzusammenhang; überwiegend unverbundene Einzelsätze.`,
    E: `Kein Textzusammenhang erkennbar.`,
  }),
  wortschatz: (ctx) => ({
    A: `Angemessenes Spektrum für ${ctx.level}: ${ctx.exp.wortschatz}; kaum Fehlgriffe.`,
    B: `Ausreichendes Spektrum; einige Wiederholungen oder Ungenauigkeiten, die das Verständnis nicht stören.`,
    C: `Begrenztes Spektrum unter ${ctx.level}-Niveau; Fehlgriffe erschweren stellenweise das Verständnis.`,
    D: `Stark lückenhafter Wortschatz; Sinn oft unklar.`,
    E: `Wortschatz für die Aufgabe völlig unzureichend.`,
  }),
  strukturen: (ctx) => ({
    A: `Sichere Beherrschung der ${ctx.level}-Strukturen: ${ctx.exp.strukturen}; nur vereinzelte Fehler.`,
    B: `Einfache Strukturen sicher; bei komplexeren Sätzen gelegentliche Fehler, Kommunikation bleibt klar.`,
    C: `Häufige Fehler (Verbstellung, Kasus, Endungen), die den Lese-/Hörfluss hemmen.`,
    D: `Überwiegend fehlerhaft; nur isolierte Strukturen korrekt.`,
    E: `Keine Beherrschung grundlegender Strukturen.`,
  }),
  kommunikation: (ctx) => ({
    A: `Textsortengerecht (Anrede, Gruß, Bezug zum Adressaten), Sätze sinnvoll verbunden (${ctx.exp.kohaerenz}); Register passt durchgehend.`,
    B: `Weitgehend textsortengerecht; kleine Mängel bei Anrede/Gruß oder Verknüpfung.`,
    C: `Textsortenmerkmale fehlen teilweise; Sätze stehen oft unverbunden nebeneinander.`,
    D: `Kaum adressatengerecht; Mitteilung nur mit Mühe verständlich.`,
    E: `Keine erkennbare kommunikative Absicht.`,
  }),
  korrektheit: (ctx) => ({
    A: `Wortschatz und Strukturen der Stufe ${ctx.level} weitgehend korrekt (${ctx.exp.strukturen}); Fehler stören nicht.`,
    B: `Einige Fehler, die das Verständnis aber kaum beeinträchtigen.`,
    C: `Viele Fehler; das Verständnis ist stellenweise beeinträchtigt.`,
    D: `Fehler beeinträchtigen das Verständnis erheblich.`,
    E: `Text aufgrund der Fehler nicht verständlich.`,
  }),
  interaktion: () => ({
    A: `Reagiert direkt und angemessen auf den Partner, ergreift Initiative, fragt nach, stimmt zu oder widerspricht begründet, hält das Gespräch im Fluss.`,
    B: `Reagiert meist angemessen; Initiative oder Nachfragen eher selten.`,
    C: `Reagiert oft nur knapp oder verzögert; geht kaum auf den Partner ein.`,
    D: `Kaum Interaktion; Beiträge stehen unverbunden nebeneinander.`,
    E: `Keine Interaktion erkennbar.`,
  }),
  aussprache: () => ({
    A: `Satzmelodie und Wortakzent natürlich, Einzellaute (ä/ö/ü, ch, r, -er, Vokallänge) korrekt; mühelos verständlich.`,
    B: `Akzent hörbar, einzelne Laute abweichend; gut verständlich.`,
    C: `Deutlicher Akzent, mehrere Lautabweichungen; Verständnis erfordert stellenweise Mühe.`,
    D: `Starke Abweichungen; häufig schwer verständlich.`,
    E: `Nicht verständlich.`,
  }),
};

// ─── Task-type guidance (what examiners look for in this Textsorte) ───

const WRITING_TASK_NOTES = {
  sms: `Kurze Nachricht an eine vertraute Person: alle drei Punkte je in einem Satz, informelle Anrede/Gruß (z. B. „Hallo Tom, … Bis später, Anna“). Telegrammstil ist erlaubt, wenn verständlich.`,
  email_informell: `Persönliche E-Mail: informelles Register (du/ihr) durchgehend, Anrede („Liebe Anna,“ / „Lieber Tom,“ / „Hallo …,“) und Grußformel („Liebe Grüße“, „Viele Grüße“), jeder Leitpunkt mit eigener, nachvollziehbarer Ausführung, Einleitung (Bezug auf Anlass) und Schluss.`,
  forumsbeitrag: `Öffentlicher Diskussionsbeitrag: KEINE Briefformeln (keine Anrede/Grußformel wie in einer E-Mail), klar formulierte eigene Meinung mit Begründung und Beispiel/Erfahrung, Bezug zum Impuls bzw. zu allen Leitpunkten, Meinungs-Redemittel („Meiner Meinung nach …“, „Ich bin der Ansicht, dass …“), abwägende Verknüpfungen (einerseits … andererseits, zwar … aber) und ein Fazit.`,
  email_formell: `Formelle E-Mail: formelle Anrede („Sehr geehrte Damen und Herren,“ / „Sehr geehrte Frau Müller,“ / „Sehr geehrter Herr Schmidt,“ — Kleinschreibung nach dem Komma), Anlass klar genannt, höfliche Bitte oder Forderung mit Konjunktiv II („Könnten Sie …“, „Ich wäre Ihnen dankbar, wenn …“), formeller Gruß („Mit freundlichen Grüßen“ + Vor- und Nachname), konsequent Sie-Form. Achte auf n-Deklination („Herrn“).`,
  eroerterung: `Strukturierter Aufsatz: Einleitung mit Hinführung zum Thema, Beschreibung bzw. Auswertung der Grafik (falls vorhanden) mit Zahlenbezug, dialektische Argumentation (Pro und Contra mit Beispielen), begründeter eigener Standpunkt, Schluss/Synthese. Sachlicher, nominaler Stil, keine Briefformeln.`,
  brief_formell: `Formeller Brief / Stellungnahme an eine Institution: Betreff, formelle Anrede, Bezug auf den Anlass, alle Punkte in sinnvoller Reihenfolge, angemessen distanziertes Register mit Höflichkeitsformen, klare Forderung oder Schlussfolgerung, formelle Schlussformel.`,
};

const SPEAKING_TASK_NOTES = {
  fragen_zur_person: `Der Kandidat stellt zu jeder Stichwortkarte eine korrekte, passende Frage und beantwortet die Fragen des Partners in ganzen, verständlichen Sätzen.`,
  von_sich_erzaehlen: `Der Kandidat spricht zusammenhängend zu ALLEN vier Stichpunkten der Karte und erzählt etwas über das eigene Leben (Beispiele, Erfahrungen).`,
  gemeinsam_planen: `Der Kandidat macht konkrete Vorschläge und begründet sie, reagiert auf die Vorschläge des Partners (Zustimmung, höfliche Ablehnung mit Gegenvorschlag), geht auf alle Planungspunkte ein und führt zu einer gemeinsamen Entscheidung. Redemittel: „Wie wäre es, wenn …?“, „Wir könnten …“, „Da habe ich leider keine Zeit, aber …“.`,
  praesentation: `Die Präsentation folgt den fünf Folien:
  Folie 1: Thema vorstellen und Struktur ankündigen (Zuerst …, dann …, zum Schluss …)
  Folie 2: Eigene Erfahrung berichten (Perfekt / Präteritum)
  Folie 3: Situation im Heimatland mit Beispielen darstellen
  Folie 4: Vor- und Nachteile nennen, eigene Meinung begründen
  Folie 5: Abschluss, Dank an das Publikum
Erfüllung: A = alle 5 Folien angemessen behandelt, B = 3–4, C = 2, D = 1, E = nicht bewertbar. Kohärenz: klare Folienübergänge („Damit komme ich zum nächsten Punkt …“). Gib zusätzlich "slideBreakdown" aus.`,
  feedback_fragen: `Der Kandidat gibt eine kurze, konkrete Rückmeldung zur Präsentation des Partners, stellt eine passende Frage und beantwortet Fragen zur eigenen Präsentation in 2–3 zusammenhängenden, begründeten Sätzen.`,
  vortrag: `Zusammenhängender Vortrag: Einleitung mit Themennennung, Darstellung des Sachverhalts (ggf. Grafik/Beispiele), Abwägung von Vor- und Nachteilen bzw. Pro und Contra, begründeter eigener Standpunkt, Schluss. Freies Sprechen mit klarer Gliederung und Signalwörtern.`,
  diskussion: `Der Kandidat vertritt einen begründeten Standpunkt, geht auf die Argumente des Partners ein (widerspricht, relativiert, stimmt teilweise zu), fragt nach, verteidigt die eigene Position und trägt zu einem Fazit/Kompromiss bei.`,
};

// ─── Helpers ──────────────────────────────────────────────────────────

function bandPointsLine(max) {
  return BANDS.map((b) => `${b}=${bandToPoints(b, max)}`).join(" | ");
}

function rubricBlock(criteria, ctx) {
  return criteria
    .map((c, idx) => {
      const bands = (CRITERION_BANDS[c.key] || CRITERION_BANDS.wortschatz)(ctx);
      const lines = BANDS.map((b) => `  * Band ${b} (${bandToPoints(b, c.max)} Pkt): ${bands[b]}`).join("\n");
      return `${idx + 1}. ${c.label} ("${c.key}", max. ${c.max} Punkte — ${bandPointsLine(c.max)})\n${lines}`;
    })
    .join("\n\n");
}

function exampleCriteriaJson(criteria, { analysis = true } = {}) {
  const bands = criteria.map((c) => `    "${c.key}": "B"`).join(",\n");
  const scores = criteria.map((c) => `    "${c.key}": ${bandToPoints("B", c.max)}`).join(",\n");
  const maxScores = criteria.map((c) => `    "${c.key}": ${c.max}`).join(",\n");
  const detail = criteria
    .map(
      (c) => `    "${c.key}": {
      "band": "B",
      "points": ${bandToPoints("B", c.max)},
      "strengths": ["Konkrete Stärke mit Beispiel aus dem Text"],
      "improvements": ["Konkreter Verbesserungshinweis"],
      "examinerComment": "Begründung der Bandvergabe zu ${c.label}."
    }`
    )
    .join(",\n");
  return { bands, scores, maxScores, detail: analysis ? detail : "" };
}

const PRAEDIKAT_BLOCK = `PRÄDIKATE (bezogen auf 100 Punkte):
90–100 Sehr gut | 80–89 Gut | 70–79 Befriedigend | 60–69 Ausreichend (bestanden) | 0–59 Nicht bestanden`;

// ─── WRITING ──────────────────────────────────────────────────────────

function buildWritingExaminerPrompt(level, aufgabeNr) {
  const lvl = sanitizeLevel(level);
  const fmt = getLevelFormat(lvl);
  const a = getWritingAufgabe(lvl, aufgabeNr);
  const ctx = { level: lvl, exp: LEVEL_EXPECTATIONS[lvl], task: a };
  const [minW, maxW] = a.words;
  const wordText = minW === maxW ? `circa ${minW}` : `${minW}–${maxW}`;
  const knockoutWords = Math.floor(minW * 0.5);
  const ex = exampleCriteriaJson(a.criteria);
  const overview = fmt.schreiben.aufgaben
    .map((x) => `Aufgabe ${x.nr} (${x.label}): ${x.maxPoints} Punkte`)
    .join(" · ");

  return `Du bist zertifizierte Prüferin / zertifizierter Prüfer des Goethe-Instituts für das Goethe-Zertifikat ${lvl}, Modul Schreiben.
Du bewertest streng, fair und nachvollziehbar nach den offiziellen Bewertungskriterien des Goethe-Instituts.

═══ AUFGABE ═══
Goethe-Zertifikat ${lvl} · Schreiben · Aufgabe ${a.nr}: ${a.label}
Register: ${a.register} · Umfang: ${wordText} Wörter · ${a.leitpunkte > 0 ? `${a.leitpunkte} Leitpunkte` : "ohne Leitpunkte (Reaktion auf einen Impuls)"}
Arbeitsanweisung: "${a.instruction}"
Modulübersicht: ${overview} (Summe 100).

Textsortenspezifische Erwartungen:
${WRITING_TASK_NOTES[a.type] || ""}

═══ KRITERIEN (max. ${a.maxPoints} Punkte) ═══
Vergib für JEDES Kriterium genau ein Band A–E. Die Punkte ergeben sich ausschließlich aus dem Band.

${rubricBlock(a.criteria, ctx)}

KNOCK-OUT-REGEL: Wird "erfuellung" mit Band E bewertet (Thema verfehlt oder weniger als ${knockoutWords} Wörter), erhält die GESAMTE Aufgabe 0 Punkte.
Bewerte immer das Niveau ${lvl}: Ein fehlerfreier, aber sehr einfacher Text unter dem Zielniveau erhält bei den sprachlichen Kriterien höchstens Band C.

${PRAEDIKAT_BLOCK}

═══ JSON-AUSGABEFORMAT (STRENG, KEIN MARKDOWN) ═══
{
  "taskNumber": ${a.nr},
  "level": "${lvl}",
  "bands": {
${ex.bands}
  },
  "scores": {
${ex.scores}
  },
  "totalPoints": 0,
  "maxPoints": ${a.maxPoints},
  "estimatedCEFR": "${lvl}",
  "verdict": "Prägnantes Gesamturteil auf Deutsch (2–3 Sätze).",
  "criteriaAnalysis": {
${ex.detail}
  },
  "mistakes": [
    {
      "category": "Grammatik|Wortschatz|Rechtschreibung|Register|Textaufbau",
      "original": "wörtliches Zitat aus dem Text",
      "correction": "korrigierte Fassung",
      "explanation": "kurze Regel auf Deutsch"
    }
  ],
  "improvedVersion": "Vollständige Musterlösung auf authentischem ${lvl}-Niveau (${wordText} Wörter), alle Anforderungen erfüllt, fehlerfrei, im Ton des Kandidaten.",
  "recommendedRedemittel": [
    { "function": "z. B. Meinung äußern", "phrase": "…", "example": "…" }
  ],
  "nextSteps": ["Konkreter Trainingstipp 1", "Konkreter Trainingstipp 2"]
}
Liste in "mistakes" die wichtigsten Fehler (maximal 12), jeweils mit wörtlichem Zitat.`;
}

// ─── SPEAKING ─────────────────────────────────────────────────────────

function buildSpeakingExaminerPrompt(level, teil, { dialogue = false } = {}) {
  const lvl = sanitizeLevel(level);
  const fmt = getLevelFormat(lvl);
  const t = getSpeakingTeil(lvl, teil);
  const ctx = { level: lvl, exp: LEVEL_EXPECTATIONS[lvl], task: { ...t, leitpunkte: 0 } };
  const aussprache = { key: "aussprache", label: "Aussprache", max: fmt.sprechen.ausspracheMax };
  const allCriteria = [...t.criteria, aussprache];
  const teilMax = t.criteria.reduce((s, c) => s + c.max, 0);
  const ex = exampleCriteriaJson(allCriteria, { analysis: false });
  const overview = fmt.sprechen.teile
    .map((x) => `Teil ${x.teil} (${x.title}): ${x.criteria.reduce((s, c) => s + c.max, 0)} Punkte`)
    .join(" · ");
  const isPraesentation = t.type === "praesentation";

  return `Du bist zertifizierte Prüferin / zertifizierter Prüfer des Goethe-Instituts für das Goethe-Zertifikat ${lvl}, Modul Sprechen.
Du bewertest ${dialogue ? "das Transkript eines Prüfungsgesprächs zwischen KANDIDAT und PARTNER — bewerte AUSSCHLIESSLICH die Beiträge des KANDIDATEN" : "die Transkription der mündlichen Leistung des Kandidaten"} streng nach dem offiziellen Bewertungsbogen.

═══ PRÜFUNGSTEIL ═══
Goethe-Zertifikat ${lvl} · Sprechen · Teil ${t.teil}: ${t.title} (${t.mode === "dialogue" ? "Dialog" : "Monolog"}, ca. ${Math.round(t.durationSeconds / 60)} Minuten)
Aufgabenstellung: "${t.instruction}"
Modulübersicht: ${overview} · Aussprache (gesamte Prüfung): ${aussprache.max} Punkte (Summe 100).

Aufgabenspezifische Erwartungen:
${SPEAKING_TASK_NOTES[t.type] || ""}

═══ KRITERIEN TEIL ${t.teil} (max. ${teilMax} Punkte) + AUSSPRACHE (max. ${aussprache.max} Punkte) ═══
Vergib für JEDES Kriterium genau ein Band A–E. Die Punkte ergeben sich ausschließlich aus dem Band.

${rubricBlock(allCriteria, ctx)}

KNOCK-OUT-REGEL: Wird "erfuellung" mit Band E bewertet (Aufgabe nicht bearbeitet oder nicht bewertbar), erhält Teil ${t.teil} 0 Punkte.
Aussprache: Liegt eine akustische Aussprachemessung vor, richte dich nach ihr. Sonst hast du nur ein Transkript: Leite die Aussprache vorsichtig aus Hinweisen der automatischen Transkription ab (falsch erkannte Wörter, Lautverwechslungen); im Zweifel Band B.
Bewerte immer das Niveau ${lvl}; Leistungen unter dem Zielniveau erhalten bei Wortschatz/Strukturen höchstens Band C.

${PRAEDIKAT_BLOCK}

═══ JSON-AUSGABEFORMAT (STRENG, KEIN MARKDOWN) ═══
{
  "part": ${t.teil},
  "level": "${lvl}",
  "partTitle": "${t.title}",
  "bands": {
${ex.bands}
  },
  "scores": {
${ex.scores}
  },
  "maxScores": {
${ex.maxScores}
  },
  "totalPoints": 0,
  "estimatedCEFR": "${lvl}",
  "verdict": "Zusammenfassendes Prüferurteil auf Deutsch (2–3 Sätze).",
  "criteriaAnalysis": {
${allCriteria.map((c) => `    "${c.key}": "Begründung der Bandvergabe zu ${c.label}"`).join(",\n")}
  },
  "strengths": ["Konkrete Stärke mit Beispiel"],
  "areasForImprovement": ["Konkreter Verbesserungshinweis"],
  "mistakes": [
    { "spoken": "wörtliches Zitat des Kandidaten", "corrected": "korrigierte Fassung", "why": "kurze Regel" }
  ],
  "grammarAndVocabFeedback": [
    { "candidateSpoke": "wörtliches Zitat", "correction": "bessere Formulierung auf ${lvl}-Niveau", "explanation": "Grund" }
  ],${isPraesentation ? `
  "slideBreakdown": [
    { "slide": 1, "title": "Thema und Struktur", "covered": true, "comment": "…" }
  ],` : ""}
  "pronunciationTips": ["Konkreter Aussprachetipp"],
  "recommendedPhrases": ["Nützliches Redemittel für diesen Prüfungsteil"],
  "recommendedRedemittel": ["Nützlicher Satz für zukünftige Prüfungen"]
}`;
}

module.exports = {
  LEVEL_EXPECTATIONS,
  buildWritingExaminerPrompt,
  buildSpeakingExaminerPrompt,
};
