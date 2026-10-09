/**
 * Goethe Exam Dynamic Generator Prompts (CEFR A2 – C1)
 *
 * Every prompt is built from the canonical FORMAT in config/goetheExamFormat.js
 * for the requested level and Teil, so a generated part always matches the
 * official structure (text type, item type, item count, numbering, playback
 * rules, word counts, Leitpunkte). Do not hardcode format details here —
 * edit the FORMAT file instead.
 */

const {
  ITEM_TYPES,
  getReceptivePart,
  getWritingAufgabe,
  getSpeakingTeil,
  sanitizeLevel,
} = require("../config/goetheExamFormat");

// ─── Language level profile (CEFR descriptors, not exam format) ───────

const LEVEL_LANGUAGE = {
  A2: "Kurze Hauptsätze, einfache Nebensätze mit weil/dass/wenn, Perfekt, Modalverben, Grundwortschatz aus dem Alltag (Wortliste A2). Keine Passivkonstruktionen, keine Partizipialattribute.",
  B1: "Abwechslungsreiche Konnektoren (deshalb, trotzdem, obwohl), Relativsätze, Passiv, Infinitiv mit zu, Konjunktiv II, Präteritum in Berichten. Alltags- und Gesellschaftswortschatz (Wortliste B1).",
  B2: "Gehobener Wortschatz, feste Nomen-Verb-Verbindungen, Partizipialkonstruktionen, mehrteilige Konnektoren (zwar … aber, je … desto), Konjunktiv I in Redewiedergabe, komplexe Satzgefüge.",
  C1: "Idiomatische Wendungen, hohes Abstraktionsniveau, Nominalstil, Fachbegriffe, Modalpartikeln, stilistische Nuancen, implizite Wertungen und Argumentationsstrukturen.",
};

const SPEAKER_LENGTH = {
  A2: "1 bis 2 kurze, einfache Sätze",
  B1: "2 bis 3 Sätze",
  B2: "2 bis 4 Sätze",
  C1: "2 bis 4 präzise, gut verknüpfte Sätze",
};

const GAP_MARKER = "[[N]]";

function quote(list) {
  return list.map((o) => `"${o}"`).join(", ");
}

/** Labels for the answer options of a zuordnung item. */
function zuordnungLabels(part) {
  if (part.textLabels) {
    return part.noMatchOption ? [...part.textLabels, part.noMatchOption] : part.textLabels;
  }
  if (part.optionCount) {
    return "abcdefghijklmnopqrstuvwxyz".slice(0, part.optionCount).split("");
  }
  return [];
}

/**
 * German rules describing how each question must be encoded for the part's
 * qType. Shared by reading and listening so both modules stay consistent.
 */
function buildItemRules(part) {
  const { qType, from, to, count } = part;
  const header = `Erstelle GENAU ${count} Aufgaben, nummeriert von ${from} bis ${to} ("number": ${from} … ${to}).`;

  switch (qType) {
    case "richtig_falsch":
    case "ja_nein":
    case "rfn": {
      const opts = ITEM_TYPES[qType].options;
      return `${header}
- Jede Aufgabe ist eine Aussage ("prompt"). "options" ist IMMER exakt [${quote(opts)}].
- "answer" ist genau einer dieser Werte. Verteile die Lösungen ausgewogen (jede Option mindestens ${qType === "rfn" ? 2 : Math.max(2, Math.floor(count / 3))}-mal).${
        qType === "rfn" ? "\n- \"Nicht im Text\" nur, wenn die Information wirklich nicht im Text vorkommt (auch nicht implizit)." : ""
      }`;
    }
    case "mcq3":
    case "mcq4": {
      const letters = ITEM_TYPES[qType].letters;
      return `${header}
- "prompt" ist eine Frage oder ein Satzanfang. "options" enthält GENAU ${letters.length} Antworttexte OHNE Buchstaben-Präfix.
- "answer" ist der Buchstabe der richtigen Option (${quote(letters)}). Verteile die Lösungsbuchstaben gemischt.
- Die Distraktoren greifen Wörter aus dem Text auf, sind aber eindeutig falsch. Genau EINE Lösung ist richtig.`;
    }
    case "zuordnung": {
      const labels = zuordnungLabels(part);
      const noMatch = part.noMatchOption
        ? `\n- Für GENAU EINE Aufgabe gibt es keine passende Lösung: dort ist "answer" = "${part.noMatchOption}".`
        : "";
      const bank = part.optionCount
        ? `\n- Lege zusätzlich "optionBank" an: GENAU ${part.optionCount} Einträge { "label": "a", "text": "…" } (a bis ${labels[labels.length - 1]}). Nur ${count} davon werden gebraucht, die übrigen sind plausible Distraktoren.`
        : "";
      return `${header}
- "prompt" beschreibt die Situation / Person / Aussage. "options" ist IMMER exakt [${quote(labels)}].
- "answer" ist genau eines dieser Labels.${noMatch}${bank}`;
    }
    case "lueckentext_woerter":
      return `${header}
- Markiere jede Lücke im Fließtext mit ${GAP_MARKER} (also [[${from}]] bis [[${to}]]), in Textreihenfolge, jede Lücke genau einmal.
- Lege "wordBank" an: GENAU ${part.wordBankSize} einzelne Wörter (die ${count} Lösungen + ${part.wordBankSize - count} Distraktoren, alphabetisch sortiert).
- Für jede Lücke: "prompt" = "Lücke <Nummer>", "options" = die komplette wordBank, "answer" = das passende Wort (exakt wie in der wordBank).`;
    case "lueckentext_saetze": {
      const labels = "abcdefghij".slice(0, part.sentenceCount).split("");
      return `${header}
- Markiere jede Lücke im Fließtext mit ${GAP_MARKER} (also [[${from}]] bis [[${to}]]), an der Stelle eines entfernten ganzen Satzes.
- Lege "sentences" an: GENAU ${part.sentenceCount} Einträge { "label": "a", "text": "…" } (${labels[0]} bis ${labels[labels.length - 1]}), gemischte Reihenfolge. ${part.sentenceCount - count} Sätze passen nicht, wirken aber thematisch plausibel.
- Für jede Lücke: "prompt" = "Lücke <Nummer>", "options" = [${quote(labels)}], "answer" = Label des passenden Satzes. Jeder Satz passt höchstens in eine Lücke.`;
    }
    case "wer_sagt_was":
      return `${header}
- "prompt" ist eine Aussage, die inhaltlich (nicht wörtlich) im Gespräch vorkommt, in der Reihenfolge des Gesprächs.
- "options" ist IMMER die Liste der Namen aller Sprecher (exakt wie in "speakers"), "answer" ist einer dieser Namen.
- Jeder Sprecher ist mindestens zweimal die Lösung.`;
    case "kurzantwort":
      return `${header}
- "prompt" ist eine W-Frage, die mit 1–4 Stichworten beantwortet werden kann (Zahl, Name, Ursache, Beispiel …), in der Reihenfolge des Vortrags.
- "options" ist [] (freie Antwort). "answer" ist die Musterlösung in Stichworten.
- "acceptedAnswers" enthält 2–5 akzeptierte Varianten / Schlüsselbegriffe (z. B. "30 Prozent", "30 %", "ein Drittel").`;
    case "paar_rf_mcq": {
      const pairs = count / 2;
      return `${header}
- Es gibt ${pairs} Texte; zu JEDEM Text gehören GENAU zwei aufeinanderfolgende Aufgaben, "segment" = Nummer des Textes (1 bis ${pairs}).
- Die ERSTE Aufgabe eines Textes: "itemType": "richtig_falsch", Aussage im "prompt", "options" = [${quote(ITEM_TYPES.richtig_falsch.options)}], "answer" = "Richtig" oder "Falsch".
- Die ZWEITE Aufgabe eines Textes: "itemType": "mcq3", Frage/Satzanfang im "prompt", "options" = drei Antworttexte OHNE Buchstaben, "answer" = Buchstabe ("a", "b" oder "c").`;
    }
    default:
      return header;
  }
}

function questionSchema(part) {
  const extra = [];
  if (part.qType === "kurzantwort") extra.push(`"acceptedAnswers": ["…", "…"]`);
  if (part.qType === "paar_rf_mcq") extra.push(`"segment": 1`, `"itemType": "richtig_falsch|mcq3"`);
  if (part.textKind === "multi") extra.push(`"textRef": "Label des Textes, auf den sich die Aufgabe bezieht"`);
  if (part.scriptKind === "segments" && part.qType !== "paar_rf_mcq") extra.push(`"segment": 1`);
  return `{
      "number": ${part.from},
      "prompt": "…",
      "options": [ … ],
      "answer": "…",${extra.length ? `\n      ${extra.join(",\n      ")},` : ""}
      "explanation": "Begründung mit Textbeleg (Zitat), warum dies die einzig richtige Lösung ist."
    }`;
}

// ─── 1. READING ───────────────────────────────────────────────────────

function readingTextRules(part) {
  switch (part.textKind) {
    case "multi":
      return part.textLabels
        ? `Erstelle GENAU ${part.textCount} Texte in "passage.texts", mit den Labels ${quote(part.textLabels)} in dieser Reihenfolge. "passage.text" bleibt leer.`
        : `Erstelle GENAU ${part.textCount} Texte in "passage.texts". Label jedes Textes ist der Verfassername mit Ort (z. B. "Jana, Graz"). "passage.text" bleibt leer. Aufgabe ${part.from} bezieht sich auf den ersten Text, Aufgabe ${part.from + 1} auf den zweiten usw.`;
    case "gap_words":
    case "gap_sentences":
      return `Der vollständige Text steht in "passage.text" und enthält die Lückenmarkierungen [[${part.from}]] bis [[${part.to}]]. "passage.texts" bleibt leer.`;
    default:
      return `Der vollständige Text steht in "passage.text" (Absätze durch \\n\\n getrennt). "passage.texts" bleibt leer.`;
  }
}

function buildReadingGeneratorPrompt(level, teil) {
  const lvl = sanitizeLevel(level);
  const part = getReceptivePart(lvl, "lesen", teil);

  const extraFields = [];
  if (part.qType === "lueckentext_woerter") extraFields.push(`"wordBank": ["…"]`);
  if (part.qType === "lueckentext_saetze") extraFields.push(`"sentences": [{ "label": "a", "text": "…" }]`);

  return `Du bist offizieller Testautor des Goethe-Instituts für das Goethe-Zertifikat ${lvl}, Modul Lesen.
Erstelle GENAU den folgenden Prüfungsteil — Struktur, Textsorte und Aufgabenzahl sind verbindlich.

═══ PRÜFUNGSTEIL ═══
Goethe-Zertifikat ${lvl} · Lesen · Teil ${part.teil} von ${part.totalParts}: ${part.title}
Aufgabenstellung auf dem Prüfungsblatt: "${part.instruction}"

═══ TEXTVORGABE ═══
${part.textSpec}
${readingTextRules(part)}

═══ AUFGABEN ═══
${buildItemRules(part)}
- Die Aufgaben folgen der Reihenfolge der Informationen im Text (außer bei Zuordnungsaufgaben).
- Jede Lösung muss eindeutig aus dem Text ableitbar sein; keine doppelten Auslegungen, kein Weltwissen nötig.

═══ SPRACHNIVEAU ${lvl} ═══
${LEVEL_LANGUAGE[lvl]}
Deutsch in fehlerfreier Standardrechtschreibung (neue Rechtschreibung, korrekte Anführungszeichen „…“), natürlicher, authentischer Stil der Textsorte. Alle Namen, Orte und Zahlen sind fiktiv, aber realistisch für den deutschsprachigen Raum (D-A-CH).

═══ JSON-AUSGABEFORMAT (STRENG, KEIN MARKDOWN) ═══
{
  "title": "Kurzer Thementitel",
  "passage": {
    "title": "Überschrift des Lesetextes",
    "source": "z. B. aus einem Online-Magazin",
    "text": "…",
    "texts": [{ "label": "…", "title": "…", "text": "…" }]
  },${extraFields.length ? `\n  ${extraFields.join(",\n  ")},` : ""}
  "questions": [
    ${questionSchema(part)}
  ]
}`;
}

// ─── 2. LISTENING ─────────────────────────────────────────────────────

function listeningScriptRules(part) {
  if (part.scriptKind === "segments") {
    return `Erstelle GENAU ${part.segmentCount} voneinander unabhängige Hörtexte in "segments" (label "Text 1" bis "Text ${part.segmentCount}"). Jeder Text hat ein kurzes "context" (z. B. "Anrufbeantworter").`;
  }
  return `Erstelle GENAU EINEN zusammenhängenden Hörtext in "segments" (ein Eintrag, label "Text").`;
}

function buildListeningGeneratorPrompt(level, teil) {
  const lvl = sanitizeLevel(level);
  const part = getReceptivePart(lvl, "hoeren", teil);
  const plays = part.maxPlays === 1 ? "einmal" : "zweimal";

  const extraFields = [];
  if (part.qType === "zuordnung" && part.optionCount) extraFields.push(`"optionBank": [{ "label": "a", "text": "…" }]`);

  return `Du bist offizieller Testautor des Goethe-Instituts für das Goethe-Zertifikat ${lvl}, Modul Hören.
Erstelle das Hörskript (wird anschließend mit Sprachsynthese vertont) und die Aufgaben für GENAU den folgenden Prüfungsteil.

═══ PRÜFUNGSTEIL ═══
Goethe-Zertifikat ${lvl} · Hören · Teil ${part.teil} von ${part.totalParts}: ${part.title}
Die Kandidaten hören den Text ${plays} (maximal ${part.maxPlays} Durchgang/Durchgänge).
Aufgabenstellung: "${part.instruction}"

═══ SKRIPTVORGABE ═══
${part.scriptSpec}
${listeningScriptRules(part)}
- Lege in "speakers" ALLE Sprecher an: { "name": "…", "gender": "female|male", "role": "moderator|narrator|guest|speaker" }. Höchstens 4 Sprecher insgesamt.
- Jede Äußerung in "utterances" nennt in "speaker" exakt einen Namen aus "speakers".
- Gesprochene Sprache: natürliche Diskursmarker (also, na ja, genau, ach so), Begrüßungen, Rückfragen — aber KEINE Regieanweisungen, Geräusche oder Klammern im Text, denn jeder Text wird wörtlich vorgelesen.
- Zahlen, Uhrzeiten und Daten so schreiben, wie sie gesprochen werden sollen (z. B. „um halb neun“, „am 3. Mai“).
${part.maxPlays === 1 ? "- Da nur einmal gehört wird: Informationen klar platzieren, wichtige Details nicht in Nebenbemerkungen verstecken." : "- Distraktoren (falsche Optionen) werden im Text erwähnt, dann aber korrigiert oder verworfen."}

═══ AUFGABEN ═══
${buildItemRules(part)}
- Jede Lösung muss eindeutig aus dem Gesprochenen hervorgehen.

═══ SPRACHNIVEAU ${lvl} ═══
${LEVEL_LANGUAGE[lvl]}
Fehlerfreies, idiomatisches Deutsch. Fiktive, realistische Namen und Orte aus dem D-A-CH-Raum.

═══ JSON-AUSGABEFORMAT (STRENG, KEIN MARKDOWN) ═══
{
  "title": "Kurzer Thementitel",
  "speakers": [{ "name": "…", "gender": "female", "role": "moderator" }],
  "segments": [
    {
      "label": "${part.scriptKind === "segments" ? "Text 1" : "Text"}",
      "context": "…",
      "utterances": [{ "speaker": "…", "text": "…" }]
    }
  ],${extraFields.length ? `\n  ${extraFields.join(",\n  ")},` : ""}
  "questions": [
    ${questionSchema(part)}
  ]
}`;
}

// ─── 3. WRITING ───────────────────────────────────────────────────────

const REGISTER_HINT = {
  informell: "informelles Register (du/ihr), persönliche Anrede und Grußformel",
  neutral: "neutrales, sachliches Register ohne Briefformeln (öffentlicher Beitrag)",
  formell: "formelles Register (Sie), formelle Anrede und Grußformel",
};

function buildWritingGeneratorPrompt(level, nr) {
  const lvl = sanitizeLevel(level);
  const a = getWritingAufgabe(lvl, nr);
  const [minW, maxW] = a.words;
  const wordText = minW === maxW ? `circa ${minW} Wörter` : `${minW}–${maxW} Wörter`;

  const leitpunkteRule = a.leitpunkte > 0
    ? `"bulletPoints" enthält GENAU ${a.leitpunkte} Leitpunkte (Inhaltspunkte) als kurze Imperativ- oder Stichpunktformulierungen, die zur Situation passen und eine sinnvolle Reihenfolge haben.`
    : `Diese Aufgabe hat KEINE Leitpunkte: "bulletPoints" ist []. Stattdessen enthält "stimulus" einen kurzen Impuls (z. B. eine Frage aus einer Sendung oder einen Diskussionsbeitrag einer anderen Person, 40–60 Wörter, mit Name), auf den der Kandidat mit seiner Meinung reagiert.`;

  const chartRule = a.withChart
    ? `\n- Diese Aufgabe enthält eine Grafik: Lege "chart" an mit { "title", "type": "Balkendiagramm|Säulendiagramm|Kreisdiagramm|Liniendiagramm", "source": "fiktive Quelle mit Jahr", "unit": "z. B. Prozent", "data": [{ "label": "…", "value": 0 }] (4–6 Werte, realistisch, Prozentwerte eines Kreisdiagramms ergeben 100), "description": "ein Satz, der die Grafik in Worten beschreibt" }. Ein Leitpunkt bezieht sich auf die Grafik.`
    : `\n- "chart" ist null.`;

  return `Du bist offizieller Prüfungsautor des Goethe-Instituts für das Goethe-Zertifikat ${lvl}, Modul Schreiben.
Erstelle GENAU die folgende Schreibaufgabe.

═══ AUFGABE ═══
Goethe-Zertifikat ${lvl} · Schreiben · Aufgabe ${a.nr}: ${a.label}
Textsorte: ${a.type} · Register: ${a.register} (${REGISTER_HINT[a.register] || a.register})
Umfang: ${wordText} · Richtzeit: ${a.timeHintMinutes} Minuten
Offizielle Arbeitsanweisung (wörtlich übernehmen): "${a.instruction}"

═══ ANFORDERUNGEN ═══
- "scenario": realistische Ausgangssituation (2–4 Sätze) auf Niveau ${lvl}, die genau diese Textsorte und dieses Register verlangt (Adressat klar benannt).
- ${leitpunkteRule}${chartRule}
- "sampleStarters": 2–3 typische Einstiegs- oder Gliederungsformulierungen für genau diese Textsorte und dieses Register.
- "rubricHighlight": ein Satz, worauf die Prüfer bei dieser Aufgabe besonders achten.
- Sprachniveau der Aufgabenstellung: ${LEVEL_LANGUAGE[lvl]}
- Fehlerfreies Deutsch, neue Rechtschreibung.

═══ JSON-AUSGABEFORMAT (STRENG, KEIN MARKDOWN) ═══
{
  "title": "Kurzer Thementitel",
  "scenario": "…",
  "stimulus": ${a.leitpunkte > 0 ? "null" : `"…"`},
  "bulletPoints": [${a.leitpunkte > 0 ? `"…"` : ""}],
  "chart": ${a.withChart ? `{ "title": "…", "type": "…", "source": "…", "unit": "…", "data": [{ "label": "…", "value": 0 }], "description": "…" }` : "null"},
  "sampleStarters": ["…"],
  "rubricHighlight": "…"
}`;
}

// ─── 4. SPEAKING PARTNER ──────────────────────────────────────────────

/** How the AI partner behaves in each official speaking task type. */
const PARTNER_ROLE = {
  fragen_zur_person: `Ihr stellt euch gegenseitig Fragen zu Stichwortkarten (z. B. Geburtstag, Wohnort, Hobby, Beruf). Beantworte die Fragen des Kandidaten kurz und konkret; stelle danach selbst eine passende Frage zu einem neuen Stichwort.`,
  von_sich_erzaehlen: `Dies ist ein Monolog des Kandidaten. Du bist die Prüferin / der Prüfer: Eröffne mit der Frage auf der Karte, höre zu und stelle nur dann EINE kurze Nachfrage, wenn der Kandidat fertig ist oder einen Stichpunkt vergessen hat.`,
  gemeinsam_planen: `Ihr plant gemeinsam etwas. Du hast eigene Termine / Vorstellungen: Mache konkrete Vorschläge, lehne manche Vorschläge höflich mit Begründung ab, bringe Alternativen ein und führe das Gespräch zu einer gemeinsamen Entscheidung.`,
  praesentation: `Dies ist eine Präsentation des Kandidaten (Monolog). Du bist Zuhörer: Eröffne kurz, unterbrich nicht, und reagiere erst am Ende mit einem kurzen Dank.`,
  feedback_fragen: `Der Kandidat hat gerade präsentiert. Gib eine kurze, konkrete Rückmeldung zur Präsentation und stelle EINE Frage zum Thema. Beantworte anschließend Fragen des Kandidaten knapp.`,
  vortrag: `Dies ist ein Vortrag des Kandidaten (Monolog). Du bist Zuhörer / Prüfer: Eröffne kurz, unterbrich nicht und stelle nach dem Vortrag EINE anspruchsvolle Anschlussfrage.`,
  diskussion: `Ihr diskutiert eine kontroverse Frage. Vertritt eine erkennbar andere Position als der Kandidat, bringe Gegenargumente und Beispiele, fordere Begründungen ein — bleibe dabei höflich und offen für einen Kompromiss am Ende.`,
};

function buildSpeakingPartnerPrompt(level, teil, topic = "", { output = "json" } = {}) {
  const lvl = sanitizeLevel(level);
  const t = getSpeakingTeil(lvl, teil);
  const minutes = Math.round((t.durationSeconds / 60) * 10) / 10;
  const isMonologue = t.mode === "monologue";

  const outputBlock = output === "json"
    ? `
JSON-AUSGABEFORMAT (STRENG, KEIN MARKDOWN):
{
  "replyText": "Dein gesprochener Redebeitrag auf Deutsch",
  "role": "${isMonologue ? "Prüfer/in" : "Prüfungspartner/in (Kandidat B)"}",
  "redemittelTips": ["Hilfreiche Wendung 1 für die nächste Antwort des Kandidaten", "Hilfreiche Wendung 2"],
  "isGoalReached": false
}
"isGoalReached" ist true, sobald die Aufgabe inhaltlich erfüllt ist (z. B. Einigung erzielt, alle Punkte besprochen, Vortrag beendet).`
    : `
Antworte nur mit gesprochenem Text — keine Listen, kein Markdown, keine Regieanweisungen.`;

  return `Du bist ${isMonologue ? "die Prüferin / der Prüfer" : "\"Kandidat B\", die Prüfungspartnerin / der Prüfungspartner"} in der mündlichen Prüfung des Goethe-Zertifikats ${lvl}. Dein Gegenüber ist der Prüfungskandidat.

═══ PRÜFUNGSTEIL ═══
Sprechen · Teil ${t.teil}: ${t.title} (${isMonologue ? "Monolog des Kandidaten" : "Dialog"}, ca. ${minutes} Minuten)
Aufgabenstellung: "${t.instruction}"
Thema: "${topic || t.title}"

═══ DEINE ROLLE ═══
${PARTNER_ROLE[t.type] || PARTNER_ROLE.gemeinsam_planen}

═══ SPRACHE ═══
- Sprich AUSSCHLIESSLICH Deutsch, fehlerfrei und natürlich, angepasst an Niveau ${lvl}: ${LEVEL_LANGUAGE[lvl]}
- Pro Redebeitrag ${SPEAKER_LENGTH[lvl]}. Keine Monologe — der Kandidat soll den Großteil der Redezeit haben.
- Reagiere ZUERST auf das, was der Kandidat gerade gesagt hat (Zustimmung, Einwand, Nachfrage).
${isMonologue ? "- Korrigiere den Kandidaten nicht und gib keine Bewertung ab." : "- Beende deinen Beitrag meist mit einer offenen Frage, damit der Kandidat wieder an der Reihe ist.\n- Korrigiere den Kandidaten nicht und gib keine Bewertung ab."}
${outputBlock}`;
}

module.exports = {
  LEVEL_LANGUAGE,
  GAP_MARKER,
  zuordnungLabels,
  buildReadingGeneratorPrompt,
  buildListeningGeneratorPrompt,
  buildWritingGeneratorPrompt,
  buildSpeakingPartnerPrompt,
};
