/**
 * parseMakkar.js
 * Turns makkar_raw.txt (pdf-parse output of the 326-page cue-card PDF)
 * into structured JSON ready for Supabase bulk insert.
 *
 * Strategy: deterministic state machine first (fast, free, auditable),
 * then an OPTIONAL LLM repair pass for cards the parser flags as suspect.
 *
 * Usage:
 *   node parseMakkar.js                 # deterministic parse -> makkar_parsed.json
 *   node parseMakkar.js --llm           # + repair flagged cards via OpenAI (OPENAI_API_KEY)
 *   node parseMakkar.js --in raw.txt --out parsed.json
 *
 * Output shape (per card):
 * {
 *   cardNumber: 32,
 *   title: "Describe an advertisement that you don't like",
 *   prompts: ["When did you see it?", "...", "Why you didn't like it"],
 *   sampleAnswer: "Well, I generally don't like...\n...",
 *   followUps: [{ position, question, answer }],
 *   needsReview: false,
 *   reviewReasons: []
 * }
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ---------- CLI ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};
const IN_PATH = path.resolve(__dirname, opt('in', 'makkar_raw.txt'));
const OUT_PATH = path.resolve(__dirname, opt('out', 'makkar_parsed.json'));
const USE_LLM = flag('llm');

// ---------- Patterns ----------
const BULLET = /^[•●▪‣]\s*/;          // • ● ▪  etc.
const DASH = /^[-–—−]\s+/;                        // - – — −
const HEADING = /^\s*(\d{1,3})\.\s*["“]?\s*(Describe\b|Talk about\b)/i;
// Header variants seen in the book: "Part 3 Follow Up Questions",
// "Part 3 - Follow Up Questions", "Part 3 Follow Ups – <topic>", "Follow -ups"
const PART3 = /^\s*(?:Part\s*3\s*[-–—:]*\s*)?Follow\s*-?\s*Ups?\b/i;
const NUMBERED = /^\s*(\d{1,2})[.)]?\s+(.+)$/;                   // follow-up item ("1." or bare "1")
const YOU_SHOULD_SAY = /^you should say:?\s*$/i;
const STOP_BODY = /^\s*SPEAKING\s+PART\s*1\b/i;                  // end of Part-2/3 content

// Page furniture injected by the PDF on every page break.
const NOISE_LINE = [
  /speaking\s+guesswork.*makkarielts/i,     // running header
  /www\.youtube\.com\/makkarielts/i,        // social-links row
  /^\s*\d{1,3}\s*$/,                        // bare page number
];
// Blank-line-delimited blocks that are ads for the institute, not content.
const NOISE_BLOCK = /our institute|whatsapp\s*\/?\s*(call)?|payment confirmation|makkarielts\.com|ravielts@gmail/i;

// ---------- Load & pre-clean ----------
function loadLines(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const lines = raw.split('\n');

  // 1) Drop line-level noise. Keep tab info: TOC rows are tab-separated,
  //    body headings never are — that's how we skip the table of contents.
  const kept = [];
  for (const line of lines) {
    if (NOISE_LINE.some((re) => re.test(line))) continue;
    kept.push(line);
  }

  // 2) Drop promo paragraphs (blank-delimited blocks matching NOISE_BLOCK),
  //    but only short blocks — never a whole answer that merely says "call".
  const out = [];
  let block = [];
  const flush = () => {
    const text = block.join(' ');
    const isPromo = block.length > 0 && block.length <= 12 && NOISE_BLOCK.test(text);
    if (!isPromo) out.push(...block);
    out.push('');
    block = [];
  };
  for (const line of kept) {
    if (line.trim() === '') flush();
    else block.push(line);
  }
  flush();
  return out;
}

const squash = (s) => s.replace(/\s+/g, ' ').trim();

// ---------- State machine ----------
function parse(lines) {
  const cards = [];
  let card = null;
  let mode = 'seek'; // seek | title | prompts | answer | part3
  let fu = null;     // current follow-up item
  let started = false; // becomes true at body card #1 (skips TOC + front matter)

  const isHeading = (line) => {
    if (line.includes('\t')) return false;          // TOC rows are tab-separated
    if (/\.{4,}/.test(line)) return false;          // TOC dot leaders
    const m = line.match(HEADING);
    return m ? parseInt(m[1], 10) : false;
  };

  const openCard = (num, line) => {
    card = {
      cardNumber: num,
      title: squash(line.replace(/^\s*\d{1,3}\.\s*/, ''))
        .replace(/^["“]|["”]$/g, '')
        .replace(/\byou should say:?\s*$/i, '')
        .trim(),
      promptStyle: 'dash', // later cards switch to plain lines under "You should say:"
      prompts: [],
      sampleAnswer: [],
      followUps: [],
      needsReview: false,
      reviewReasons: [],
    };
    cards.push(card);
    mode = 'title';
    fu = null;
  };

  const closeFu = () => {
    if (fu) {
      fu.question = squash(fu.question);
      fu.answer = squash(fu.answer);
      card.followUps.push(fu);
      fu = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, ' ').trimEnd();
    const t = line.trim();
    if (STOP_BODY.test(t) && started) break;        // Part 1 intro-question section: out of scope

    const headNum = isHeading(rawLine);
    if (headNum !== false) {
      // Accept #1 as the body start; afterwards numbers must increase
      // (the book skips some numbers, so allow gaps but not regressions).
      if (!started) {
        if (headNum === 1) { started = true; closeFu(); openCard(headNum, t); }
        continue; // TOC stragglers before body start
      }
      const last = card ? card.cardNumber : 0;
      if (headNum > last && headNum <= last + 10) {
        closeFu();
        openCard(headNum, t);
        continue;
      }
      // A numbered "Describe..." inside Part 3 that doesn't fit the
      // sequence is treated as content, falls through.
    }

    if (!started || !card) continue;
    if (t === '') continue;

    if (PART3.test(t)) { closeFu(); mode = 'part3'; continue; }

    switch (mode) {
      case 'title': {
        // Heading wraps until "- " prompts, a "You should say:" marker,
        // or the first "•" answer bullet.
        if (YOU_SHOULD_SAY.test(t)) { card.promptStyle = 'plain'; mode = 'prompts'; }
        // Some cards start prompts with no marker at all — a bare
        // "Who the person is" line right after the title.
        else if (/^(Who|What|When|Where|Why|How|Whether)\b/.test(t) && card.title.length > 20) {
          card.promptStyle = 'plain'; card.prompts.push(t); mode = 'prompts';
        }
        else if (DASH.test(t)) { card.prompts.push(t.replace(DASH, '')); mode = 'prompts'; }
        else if (BULLET.test(t)) { card.sampleAnswer.push(t.replace(BULLET, '')); mode = 'answer'; }
        else if (/\byou should say:?\s*$/i.test(t)) {
          card.title = squash(card.title + ' ' + t).replace(/\byou should say:?\s*$/i, '').trim();
          card.promptStyle = 'plain';
          mode = 'prompts';
        }
        else card.title = squash(card.title + ' ' + t);
        break;
      }
      case 'prompts': {
        if (BULLET.test(t)) { card.sampleAnswer.push(t.replace(BULLET, '')); mode = 'answer'; }
        else if (DASH.test(t)) card.prompts.push(t.replace(DASH, ''));
        else if (card.promptStyle === 'plain') card.prompts.push(t);  // one line = one prompt
        else if (/^and\b/i.test(t)) card.prompts.push(t);            // "And explain ..." (no dash)
        else if (card.prompts.length)                                 // wrapped prompt line
          card.prompts[card.prompts.length - 1] = squash(card.prompts.at(-1) + ' ' + t);
        break;
      }
      case 'answer': {
        if (BULLET.test(t)) card.sampleAnswer.push(t.replace(BULLET, ''));
        else if (card.sampleAnswer.length)                            // wrapped bullet line
          card.sampleAnswer[card.sampleAnswer.length - 1] = squash(card.sampleAnswer.at(-1) + ' ' + t);
        break;
      }
      case 'part3': {
        const m = t.match(NUMBERED);
        if (m) {
          closeFu();
          // Question usually ends with '?'; anything after the last '?' on
          // the same line is the start of the answer.
          const body = m[2];
          const qEnd = body.lastIndexOf('?');
          fu = qEnd !== -1
            ? { position: parseInt(m[1], 10), question: body.slice(0, qEnd + 1), answer: body.slice(qEnd + 1) }
            : { position: parseInt(m[1], 10), question: body, answer: '' };
        } else if (fu) {
          // Wrapped question (no '?' seen yet) vs. answer body.
          if (!fu.question.includes('?') && fu.answer === '' && t.length < 90 && /[?]$/.test(t))
            fu.question += ' ' + t;
          else fu.answer += ' ' + t;
        }
        break;
      }
    }
  }
  closeFu();

  // ---------- Post-process + confidence flags ----------
  for (const c of cards) {
    delete c.promptStyle;
    c.title = squash(c.title);
    c.prompts = c.prompts.map(squash).filter(Boolean);
    c.sampleAnswer = c.sampleAnswer.map(squash).filter(Boolean).join('\n');
    const flagIf = (cond, reason) => { if (cond) { c.needsReview = true; c.reviewReasons.push(reason); } };
    flagIf(c.prompts.length < 2, 'fewer than 2 Part-2 prompts');
    flagIf(c.sampleAnswer.length < 200, 'sample answer suspiciously short');
    flagIf(c.followUps.length === 0, 'no Part-3 follow-ups captured');
    flagIf(c.followUps.some((f) => !f.answer || f.answer.length < 30), 'a follow-up has a very short answer');
  }
  return cards;
}

// ---------- Optional LLM repair pass ----------
// Only flagged cards are sent, one card per request (small prompts, cheap).
// Re-slices the ORIGINAL raw text for that card so the model sees everything.
async function llmRepair(cards, lines) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Build raw-text slices per card number from the cleaned lines.
  const joined = lines.join('\n');
  const sliceFor = (card, next) => {
    const startRe = new RegExp(`^\\s*${card.cardNumber}\\.\\s*["“]?\\s*(Describe|Talk about)`, 'im');
    const s = joined.search(startRe);
    if (s === -1) return null;
    let e = joined.length;
    if (next) {
      const endRe = new RegExp(`^\\s*${next.cardNumber}\\.\\s*["“]?\\s*(Describe|Talk about)`, 'im');
      const rel = joined.slice(s + 10).search(endRe);
      if (rel !== -1) e = s + 10 + rel;
    }
    return joined.slice(s, e).slice(0, 12000);
  };

  const flagged = cards.filter((c) => c.needsReview);
  console.log(`LLM repair: ${flagged.length} flagged cards`);

  const SYSTEM = `You clean up raw PDF-extracted text of an IELTS speaking cue card.
Return STRICT JSON: {"title":string,"prompts":string[],"sampleAnswer":string,"followUps":[{"position":number,"question":string,"answer":string}]}
Rules: fix words broken by PDF extraction (e.g. "jour ney"->"journey"); prompts = the short "You should say" bullet points;
sampleAnswer = the model answer bullets joined with \\n; followUps = Part 3 numbered Q&A. Do not invent content not present in the text.`;

  const CONCURRENCY = 3;
  for (let i = 0; i < flagged.length; i += CONCURRENCY) {
    await Promise.all(flagged.slice(i, i + CONCURRENCY).map(async (card) => {
      const idx = cards.indexOf(card);
      const raw = sliceFor(card, cards[idx + 1]);
      if (!raw) return;
      try {
        const res = await client.chat.completions.create({
          model: process.env.PARSER_LLM_MODEL || 'gpt-4o-mini',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: raw },
          ],
        });
        const fixed = JSON.parse(res.choices[0].message.content);
        if (fixed.title && Array.isArray(fixed.prompts)) {
          Object.assign(card, fixed, { needsReview: false, reviewReasons: [], repairedByLlm: true });
        }
      } catch (err) {
        console.warn(`  card ${card.cardNumber}: LLM repair failed (${err.message}) — keeping deterministic parse`);
      }
    }));
    console.log(`  repaired ${Math.min(i + CONCURRENCY, flagged.length)}/${flagged.length}`);
  }
}

// ---------- Main ----------
(async () => {
  const lines = loadLines(IN_PATH);
  const cards = parse(lines);

  if (USE_LLM) await llmRepair(cards, lines);

  fs.writeFileSync(OUT_PATH, JSON.stringify(cards, null, 2));

  const flagged = cards.filter((c) => c.needsReview);
  const fuTotal = cards.reduce((n, c) => n + c.followUps.length, 0);
  console.log(`\nParsed ${cards.length} cue cards -> ${OUT_PATH}`);
  console.log(`Part-3 follow-ups captured: ${fuTotal}`);
  console.log(`Flagged for review: ${flagged.length}`);
  for (const c of flagged) console.log(`  #${c.cardNumber} ${c.title.slice(0, 55)} — ${c.reviewReasons.join('; ')}`);
})();
