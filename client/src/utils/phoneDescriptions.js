/**
 * ARPAbet phone descriptions for the pronunciation heatmap UI.
 * Duplicated from the Python pipeline for client-side rendering.
 */
const phoneDescriptions = {
  TH: { name: '/θ/ (voiceless "th")', example: 'think, three, through', tip: 'Place your tongue between your teeth and blow air without vibrating your vocal cords' },
  DH: { name: '/ð/ (voiced "th")', example: 'this, that, the', tip: 'Same tongue position as /θ/ but vibrate your vocal cords' },
  R:  { name: '/r/', example: 'red, right, very', tip: 'Curl your tongue tip back without touching the roof of your mouth' },
  L:  { name: '/l/', example: 'light, feel, hello', tip: 'Touch your tongue tip to the ridge behind your upper front teeth' },
  V:  { name: '/v/', example: 'very, have, love', tip: 'Gently bite your lower lip and vibrate — different from /w/' },
  W:  { name: '/w/', example: 'water, away, win', tip: 'Round your lips into a tight circle and release' },
  NG: { name: '/ŋ/ ("ng")', example: 'sing, thinking, long', tip: 'Back of tongue touches soft palate — no /g/ sound at the end' },
  SH: { name: '/ʃ/ ("sh")', example: 'she, nation, special', tip: 'Lips slightly rounded, tongue wider than for /s/' },
  CH: { name: '/tʃ/ ("ch")', example: 'church, teacher, much', tip: 'Start with /t/ then release into /ʃ/' },
  JH: { name: '/dʒ/ ("j")', example: 'judge, general, age', tip: 'Start with /d/ then release into /ʒ/' },
  ZH: { name: '/ʒ/', example: 'measure, vision, garage', tip: 'Like /ʃ/ but with vocal cord vibration' },
  AE: { name: '/æ/ (short "a")', example: 'cat, bad, plan', tip: 'Mouth wide open, tongue low and pushed forward' },
  IH: { name: '/ɪ/ (short "i")', example: 'sit, big, this', tip: 'Short and relaxed — not the same as the long "ee" in "see"' },
  UH: { name: '/ʊ/ (short "oo")', example: 'book, good, could', tip: 'Short sound with slightly rounded lips — not full "oo"' },
  ER: { name: '/ɜːr/ ("er")', example: 'bird, first, work', tip: 'Tongue curled slightly back, lips neutral' },
  AH: { name: '/ʌ/ or /ə/', example: 'cup, about, but', tip: 'Short, relaxed, central mouth position' },
  AA: { name: '/ɑ/ (long "a")', example: 'father, hot, palm', tip: 'Mouth wide open, tongue low and back' },
  AO: { name: '/ɔ/ ("aw")', example: 'law, all, caught', tip: 'Rounded lips, tongue mid-back position' },
  AW: { name: '/aʊ/ ("ow")', example: 'how, about, out', tip: 'Start with open mouth, glide to rounded lips' },
  AY: { name: '/aɪ/ ("eye")', example: 'my, time, high', tip: 'Start with open mouth, glide to short "i"' },
  EH: { name: '/ɛ/ (short "e")', example: 'bed, set, ten', tip: 'Mouth slightly open, tongue mid-front' },
  EY: { name: '/eɪ/ (long "a")', example: 'day, say, great', tip: 'Start with "e" sound, glide to short "i"' },
  IY: { name: '/iː/ (long "ee")', example: 'see, eat, me', tip: 'Tongue high and forward, lips spread' },
  OW: { name: '/oʊ/ (long "o")', example: 'go, show, know', tip: 'Start with "o" sound, glide to rounded lips' },
  OY: { name: '/ɔɪ/ ("oy")', example: 'boy, coin, joy', tip: 'Start with "aw" sound, glide to short "i"' },
  UW: { name: '/uː/ (long "oo")', example: 'food, blue, two', tip: 'Rounded lips pushed forward, tongue high and back' },
};

export default phoneDescriptions;
