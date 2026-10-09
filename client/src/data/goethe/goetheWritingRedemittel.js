/**
 * Redemittel for the Schreiben drawer, grouped by text function.
 * registers: which Aufgabe registers the phrase suits (informell | neutral | formell)
 * min: lowest level the phrase is recommended for.
 */
const ALL = ['informell', 'neutral', 'formell'];

export const WRITING_REDEMITTEL = [
  {
    id: 'einleitung',
    title: 'Einleitung',
    en: 'Opening',
    phrases: [
      { de: 'Liebe Anna, / Lieber Tom,', en: 'Dear Anna / Tom,', registers: ['informell'], min: 'A2' },
      { de: 'Hallo …,', en: 'Hi …,', registers: ['informell'], min: 'A2' },
      { de: 'vielen Dank für deine Nachricht.', en: 'thanks a lot for your message.', registers: ['informell'], min: 'A2' },
      { de: 'Ich schreibe dir, weil …', en: 'I am writing to you because …', registers: ['informell'], min: 'A2' },
      { de: 'Sehr geehrte Damen und Herren,', en: 'Dear Sir or Madam,', registers: ['formell'], min: 'A2' },
      { de: 'Sehr geehrte Frau …, / Sehr geehrter Herr …,', en: 'Dear Ms … / Mr …,', registers: ['formell'], min: 'B1' },
      { de: 'ich wende mich an Sie, weil …', en: 'I am contacting you because …', registers: ['formell'], min: 'B1' },
      { de: 'mit großem Interesse habe ich Ihre Anzeige gelesen.', en: 'I read your advertisement with great interest.', registers: ['formell'], min: 'B2' },
      { de: 'Bezug nehmend auf Ihr Schreiben vom … möchte ich …', en: 'With reference to your letter of … I would like to …', registers: ['formell'], min: 'C1' },
      { de: 'Das Thema … wird zurzeit viel diskutiert.', en: 'The topic … is currently much discussed.', registers: ['neutral'], min: 'B1' },
      { de: 'In meinem Beitrag möchte ich zu der Frage Stellung nehmen, ob …', en: 'In my post I would like to comment on whether …', registers: ['neutral'], min: 'B2' },
      { de: 'Die Frage, ob …, lässt sich nicht pauschal beantworten.', en: 'Whether … cannot be answered in general terms.', registers: ['neutral'], min: 'C1' },
    ],
  },
  {
    id: 'meinung',
    title: 'Meinung äußern',
    en: 'Giving your opinion',
    phrases: [
      { de: 'Ich finde, dass …', en: 'I think that …', registers: ALL, min: 'A2' },
      { de: 'Meiner Meinung nach …', en: 'In my opinion …', registers: ALL, min: 'B1' },
      { de: 'Ich bin der Ansicht, dass …', en: 'I am of the view that …', registers: ['neutral', 'formell'], min: 'B1' },
      { de: 'Ich vertrete den Standpunkt, dass …', en: 'I take the position that …', registers: ['neutral', 'formell'], min: 'B2' },
      { de: 'Aus meiner Sicht spricht vieles dafür, dass …', en: 'From my point of view, there is much to suggest that …', registers: ['neutral'], min: 'C1' },
    ],
  },
  {
    id: 'abwaegen',
    title: 'Vor- und Nachteile abwägen',
    en: 'Weighing pros and cons',
    phrases: [
      { de: 'Ein Vorteil ist, dass …', en: 'One advantage is that …', registers: ALL, min: 'A2' },
      { de: 'Einerseits …, andererseits …', en: 'On the one hand …, on the other hand …', registers: ['neutral', 'formell'], min: 'B1' },
      { de: 'Zwar …, aber …', en: 'Admittedly …, but …', registers: ['neutral', 'formell'], min: 'B1' },
      { de: 'Dagegen spricht, dass …', en: 'What speaks against it is that …', registers: ['neutral'], min: 'B1' },
      { de: 'Im Gegensatz dazu …', en: 'In contrast …', registers: ['neutral', 'formell'], min: 'B2' },
      { de: 'Nicht zu unterschätzen ist dabei, dass …', en: 'It should not be underestimated that …', registers: ['neutral'], min: 'B2' },
      { de: 'Demgegenüber steht die Tatsache, dass …', en: 'This is offset by the fact that …', registers: ['neutral'], min: 'C1' },
    ],
  },
  {
    id: 'begruendung',
    title: 'Begründung & Beispiele',
    en: 'Reasons & examples',
    phrases: [
      { de: '…, weil …', en: '…, because … (verb at the end)', registers: ALL, min: 'A2' },
      { de: '…, denn …', en: '…, because … (verb in 2nd position)', registers: ALL, min: 'A2' },
      { de: 'Deshalb / Deswegen …', en: 'That is why …', registers: ALL, min: 'A2' },
      { de: 'Zum Beispiel …', en: 'For example …', registers: ALL, min: 'A2' },
      { de: 'Ein gutes Beispiel dafür ist …', en: 'A good example of this is …', registers: ['neutral', 'formell'], min: 'B1' },
      { de: 'Aus diesem Grund …', en: 'For this reason …', registers: ['neutral', 'formell'], min: 'B1' },
      { de: 'Dies lässt sich dadurch erklären, dass …', en: 'This can be explained by the fact that …', registers: ['neutral'], min: 'C1' },
      { de: 'Aus der Grafik geht hervor, dass …', en: 'The chart shows that …', registers: ['neutral'], min: 'B2' },
      { de: 'Der Anteil … liegt bei … Prozent.', en: 'The share of … is … percent.', registers: ['neutral'], min: 'B2' },
    ],
  },
  {
    id: 'bitte',
    title: 'Bitte & Beschwerde',
    en: 'Requests & complaints',
    phrases: [
      { de: 'Kannst du mir bitte …?', en: 'Can you please …?', registers: ['informell'], min: 'A2' },
      { de: 'Könnten Sie mir bitte mitteilen, …', en: 'Could you please let me know …', registers: ['formell'], min: 'B1' },
      { de: 'Ich wäre Ihnen dankbar, wenn …', en: 'I would be grateful if …', registers: ['formell'], min: 'B1' },
      { de: 'Leider muss ich mich über … beschweren.', en: 'Unfortunately I have to complain about …', registers: ['formell'], min: 'B2' },
      { de: 'Ich erwarte, dass Sie … bis zum … erledigen.', en: 'I expect you to … by …', registers: ['formell'], min: 'B2' },
    ],
  },
  {
    id: 'schluss',
    title: 'Schluss & Grußformel',
    en: 'Closing & sign-off',
    phrases: [
      { de: 'Ich freue mich auf deine Antwort.', en: 'I look forward to your reply.', registers: ['informell'], min: 'A2' },
      { de: 'Liebe Grüße / Viele Grüße', en: 'Best wishes', registers: ['informell'], min: 'A2' },
      { de: 'Bis bald!', en: 'See you soon!', registers: ['informell'], min: 'A2' },
      { de: 'Ich freue mich auf Ihre Rückmeldung.', en: 'I look forward to hearing from you.', registers: ['formell'], min: 'B1' },
      { de: 'Mit freundlichen Grüßen', en: 'Kind regards (formal)', registers: ['formell'], min: 'A2' },
      { de: 'Für Ihre Bemühungen bedanke ich mich im Voraus.', en: 'Thank you in advance for your efforts.', registers: ['formell'], min: 'B2' },
      { de: 'Zusammenfassend lässt sich sagen, dass …', en: 'In summary, …', registers: ['neutral'], min: 'B1' },
      { de: 'Abschließend möchte ich betonen, dass …', en: 'Finally, I would like to stress that …', registers: ['neutral'], min: 'B2' },
      { de: 'Alles in allem überwiegen meiner Ansicht nach die Vorteile.', en: 'All in all, I think the advantages outweigh the disadvantages.', registers: ['neutral'], min: 'B2' },
    ],
  },
];

const LEVEL_ORDER = ['A2', 'B1', 'B2', 'C1'];

/** Phrases suitable for an Aufgabe's register and the candidate's level. */
export function redemittelFor(register, level) {
  const max = LEVEL_ORDER.indexOf(level);
  return WRITING_REDEMITTEL.map((cat) => ({
    ...cat,
    phrases: cat.phrases.filter((p) => p.registers.includes(register) && LEVEL_ORDER.indexOf(p.min) <= max),
  })).filter((cat) => cat.phrases.length);
}
