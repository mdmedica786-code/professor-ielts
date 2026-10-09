/**
 * English translations of the official Goethe instructions + an exam tip per
 * Teil, shown only in Lernmodus. Keyed by `${level}.${module}.${teil}`
 * (module: lesen | hoeren | schreiben | sprechen). {from}/{to} are filled with
 * the item numbers from the exam format.
 */
export const GOETHE_INSTRUCTIONS_EN = {
  // ─── A2 ───
  'A2.lesen.1': {
    en: 'Read the text and tasks {from} to {to}. Which answer is correct? Mark a, b or c.',
    tip: 'Read the questions first. They follow the order of the article, so work through the text paragraph by paragraph.',
  },
  'A2.lesen.2': {
    en: 'Read tasks {from} to {to} and the information board. Where do you go? Mark a, b or c.',
    tip: 'Underline the key noun in each situation (e.g. "Kinderschuhe") and find the department that sells it. Distractors reuse words from the board.',
  },
  'A2.lesen.3': {
    en: 'Read the email and tasks {from} to {to}. Which answer is correct? Mark a, b or c.',
    tip: 'Watch for time words (morgen, nächste Woche, am Samstag) — many wrong answers mix up when something happens.',
  },
  'A2.lesen.4': {
    en: 'Six people are looking for something online. Read tasks {from} to {to} and ads a to f. Which ad suits which person? There is no matching ad for one task — mark X there.',
    tip: 'Check every detail of the person (price, time, place). An ad that fits "almost" is a trap. Exactly one person gets X.',
  },
  'A2.hoeren.1': {
    en: 'You will hear five short texts. You will hear each text twice. There is one task for each text. Mark the correct answer: a, b or c.',
    tip: 'Use the first listening to get the gist and the second to confirm numbers, times and places.',
  },
  'A2.hoeren.2': {
    en: 'You will hear a conversation. You will hear the text once. For tasks {from} to {to}, choose a matching answer from a to i. Use each letter only once.',
    tip: 'You only hear this once. Read all options a–i before the audio starts and cross off letters as you use them.',
  },
  'A2.hoeren.3': {
    en: 'You will hear five short conversations. You will hear each text twice. For tasks {from} to {to}, choose the correct answer a, b or c.',
    tip: 'Speakers often mention a wrong option first and then correct themselves ("Nein, doch lieber …"). Wait for the final decision.',
  },
  'A2.hoeren.4': {
    en: 'You will hear an interview. You will hear the text twice. For tasks {from} to {to}, choose Yes or No.',
    tip: 'Statements are in the order of the interview. Decide on the first listening, then check on the second.',
  },
  'A2.schreiben.1': {
    en: 'Write a text message. Write about all three points. Write 20–30 words.',
    tip: 'One clear sentence per point is enough. Start with "Hallo …," and end with your name.',
  },
  'A2.schreiben.2': {
    en: 'Write an email. Write about all three points. Do not forget the greeting and sign-off. Write 40–50 words.',
    tip: 'Use "Liebe/Lieber …," and "Viele Grüße". Missing points cost more than small grammar mistakes.',
  },
  'A2.sprechen.1': {
    en: 'You receive four cards. Ask your partner one question for each card. Your partner answers. Then your partner asks you questions.',
    tip: 'Turn each keyword into a full W-question ("Wo wohnst du?") — a single word is not a question.',
  },
  'A2.sprechen.2': {
    en: 'You receive a card with a question and four keywords. Tell us something about your life. Talk about all the keywords.',
    tip: 'Say two sentences per keyword and give an example from your own life.',
  },
  'A2.sprechen.3': {
    en: 'You want to do something together. You both have a diary. Find a time when you are both free.',
    tip: 'Suggest times actively ("Hast du um 15 Uhr Zeit?") and explain why a time does not work for you ("Da gehe ich zum Arzt.").',
  },

  // ─── B1 ───
  'B1.lesen.1': {
    en: 'Read the text and tasks {from} to {to}. Decide: are the statements true (Richtig) or false (Falsch)?',
    tip: 'Statements paraphrase the blog. Look for the same meaning, not the same words.',
  },
  'B1.lesen.2': {
    en: 'Read the texts and tasks {from} to {to}. Choose the correct answer a, b or c for each task.',
    tip: 'Three questions belong to each article, in text order. Find the paragraph first, then compare all three options.',
  },
  'B1.lesen.3': {
    en: 'Read situations {from} to {to} and ads a to j from various German-language media. Which ad matches which situation? You can use each ad only once. There is no matching ad for one task — in that case choose 0.',
    tip: 'Start with the situations that are easiest to match and cross off used ads. Exactly one situation is 0.',
  },
  'B1.lesen.4': {
    en: 'Read texts {from} to {to}. Decide: is the person in favour of the topic? Yes (Ja) or No (Nein)?',
    tip: 'Many comments start with "Zwar …, aber …" — the opinion after "aber" counts.',
  },
  'B1.lesen.5': {
    en: 'Read tasks {from} to {to} and the text. Choose the correct answer a, b or c for each task.',
    tip: 'Rules texts use modal verbs: "müssen" (obligation), "dürfen nicht" (forbidden), "können" (allowed). Read them carefully.',
  },
  'B1.hoeren.1': {
    en: 'You will now hear five short texts. You will hear each text twice. There are two tasks for each text. Choose the correct answer for each task.',
    tip: 'Each text has one true/false item and one a/b/c item. Read both before the text starts.',
  },
  'B1.hoeren.2': {
    en: 'You will hear a text. You will hear it once. There are five tasks. Choose the correct answer a, b or c for each task.',
    tip: 'You hear the guided tour only once — the questions follow its order, so keep your place.',
  },
  'B1.hoeren.3': {
    en: 'You will hear a conversation. You will hear it once. There are seven tasks. Decide: are the statements true (Richtig) or false (Falsch)?',
    tip: 'Note who says what: a statement may be true for one speaker but false for the other.',
  },
  'B1.hoeren.4': {
    en: 'You will hear a discussion. You will hear it twice. There are eight tasks. Match the statements: who says what?',
    tip: 'Learn the guests\' positions from the introduction. The moderator can also be the answer.',
  },
  'B1.schreiben.1': {
    en: 'Write an email (about 80 words). Write something about all three points. Pay attention to the structure (greeting, introduction, order of the points, closing).',
    tip: 'Write two to three sentences per point and link them with weil, deshalb, außerdem.',
  },
  'B1.schreiben.2': {
    en: 'Now write your opinion (about 80 words).',
    tip: 'Forum posts have no "Liebe …"/"Viele Grüße". Give your opinion, a reason and an example, then a short conclusion.',
  },
  'B1.schreiben.3': {
    en: 'Write an email (about 40 words). Do not forget the greeting and the closing formula.',
    tip: 'Formal register: "Sehr geehrte/r …," — lowercase after the comma — and "Mit freundlichen Grüßen".',
  },
  'B1.sprechen.1': {
    en: 'You want to plan something together. Talk about the points below, make suggestions and react to your partner\'s suggestions. Plan and decide together what you want to do.',
    tip: 'Use Konjunktiv II for suggestions ("Wir könnten …", "Wie wäre es mit …?") and agree on a result at the end.',
  },
  'B1.sprechen.2': {
    en: 'You are to present a current topic to your audience. You have five slides. Follow the instructions on the left and write your notes and ideas on the right.',
    tip: 'Announce the structure on slide 1 and use transitions ("Damit komme ich zu …") between slides.',
  },
  'B1.sprechen.3': {
    en: 'After your presentation: respond to the feedback and questions from the examiners and your partner. After your partner\'s presentation: give feedback and ask a question.',
    tip: 'Give specific feedback ("Besonders interessant fand ich …") and ask one real question about the content.',
  },

  // ─── B2 ───
  'B2.lesen.1': {
    en: 'Read the texts and tasks {from} to {to}. Which person does the statement apply to? People can be chosen more than once.',
    tip: 'Statements paraphrase the opinions. Mark the key argument of each person before matching.',
  },
  'B2.lesen.2': {
    en: 'Read the text and tasks {from} to {to}. Choose the correct answer a, b or c for each task.',
    tip: 'Answers often depend on qualifiers (meist, kaum, nicht nur … sondern auch). Read the whole sentence.',
  },
  'B2.lesen.3': {
    en: 'Read the text. Which sentences a to h fit into gaps {from} to {to}? Two sentences do not fit.',
    tip: 'Check references: pronouns (dies, dabei, deshalb) in the missing sentence must point to the sentence before the gap.',
  },
  'B2.lesen.4': {
    en: 'Read the letters to the editor about a newspaper article and tasks {from} to {to}. Choose the correct answer a, b or c for each task.',
    tip: 'Identify each writer\'s attitude to the article (agree, disagree, partly) before answering.',
  },
  'B2.lesen.5': {
    en: 'Read the text and tasks {from} to {to}. Choose the correct answer a, b or c for each task.',
    tip: 'Formal regulations use the passive and modal verbs — note exactly who is obliged to do what.',
  },
  'B2.hoeren.1': {
    en: 'You will hear five texts. You will hear each text once. There are two tasks for each text. Choose the correct answer for each task.',
    tip: 'Only one listening: read both tasks for each text in the pause before it starts.',
  },
  'B2.hoeren.2': {
    en: 'You will hear an interview. You will hear it twice. Choose the correct answer a, b or c for each task.',
    tip: 'The expert often contrasts views ("Man könnte meinen …, aber …"). The answer is the expert\'s own view.',
  },
  'B2.hoeren.3': {
    en: 'You will hear a conversation. You will hear it once. Decide: are the statements true (Richtig) or false (Falsch)?',
    tip: 'Track who holds which opinion; statements name the person they are about.',
  },
  'B2.hoeren.4': {
    en: 'You will hear a talk. You will hear it twice. Decide: are the statements true (Richtig) or false (Falsch)?',
    tip: 'Talks are structured (Einleitung, Hauptteil, Fazit). Use the signposting to follow along.',
  },
  'B2.schreiben.1': {
    en: 'Write a contribution to a discussion (about 150 words). Write something about all four points. Pay attention to the structure (introduction, order of the points, conclusion).',
    tip: 'One paragraph per point plus an introduction and a conclusion. No letter greetings in a forum post.',
  },
  'B2.schreiben.2': {
    en: 'Write an email (about 100 words). Put the content points in a sensible order. Pay attention to the greeting, introduction and closing.',
    tip: 'State your reason for writing in the first sentence and end with a clear, polite request.',
  },
  'B2.sprechen.1': {
    en: 'Give a talk of about four minutes. Describe the topic (using the chart, if provided), name advantages and disadvantages, and state and justify your own opinion.',
    tip: 'Structure: introduction → situation → pros and cons → your opinion → conclusion. Signpost every step.',
  },
  'B2.sprechen.2': {
    en: 'Discuss the question on the card with your partner. Exchange arguments, react to what your partner says and reach a conclusion at the end.',
    tip: 'React before you argue ("Da hast du recht, aber …") and ask your partner questions.',
  },

  // ─── C1 ───
  'C1.lesen.1': {
    en: 'Read the text and fill gaps {from} to {to}. Choose the matching word from the word list. Five words are left over.',
    tip: 'Check grammar first (word class, case, fixed preposition), then meaning. Collocations are often tested.',
  },
  'C1.lesen.2': {
    en: 'Read the text and tasks {from} to {to}. Choose the correct answer a, b, c or d for each task.',
    tip: 'Distinguish the author\'s position from positions the author only reports.',
  },
  'C1.lesen.3': {
    en: 'Read the text. Which sentences a to e fit into gaps {from} to {to}? Three sentences do not fit.',
    tip: 'A sentence can fit the topic but break the logic — check connectors and references on both sides of the gap.',
  },
  'C1.hoeren.1': {
    en: 'You will hear an interview. You will hear it twice. For tasks {from} to {to}, decide: is the statement true, false, or not in the text?',
    tip: '"Nicht im Text" means the information is not mentioned at all — not that it is false.',
  },
  'C1.hoeren.2': {
    en: 'You will hear a lecture. You will hear it once. While listening, answer questions {from} to {to} in note form.',
    tip: 'Write short keywords and numbers, not full sentences. Spelling mistakes do not count if the answer is clear.',
  },
  'C1.schreiben.1': {
    en: 'Write a text (about 250 words) dealing with the topic. Address all four points and refer to the chart, if provided.',
    tip: 'Quote figures from the chart, weigh pros and cons, and finish with a clear, justified position.',
  },
  'C1.schreiben.2': {
    en: 'Write a formal letter (about 150 words). Address all points and use an appropriate register.',
    tip: 'Use a subject line, formal greeting and nominal style ("Im Hinblick auf …", "Ich möchte Sie bitten, …").',
  },
  'C1.sprechen.1': {
    en: 'Give a talk of three to four minutes. Present the issue, weigh up pros and cons and develop a well-founded position of your own.',
    tip: 'Show C1 range: concessive structures ("Auch wenn …"), nominal style and precise vocabulary.',
  },
  'C1.sprechen.2': {
    en: 'React to your partner\'s talk, discuss the positions and answer the examiner\'s questions in detail and with nuance.',
    tip: 'Qualify your statements ("in gewisser Hinsicht", "das hängt davon ab, ob …") and build on your partner\'s points.',
  },
};

/** Translations for fixed answer options, shown under the German label in Lernmodus. */
export const OPTION_TRANSLATIONS_EN = {
  Richtig: 'True',
  Falsch: 'False',
  Ja: 'Yes',
  Nein: 'No',
  'Nicht im Text': 'Not in the text',
};

export function getInstructionTranslation(level, module, teil, { from, to } = {}) {
  const entry = GOETHE_INSTRUCTIONS_EN[`${level}.${module}.${teil}`];
  if (!entry) return null;
  const fill = (s) => s.replace('{from}', from ?? '').replace('{to}', to ?? '');
  return { en: fill(entry.en), tip: entry.tip };
}
